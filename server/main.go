package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

//go:embed all:web
var embeddedWeb embed.FS

const (
	defaultPort                        = "8090"
	defaultHost                        = "0.0.0.0"
	defaultDownloadTimeout             = 60 * time.Second
	defaultUpstreamTimeout             = 15 * time.Minute
	maxUpstreamBodyBytes         int64 = 256 << 20
	maxRequestBodyBytes          int64 = 96 << 20
	imageStudioMaxImageCount           = 10
	imageStudioDefaultImageCount       = 1
	defaultImageJobConcurrency         = 3
	defaultImageJobQueueSize           = 100
	defaultImageJobRetention           = 2 * time.Hour
	maxExternalGenerateAttempts        = 2
	externalGenerateRetryDelay         = 1200 * time.Millisecond

	profileOpenAIImageAPI    = "openai-image-api"
	profileOpenAIResponses   = "openai-responses"
	profileSub2APICompatible = "sub2api-sora-compatible"
)

type externalGenerateRequest struct {
	BaseURL     string   `json:"base_url"`
	APIKey      string   `json:"api_key"`
	Profile     string   `json:"profile"`
	Model       string   `json:"model"`
	Prompt      string   `json:"prompt"`
	Count       int      `json:"count,omitempty"`
	ImageInput  string   `json:"image_input,omitempty"`
	ImageInputs []string `json:"image_inputs,omitempty"`
	Size        string   `json:"size,omitempty"`
	AspectRatio string   `json:"aspect_ratio,omitempty"`
	Quality     string   `json:"quality,omitempty"`
	Background  string   `json:"background,omitempty"`
	Format      string   `json:"format,omitempty"`
}

type normalizedResult struct {
	URL           string `json:"url"`
	Source        string `json:"source"`
	MimeType      string `json:"mime_type,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}

type externalGenerateResponse struct {
	Code int                  `json:"code"`
	Msg  string               `json:"msg"`
	Data externalGenerateData `json:"data"`
}

type externalGenerateData struct {
	Profile string             `json:"profile"`
	Results []normalizedResult `json:"results"`
}

type apiError struct {
	Code    int    `json:"code"`
	Msg     string `json:"msg"`
	ErrCode string `json:"err_code,omitempty"`
}

type externalImageAttempt struct {
	Name        string
	EndpointURL string
	Body        []byte
	ContentType string
	Format      string
}

type config struct {
	Host                 string
	Port                 string
	AllowPrivateUpstream bool
	UpstreamTimeout      time.Duration
	DownloadTimeout      time.Duration
	ImageJobConcurrency  int
	ImageJobQueueSize    int
	ImageJobRetention    time.Duration
}

func main() {
	cfg := loadConfig()

	httpClient := &http.Client{
		Timeout: cfg.UpstreamTimeout,
	}
	downloadClient := &http.Client{
		Timeout: cfg.DownloadTimeout,
	}
	imageJobs := newImageGenerationQueue(httpClient, cfg)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/image-studio/generate-external/jobs", withCORS(handleGenerateExternalJobCreate(imageJobs)))
	mux.HandleFunc("/api/v1/image-studio/generate-external/jobs/", withCORS(handleGenerateExternalJob(imageJobs)))
	mux.HandleFunc("/api/v1/image-studio/generate-external", withCORS(withMethod(http.MethodPost, handleGenerateExternal(httpClient, cfg))))
	mux.HandleFunc("/api/v1/image-studio/download", withCORS(withMethod(http.MethodGet, handleDownload(downloadClient, cfg))))
	mux.HandleFunc("/api/v1/health", withCORS(handleHealth))

	// Frontend SPA fallback (must be last)
	staticHandler := buildStaticHandler()
	mux.HandleFunc("/", staticHandler)

	addr := net.JoinHostPort(cfg.Host, cfg.Port)
	server := &http.Server{
		Addr:              addr,
		Handler:           withRecover(withRequestLog(mux)),
		ReadHeaderTimeout: 15 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("image-studio-slim listening on %s", addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Printf("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown error: %v", err)
	}
}

func loadConfig() config {
	cfg := config{
		Host:                 getenv("HOST", defaultHost),
		Port:                 getenv("PORT", defaultPort),
		AllowPrivateUpstream: parseBool(os.Getenv("ALLOW_PRIVATE_UPSTREAM"), false),
		UpstreamTimeout:      parseDuration(os.Getenv("UPSTREAM_TIMEOUT"), defaultUpstreamTimeout),
		DownloadTimeout:      parseDuration(os.Getenv("DOWNLOAD_TIMEOUT"), defaultDownloadTimeout),
		ImageJobConcurrency:  parsePositiveInt(os.Getenv("IMAGE_JOB_CONCURRENCY"), defaultImageJobConcurrency),
		ImageJobQueueSize:    parsePositiveInt(os.Getenv("IMAGE_JOB_QUEUE_SIZE"), defaultImageJobQueueSize),
		ImageJobRetention:    parseDuration(os.Getenv("IMAGE_JOB_RETENTION"), defaultImageJobRetention),
	}
	flag.StringVar(&cfg.Host, "host", cfg.Host, "bind host")
	flag.StringVar(&cfg.Port, "port", cfg.Port, "bind port")
	flag.Parse()
	return cfg
}

func getenv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func parseBool(raw string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func parsePositiveInt(raw string, fallback int) int {
	if n, err := strconv.Atoi(strings.TrimSpace(raw)); err == nil && n > 0 {
		return n
	}
	return fallback
}

func parseDuration(raw string, fallback time.Duration) time.Duration {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	if d, err := time.ParseDuration(raw); err == nil {
		return d
	}
	if secs, err := strconv.Atoi(raw); err == nil {
		return time.Duration(secs) * time.Second
	}
	return fallback
}

// ============================================================================
// HTTP middlewares
// ============================================================================

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept-Language")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func withMethod(method string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
			return
		}
		next(w, r)
	}
}

func withRecover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic recovered: %v", rec)
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func withRequestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(lrw, r)
		if r.URL.Path == "/api/v1/health" {
			return
		}
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, lrw.status, time.Since(start))
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
}

func (l *loggingResponseWriter) WriteHeader(code int) {
	l.status = code
	l.ResponseWriter.WriteHeader(code)
}

// ============================================================================
// API handlers
// ============================================================================

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write([]byte(`{"code":0,"msg":"ok"}`))
}

type imageJobStatus string

const (
	imageJobQueued    imageJobStatus = "queued"
	imageJobRunning   imageJobStatus = "running"
	imageJobSucceeded imageJobStatus = "succeeded"
	imageJobFailed    imageJobStatus = "failed"
	imageJobCanceled  imageJobStatus = "canceled"
)

type imageGenerationJob struct {
	ID         string
	Status     imageJobStatus
	Profile    string
	APIKey     string
	Attempts   []externalImageAttempt
	Results    []normalizedResult
	ErrStatus  int
	ErrCode    string
	ErrMsg     string
	CreatedAt  time.Time
	StartedAt  time.Time
	FinishedAt time.Time
	UpdatedAt  time.Time
	cancel     context.CancelFunc
}

type imageGenerationJobResponse struct {
	ID            string             `json:"id"`
	Status        imageJobStatus     `json:"status"`
	Profile       string             `json:"profile,omitempty"`
	QueuePosition int                `json:"queue_position,omitempty"`
	QueueLength   int                `json:"queue_length"`
	Running       int                `json:"running"`
	Concurrency   int                `json:"concurrency"`
	CreatedAt     string             `json:"created_at"`
	StartedAt     string             `json:"started_at,omitempty"`
	FinishedAt    string             `json:"finished_at,omitempty"`
	Results       []normalizedResult `json:"results,omitempty"`
	Error         *apiError          `json:"error,omitempty"`
}

type imageGenerationRun struct {
	ID       string
	Context  context.Context
	APIKey   string
	Attempts []externalImageAttempt
}

type imageGenerationQueue struct {
	client      *http.Client
	cfg         config
	concurrency int
	queueSize   int
	retention   time.Duration
	queue       chan string
	mu          sync.Mutex
	jobs        map[string]*imageGenerationJob
	pending     []string
	running     int
}

func newImageGenerationQueue(client *http.Client, cfg config) *imageGenerationQueue {
	concurrency := cfg.ImageJobConcurrency
	if concurrency <= 0 {
		concurrency = defaultImageJobConcurrency
	}
	queueSize := cfg.ImageJobQueueSize
	if queueSize <= 0 {
		queueSize = defaultImageJobQueueSize
	}
	retention := cfg.ImageJobRetention
	if retention <= 0 {
		retention = defaultImageJobRetention
	}
	q := &imageGenerationQueue{
		client:      client,
		cfg:         cfg,
		concurrency: concurrency,
		queueSize:   queueSize,
		retention:   retention,
		queue:       make(chan string, queueSize),
		jobs:        make(map[string]*imageGenerationJob),
	}
	for i := 0; i < concurrency; i++ {
		go q.worker()
	}
	log.Printf("image generation queue ready: concurrency=%d queue_size=%d", concurrency, queueSize)
	return q
}

func (q *imageGenerationQueue) enqueue(req externalGenerateRequest, attempts []externalImageAttempt) (imageGenerationJobResponse, bool) {
	now := time.Now()
	job := &imageGenerationJob{
		ID:        newJobID(),
		Status:    imageJobQueued,
		Profile:   req.Profile,
		APIKey:    req.APIKey,
		Attempts:  attempts,
		CreatedAt: now,
		UpdatedAt: now,
	}

	q.mu.Lock()
	q.cleanupLocked(now)
	if len(q.pending) >= q.queueSize {
		resp := q.responseForLocked(job)
		q.mu.Unlock()
		return resp, false
	}
	q.jobs[job.ID] = job
	q.pending = append(q.pending, job.ID)
	resp := q.responseForLocked(job)
	q.mu.Unlock()

	q.queue <- job.ID
	return resp, true
}

func (q *imageGenerationQueue) worker() {
	for id := range q.queue {
		run, ok := q.start(id)
		if !ok {
			continue
		}
		results, errStatus, errCode, errMsg := callExternalImageUpstream(run.Context, q.client, run.Attempts, run.APIKey)
		q.finish(run.ID, results, errStatus, errCode, errMsg)
	}
}

func (q *imageGenerationQueue) start(id string) (imageGenerationRun, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()

	job, ok := q.jobs[id]
	if !ok || job.Status != imageJobQueued {
		q.removePendingLocked(id)
		return imageGenerationRun{}, false
	}

	now := time.Now()
	ctx, cancel := context.WithCancel(context.Background())
	job.Status = imageJobRunning
	job.StartedAt = now
	job.UpdatedAt = now
	job.cancel = cancel
	q.removePendingLocked(id)
	q.running++

	return imageGenerationRun{
		ID:       job.ID,
		Context:  ctx,
		APIKey:   job.APIKey,
		Attempts: append([]externalImageAttempt(nil), job.Attempts...),
	}, true
}

func (q *imageGenerationQueue) finish(id string, results []normalizedResult, errStatus int, errCode string, errMsg string) {
	q.mu.Lock()
	defer q.mu.Unlock()

	job, ok := q.jobs[id]
	if !ok {
		return
	}
	now := time.Now()
	if job.Status != imageJobCanceled {
		q.running = maxInt(0, q.running-1)
		job.FinishedAt = now
		job.UpdatedAt = now
		if errMsg != "" {
			job.Status = imageJobFailed
			job.ErrStatus = errStatus
			job.ErrCode = errCode
			job.ErrMsg = errMsg
		} else {
			job.Status = imageJobSucceeded
			job.Results = results
		}
	}
	job.APIKey = ""
	job.Attempts = nil
	job.cancel = nil
}

func (q *imageGenerationQueue) get(id string) (imageGenerationJobResponse, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.cleanupLocked(time.Now())
	job, ok := q.jobs[id]
	if !ok {
		return imageGenerationJobResponse{}, false
	}
	return q.responseForLocked(job), true
}

func (q *imageGenerationQueue) cancel(id string) (imageGenerationJobResponse, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()

	job, ok := q.jobs[id]
	if !ok {
		return imageGenerationJobResponse{}, false
	}
	if job.Status == imageJobQueued || job.Status == imageJobRunning {
		now := time.Now()
		wasRunning := job.Status == imageJobRunning
		job.Status = imageJobCanceled
		job.FinishedAt = now
		job.UpdatedAt = now
		job.APIKey = ""
		job.Attempts = nil
		q.removePendingLocked(id)
		if job.cancel != nil {
			job.cancel()
			job.cancel = nil
		}
		if wasRunning {
			q.running = maxInt(0, q.running-1)
		}
	}
	return q.responseForLocked(job), true
}

func (q *imageGenerationQueue) responseForLocked(job *imageGenerationJob) imageGenerationJobResponse {
	resp := imageGenerationJobResponse{
		ID:          job.ID,
		Status:      job.Status,
		Profile:     job.Profile,
		QueueLength: len(q.pending),
		Running:     q.running,
		Concurrency: q.concurrency,
		CreatedAt:   job.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
	if pos := q.queuePositionLocked(job.ID); pos > 0 {
		resp.QueuePosition = pos
	}
	if !job.StartedAt.IsZero() {
		resp.StartedAt = job.StartedAt.UTC().Format(time.RFC3339Nano)
	}
	if !job.FinishedAt.IsZero() {
		resp.FinishedAt = job.FinishedAt.UTC().Format(time.RFC3339Nano)
	}
	if len(job.Results) > 0 {
		resp.Results = append([]normalizedResult(nil), job.Results...)
	}
	if job.Status == imageJobFailed {
		resp.Error = &apiError{
			Code:    job.ErrStatus,
			Msg:     job.ErrMsg,
			ErrCode: job.ErrCode,
		}
	}
	return resp
}

func (q *imageGenerationQueue) queuePositionLocked(id string) int {
	for i, pendingID := range q.pending {
		if pendingID == id {
			return i + 1
		}
	}
	return 0
}

func (q *imageGenerationQueue) removePendingLocked(id string) {
	for i, pendingID := range q.pending {
		if pendingID == id {
			q.pending = append(q.pending[:i], q.pending[i+1:]...)
			return
		}
	}
}

func (q *imageGenerationQueue) cleanupLocked(now time.Time) {
	for id, job := range q.jobs {
		if job.Status == imageJobQueued || job.Status == imageJobRunning {
			continue
		}
		if !job.FinishedAt.IsZero() && now.Sub(job.FinishedAt) > q.retention {
			delete(q.jobs, id)
		}
	}
}

func newJobID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err == nil {
		return "imgjob_" + hex.EncodeToString(b[:])
	}
	return fmt.Sprintf("imgjob_%d", time.Now().UnixNano())
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func handleGenerateExternalJobCreate(queue *imageGenerationQueue) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
			return
		}

		var req externalGenerateRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, maxRequestBodyBytes)).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid JSON body")
			return
		}

		prepared, attempts, errStatus, errCode, errMsg := prepareExternalGenerateRequest(req, queue.cfg)
		if errMsg != "" {
			writeError(w, errStatus, errCode, errMsg)
			return
		}

		resp, ok := queue.enqueue(prepared, attempts)
		if !ok {
			writeError(w, http.StatusTooManyRequests, "IMAGE_JOB_QUEUE_FULL", "image generation queue is full; please try again later")
			return
		}

		writeJSON(w, http.StatusAccepted, struct {
			Code int                        `json:"code"`
			Msg  string                     `json:"msg"`
			Data imageGenerationJobResponse `json:"data"`
		}{
			Code: 0,
			Msg:  "accepted",
			Data: resp,
		})
	}
}

func handleGenerateExternalJob(queue *imageGenerationQueue) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/v1/image-studio/generate-external/jobs/")
		id = strings.TrimSpace(strings.Trim(id, "/"))
		if id == "" {
			writeError(w, http.StatusNotFound, "JOB_NOT_FOUND", "image generation job not found")
			return
		}

		var (
			resp imageGenerationJobResponse
			ok   bool
		)
		switch r.Method {
		case http.MethodGet:
			resp, ok = queue.get(id)
		case http.MethodDelete:
			resp, ok = queue.cancel(id)
		default:
			writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
			return
		}
		if !ok {
			writeError(w, http.StatusNotFound, "JOB_NOT_FOUND", "image generation job not found")
			return
		}

		writeJSON(w, http.StatusOK, struct {
			Code int                        `json:"code"`
			Msg  string                     `json:"msg"`
			Data imageGenerationJobResponse `json:"data"`
		}{
			Code: 0,
			Msg:  "ok",
			Data: resp,
		})
	}
}

func prepareExternalGenerateRequest(req externalGenerateRequest, cfg config) (externalGenerateRequest, []externalImageAttempt, int, string, string) {
	req.BaseURL = strings.TrimSpace(req.BaseURL)
	req.APIKey = strings.TrimSpace(req.APIKey)
	req.Profile = strings.ToLower(strings.TrimSpace(req.Profile))
	req.Model = strings.TrimSpace(req.Model)
	req.Prompt = strings.TrimSpace(req.Prompt)
	req.ImageInput = strings.TrimSpace(req.ImageInput)
	cleaned := make([]string, 0, len(req.ImageInputs))
	for _, s := range req.ImageInputs {
		if s = strings.TrimSpace(s); s != "" {
			cleaned = append(cleaned, s)
		}
	}
	if len(cleaned) == 0 && req.ImageInput != "" {
		cleaned = []string{req.ImageInput}
	}
	req.ImageInputs = cleaned
	if len(cleaned) > 0 {
		req.ImageInput = cleaned[0]
	}
	req.Size = strings.TrimSpace(req.Size)
	req.AspectRatio = strings.TrimSpace(req.AspectRatio)
	req.Quality = strings.TrimSpace(req.Quality)
	req.Background = strings.TrimSpace(req.Background)
	req.Format = strings.ToLower(strings.TrimSpace(req.Format))

	if req.BaseURL == "" || req.APIKey == "" || req.Profile == "" || req.Model == "" || req.Prompt == "" {
		return req, nil, http.StatusBadRequest, "INVALID_REQUEST", "base_url, api_key, profile, model and prompt are required"
	}

	normalizedBaseURL, err := validateRemoteURL(req.BaseURL, cfg.AllowPrivateUpstream)
	if err != nil {
		return req, nil, http.StatusBadRequest, "INVALID_BASE_URL", err.Error()
	}

	attempts, err := buildExternalImageAttempts(req, normalizedBaseURL)
	if err != nil {
		return req, nil, http.StatusBadRequest, "INVALID_REQUEST", err.Error()
	}

	return req, attempts, 0, "", ""
}

func handleGenerateExternal(client *http.Client, cfg config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req externalGenerateRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, maxRequestBodyBytes)).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid JSON body")
			return
		}

		req, attempts, errStatus, errCode, errMsg := prepareExternalGenerateRequest(req, cfg)
		if errMsg != "" {
			writeError(w, errStatus, errCode, errMsg)
			return
		}

		results, errStatus, errCode, errMsg := callExternalImageUpstream(
			r.Context(),
			client,
			attempts,
			req.APIKey,
		)
		if errMsg != "" {
			writeError(w, errStatus, errCode, errMsg)
			return
		}

		writeJSON(w, http.StatusOK, externalGenerateResponse{
			Code: 0,
			Msg:  "ok",
			Data: externalGenerateData{
				Profile: req.Profile,
				Results: results,
			},
		})
	}
}

func callExternalImageUpstream(
	ctx context.Context,
	client *http.Client,
	attempts []externalImageAttempt,
	apiKey string,
) ([]normalizedResult, int, string, string) {
	lastStatus := http.StatusBadGateway
	lastCode := "UPSTREAM_REQUEST_FAILED"
	lastMsg := "failed to reach upstream provider"

	if len(attempts) == 0 {
		return nil, http.StatusBadRequest, "INVALID_REQUEST", "no upstream request variants were built"
	}

	for variantIndex, variant := range attempts {
		for attempt := 1; attempt <= maxExternalGenerateAttempts; attempt++ {
			upstreamReq, err := http.NewRequestWithContext(ctx, http.MethodPost, variant.EndpointURL, bytes.NewReader(variant.Body))
			if err != nil {
				return nil, http.StatusInternalServerError, "REQUEST_BUILD_FAILED", "failed to build upstream request"
			}
			upstreamReq.Header.Set("Authorization", "Bearer "+apiKey)
			upstreamReq.Header.Set("Content-Type", variant.ContentType)
			upstreamReq.Header.Set("Accept", "application/json")

			resp, err := client.Do(upstreamReq)
			if err != nil {
				lastStatus = http.StatusBadGateway
				lastCode = "UPSTREAM_REQUEST_FAILED"
				lastMsg = fmt.Sprintf("failed to reach upstream provider: %v", err)
				if shouldRetryExternalGenerate(attempt, 0, lastMsg) && waitBeforeExternalRetry(ctx, lastMsg, attempt) {
					continue
				}
				return nil, lastStatus, lastCode, lastMsg
			}

			respBody, tooLarge, readErr := readLimitedResponseBody(resp.Body, maxUpstreamBodyBytes)
			_ = resp.Body.Close()

			if readErr != nil {
				lastStatus = http.StatusBadGateway
				lastCode = "UPSTREAM_READ_FAILED"
				lastMsg = fmt.Sprintf("failed to read upstream response: %v", readErr)
				if shouldRetryExternalGenerate(attempt, resp.StatusCode, lastMsg) && waitBeforeExternalRetry(ctx, lastMsg, attempt) {
					continue
				}
				return nil, lastStatus, lastCode, lastMsg
			}

			if tooLarge {
				return nil,
					http.StatusBadGateway,
					"UPSTREAM_RESPONSE_TOO_LARGE",
					fmt.Sprintf("upstream response exceeded %d MB; try standard resolution or relay a URL response instead of base64", maxUpstreamBodyBytes/(1<<20))
			}

			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				mappedStatus := resp.StatusCode
				if mappedStatus >= http.StatusInternalServerError {
					mappedStatus = http.StatusBadGateway
				}
				lastStatus = mappedStatus
				lastCode = "UPSTREAM_ERROR"
				lastMsg = parseUpstreamErrorMessage(resp.StatusCode, respBody)
				if shouldRetryCurrentExternalAttemptBeforeFallback(attempt, resp.StatusCode, lastMsg) && waitBeforeExternalRetry(ctx, lastMsg, attempt) {
					continue
				}
				if shouldTryNextExternalAttempt(variantIndex, len(attempts), resp.StatusCode, lastMsg) {
					break
				}
				if shouldRetryExternalGenerate(attempt, resp.StatusCode, lastMsg) && waitBeforeExternalRetry(ctx, lastMsg, attempt) {
					continue
				}
				return nil, lastStatus, lastCode, lastMsg
			}

			results, err := normalizeExternalResults(respBody, variant.Format)
			if err != nil {
				lastStatus = http.StatusBadGateway
				lastCode = "UPSTREAM_RESPONSE_INVALID"
				lastMsg = err.Error()
				if shouldRetryCurrentExternalAttemptBeforeFallback(attempt, resp.StatusCode, lastMsg) && waitBeforeExternalRetry(ctx, lastMsg, attempt) {
					continue
				}
				if shouldTryNextExternalAttempt(variantIndex, len(attempts), resp.StatusCode, lastMsg) {
					break
				}
				if shouldRetryExternalGenerate(attempt, resp.StatusCode, lastMsg) && waitBeforeExternalRetry(ctx, lastMsg, attempt) {
					continue
				}
				return nil, lastStatus, lastCode, lastMsg
			}

			return results, 0, "", ""
		}
	}

	return nil, lastStatus, lastCode, lastMsg
}

func shouldRetryCurrentExternalAttemptBeforeFallback(attempt int, status int, message string) bool {
	if attempt >= maxExternalGenerateAttempts {
		return false
	}
	if status == http.StatusTooManyRequests {
		return false
	}
	lower := strings.ToLower(message)
	transientFragments := []string{
		"stream disconnected",
		"before completion",
		"timeout",
		"timed out",
		"receive timeout",
		"unexpected eof",
		"eof",
		"wsarecv",
		"connection attempt failed",
		"failed to respond",
		"host has failed to respond",
		"connection reset",
		"broken pipe",
		"gateway",
		"temporarily unavailable",
	}
	for _, fragment := range transientFragments {
		if strings.Contains(lower, fragment) {
			return true
		}
	}
	return false
}

func readLimitedResponseBody(body io.Reader, limit int64) ([]byte, bool, error) {
	data, err := io.ReadAll(io.LimitReader(body, limit+1))
	if err != nil {
		return nil, false, err
	}
	if int64(len(data)) > limit {
		return data[:limit], true, nil
	}
	return data, false, nil
}

func shouldRetryExternalGenerate(attempt int, status int, message string) bool {
	if attempt >= maxExternalGenerateAttempts {
		return false
	}
	if status == http.StatusRequestTimeout ||
		status == http.StatusTooManyRequests ||
		status == http.StatusBadGateway ||
		status == http.StatusServiceUnavailable ||
		status == http.StatusGatewayTimeout ||
		status == 524 ||
		status >= http.StatusInternalServerError {
		return true
	}

	lower := strings.ToLower(message)
	retryableFragments := []string{
		"stream disconnected",
		"before completion",
		"timeout",
		"timed out",
		"receive timeout",
		"unexpected eof",
		"eof",
		"wsarecv",
		"connection attempt failed",
		"failed to respond",
		"host has failed to respond",
		"connection reset",
		"broken pipe",
		"connection refused",
		"gateway",
		"temporarily unavailable",
	}
	for _, fragment := range retryableFragments {
		if strings.Contains(lower, fragment) {
			return true
		}
	}
	return false
}

func shouldTryNextExternalAttempt(variantIndex, variantCount, status int, message string) bool {
	if variantIndex >= variantCount-1 {
		return false
	}
	if status == http.StatusUnauthorized ||
		status == http.StatusForbidden ||
		status == http.StatusTooManyRequests ||
		status == http.StatusRequestTimeout {
		return false
	}

	lower := strings.ToLower(message)
	nonVariantFragments := []string{
		"invalid api key",
		"incorrect api key",
		"unauthorized",
		"forbidden",
		"permission",
		"quota",
		"insufficient",
		"billing",
		"balance",
		"model_not_found",
		"model not found",
		"model does not exist",
		"unsupported model",
	}
	for _, fragment := range nonVariantFragments {
		if strings.Contains(lower, fragment) {
			return false
		}
	}

	if status == http.StatusBadRequest ||
		status == http.StatusNotFound ||
		status == http.StatusMethodNotAllowed ||
		status == http.StatusUnsupportedMediaType ||
		status == http.StatusUnprocessableEntity ||
		status == http.StatusBadGateway ||
		status == http.StatusServiceUnavailable ||
		status == http.StatusGatewayTimeout ||
		status == 524 ||
		status >= http.StatusInternalServerError {
		return true
	}

	variantFragments := []string{
		"unknown parameter",
		"unrecognized",
		"unsupported",
		"invalid parameter",
		"invalid_request",
		"bad request",
		"stream disconnected",
		"before completion",
		"did not contain any image",
	}
	for _, fragment := range variantFragments {
		if strings.Contains(lower, fragment) {
			return true
		}
	}
	return false
}

func waitBeforeExternalRetry(ctx context.Context, reason string, attempt int) bool {
	log.Printf("upstream image generation attempt %d failed, retrying: %s", attempt, reason)
	timer := time.NewTimer(externalGenerateRetryDelay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func handleDownload(client *http.Client, cfg config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rawURL := strings.TrimSpace(r.URL.Query().Get("url"))
		if rawURL == "" {
			writeError(w, http.StatusBadRequest, "URL_REQUIRED", "url is required")
			return
		}

		normalizedURL, err := validateRemoteURL(rawURL, cfg.AllowPrivateUpstream)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_URL", err.Error())
			return
		}

		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, normalizedURL, nil)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "DOWNLOAD_REQUEST_FAILED", "failed to build download request")
			return
		}

		resp, err := client.Do(req)
		if err != nil {
			writeError(w, http.StatusBadGateway, "DOWNLOAD_FAILED", fmt.Sprintf("failed to download image: %v", err))
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			writeError(w, http.StatusBadGateway, "DOWNLOAD_FAILED", fmt.Sprintf("upstream download failed with status %d", resp.StatusCode))
			return
		}

		contentType := strings.TrimSpace(resp.Header.Get("Content-Type"))
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		w.Header().Set("Content-Type", contentType)
		if cl := strings.TrimSpace(resp.Header.Get("Content-Length")); cl != "" {
			w.Header().Set("Content-Length", cl)
		}

		filename := sanitizeFilename(r.URL.Query().Get("filename"))
		if filename == "" {
			parsed, _ := url.Parse(normalizedURL)
			filename = inferFilename(parsed, contentType)
		}
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
		w.WriteHeader(http.StatusOK)

		if _, err := io.Copy(w, resp.Body); err != nil {
			log.Printf("download stream error: %v", err)
		}
	}
}

// ============================================================================
// Static file serving
// ============================================================================

func buildStaticHandler() http.HandlerFunc {
	staticDir := strings.TrimSpace(os.Getenv("STATIC_DIR"))
	if staticDir != "" {
		if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
			fileServer := http.FileServer(http.Dir(staticDir))
			return func(w http.ResponseWriter, r *http.Request) {
				serveSPA(w, r, http.Dir(staticDir), fileServer, staticDir)
			}
		}
		log.Printf("STATIC_DIR=%q not usable, falling back to embedded assets", staticDir)
	}

	sub, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		log.Printf("embedded web fs init failed: %v", err)
		return func(w http.ResponseWriter, _ *http.Request) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "frontend not embedded")
		}
	}
	fileServer := http.FileServer(http.FS(sub))
	return func(w http.ResponseWriter, r *http.Request) {
		serveSPAFromFS(w, r, sub, fileServer)
	}
}

func serveSPA(w http.ResponseWriter, r *http.Request, root http.FileSystem, server http.Handler, dir string) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		http.NotFound(w, r)
		return
	}
	upath := r.URL.Path
	if upath == "/" {
		upath = "/index.html"
	}
	candidate := strings.TrimPrefix(upath, "/")
	full := path.Join(dir, candidate)
	if info, err := os.Stat(full); err == nil && !info.IsDir() {
		server.ServeHTTP(w, r)
		return
	}
	// SPA fallback: serve index.html
	indexPath := path.Join(dir, "index.html")
	http.ServeFile(w, r, indexPath)
	_ = root
}

func serveSPAFromFS(w http.ResponseWriter, r *http.Request, root fs.FS, server http.Handler) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		http.NotFound(w, r)
		return
	}
	upath := r.URL.Path
	if upath == "/" {
		upath = "/index.html"
	}
	candidate := strings.TrimPrefix(upath, "/")
	if f, err := root.Open(candidate); err == nil {
		_ = f.Close()
		server.ServeHTTP(w, r)
		return
	}
	// SPA fallback: serve index.html
	data, err := fs.ReadFile(root, "index.html")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(data)
}

// ============================================================================
// URL validation (SSRF guard)
// ============================================================================

func validateRemoteURL(raw string, allowPrivate bool) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("url is empty")
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", errors.New("only http/https urls are supported")
	}
	host := parsed.Hostname()
	if host == "" {
		return "", errors.New("missing host")
	}
	if allowPrivate {
		return parsed.String(), nil
	}
	if isPrivateHost(host) {
		return "", errors.New("private/loopback hosts are not allowed (set ALLOW_PRIVATE_UPSTREAM=true if needed)")
	}
	return parsed.String(), nil
}

func isPrivateHost(host string) bool {
	low := strings.ToLower(host)
	if low == "localhost" || strings.HasSuffix(low, ".localhost") {
		return true
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		// Cannot resolve: treat as untrusted only when an IP literal was given
		if ip := net.ParseIP(host); ip != nil {
			return isPrivateIP(ip)
		}
		// DNS lookup failure on a non-literal domain — let request through; upstream call will fail anyway
		return false
	}
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return true
		}
	}
	return false
}

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	return false
}

// ============================================================================
// Payload assembly
// ============================================================================

type externalImageOptionMode string

const (
	externalImageOptionFull       externalImageOptionMode = "full"
	externalImageOptionCompatible externalImageOptionMode = "compatible"
	externalImageOptionMinimal    externalImageOptionMode = "minimal"
)

type externalAttemptBuilder struct {
	attempts []externalImageAttempt
	seen     map[string]struct{}
}

func buildExternalImageAttempts(req externalGenerateRequest, baseURL string) ([]externalImageAttempt, error) {
	count := normalizeCount(req.Count)
	size := resolveSize(req.Size, req.AspectRatio)
	builder := externalAttemptBuilder{seen: make(map[string]struct{})}

	switch req.Profile {
	case profileOpenAIImageAPI:
		if len(req.ImageInputs) == 0 {
			endpoint, err := joinURL(baseURL, "/images/generations")
			if err != nil {
				return nil, err
			}
			for _, mode := range imageOptionModes(req) {
				payload := baseOpenAIImagePayload(req, count, size)
				addExternalImageOptions(payload, req, mode, "output_format")
				if err := builder.addJSON("openai-image-generations-"+string(mode), endpoint, req.Format, payload); err != nil {
					return nil, err
				}
			}
			return builder.attempts, nil
		}

		editEndpoint, err := joinURL(baseURL, "/images/edits")
		if err != nil {
			return nil, err
		}
		for _, imageFieldName := range []string{"image[]", "image"} {
			for _, mode := range imageOptionModes(req) {
				if err := builder.addOpenAIImageMultipart(
					"openai-image-edits-"+imageFieldName+"-"+string(mode),
					editEndpoint,
					req,
					count,
					size,
					mode,
					imageFieldName,
				); err != nil {
					return nil, err
				}
			}
		}

		generationEndpoint, err := joinURL(baseURL, "/images/generations")
		if err != nil {
			return nil, err
		}
		for _, mode := range imageOptionModes(req) {
			payload := baseOpenAIImagePayload(req, count, size)
			payload["image_input"] = req.ImageInputs[0]
			payload["image_inputs"] = req.ImageInputs
			addExternalImageOptions(payload, req, mode, "output_format")
			if err := builder.addJSON("openai-image-generations-with-reference-"+string(mode), generationEndpoint, req.Format, payload); err != nil {
				return nil, err
			}
		}
		return builder.attempts, nil

	case profileOpenAIResponses:
		endpoint, err := joinURL(baseURL, "/responses")
		if err != nil {
			return nil, err
		}
		for _, mode := range imageOptionModes(req) {
			payload := buildResponsesPayload(req, count, size, mode, false)
			if err := builder.addJSON("openai-responses-"+string(mode), endpoint, req.Format, payload); err != nil {
				return nil, err
			}
		}
		if len(req.ImageInputs) == 0 {
			for _, mode := range imageOptionModes(req) {
				payload := buildResponsesPayload(req, count, size, mode, true)
				if err := builder.addJSON("openai-responses-input-string-"+string(mode), endpoint, req.Format, payload); err != nil {
					return nil, err
				}
			}
		}
		return builder.attempts, nil

	case profileSub2APICompatible:
		endpoint, err := joinURL(baseURL, "/chat/completions")
		if err != nil {
			return nil, err
		}
		for _, payload := range buildSub2APICompatiblePayloads(req, count) {
			if err := builder.addJSON("sub2api-chat-compatible", endpoint, req.Format, payload); err != nil {
				return nil, err
			}
		}
		return builder.attempts, nil

	default:
		return nil, fmt.Errorf("unsupported profile: %s", req.Profile)
	}
}

func (b *externalAttemptBuilder) addJSON(name, endpointURL, format string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	key := "json|" + endpointURL + "|" + string(body)
	if _, ok := b.seen[key]; ok {
		return nil
	}
	b.seen[key] = struct{}{}
	b.attempts = append(b.attempts, externalImageAttempt{
		Name:        name,
		EndpointURL: endpointURL,
		Body:        body,
		ContentType: "application/json",
		Format:      format,
	})
	return nil
}

func (b *externalAttemptBuilder) addOpenAIImageMultipart(
	name string,
	endpointURL string,
	req externalGenerateRequest,
	count int,
	size string,
	mode externalImageOptionMode,
	imageFieldName string,
) error {
	optionFields := externalImageOptionFields(req, mode, "output_format")
	key := "multipart|" + endpointURL + "|" + imageFieldName + "|" + size + "|" + optionFieldsSignature(optionFields)
	if _, ok := b.seen[key]; ok {
		return nil
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("model", req.Model)
	_ = writer.WriteField("prompt", req.Prompt)
	_ = writer.WriteField("n", strconv.Itoa(count))
	if size != "" {
		_ = writer.WriteField("size", size)
	}
	for key, value := range optionFields {
		_ = writer.WriteField(key, value)
	}
	for idx, dataURL := range req.ImageInputs {
		imageBytes, mimeType, err := decodeDataURL(dataURL)
		if err != nil {
			return fmt.Errorf("image_inputs[%d]: %w", idx, err)
		}
		fileWriter, err := writer.CreateFormFile(imageFieldName, fmt.Sprintf("reference-%d%s", idx+1, extensionForMimeType(mimeType)))
		if err != nil {
			return err
		}
		if _, err := fileWriter.Write(imageBytes); err != nil {
			return err
		}
	}
	if err := writer.Close(); err != nil {
		return err
	}

	b.seen[key] = struct{}{}
	b.attempts = append(b.attempts, externalImageAttempt{
		Name:        name,
		EndpointURL: endpointURL,
		Body:        body.Bytes(),
		ContentType: writer.FormDataContentType(),
		Format:      req.Format,
	})
	return nil
}

func imageOptionModes(req externalGenerateRequest) []externalImageOptionMode {
	if imageOptionsAreDefault(req) {
		return []externalImageOptionMode{
			externalImageOptionCompatible,
			externalImageOptionMinimal,
			externalImageOptionFull,
		}
	}
	return []externalImageOptionMode{
		externalImageOptionFull,
		externalImageOptionCompatible,
		externalImageOptionMinimal,
	}
}

func imageOptionsAreDefault(req externalGenerateRequest) bool {
	quality := strings.TrimSpace(req.Quality)
	background := strings.TrimSpace(req.Background)
	format := strings.TrimSpace(req.Format)
	return (quality == "" || isDefaultImageQuality(quality)) &&
		(background == "" || strings.EqualFold(background, "auto")) &&
		(format == "" || strings.EqualFold(format, "png"))
}

func baseOpenAIImagePayload(req externalGenerateRequest, count int, size string) map[string]any {
	payload := map[string]any{
		"model":  req.Model,
		"prompt": req.Prompt,
		"n":      count,
	}
	if size != "" {
		payload["size"] = size
	}
	return payload
}

func buildResponsesPayload(req externalGenerateRequest, count int, size string, mode externalImageOptionMode, inputAsString bool) map[string]any {
	tool := map[string]any{"type": "image_generation"}
	if size != "" {
		tool["size"] = size
	}
	addExternalImageOptions(tool, req, mode, "format")
	if count > 1 {
		tool["n"] = count
	}

	payload := map[string]any{
		"model":  req.Model,
		"tools":  []map[string]any{tool},
		"stream": false,
	}
	if inputAsString {
		payload["input"] = req.Prompt
		return payload
	}

	content := []map[string]any{
		{"type": "input_text", "text": req.Prompt},
	}
	for _, dataURL := range req.ImageInputs {
		content = append(content, map[string]any{
			"type":      "input_image",
			"image_url": dataURL,
		})
	}
	payload["input"] = []map[string]any{
		{
			"role":    "user",
			"content": content,
		},
	}
	return payload
}

func buildSub2APICompatiblePayloads(req externalGenerateRequest, count int) []map[string]any {
	payload := map[string]any{
		"model":    req.Model,
		"messages": []map[string]any{{"role": "user", "content": req.Prompt}},
		"stream":   false,
	}
	if len(req.ImageInputs) > 0 {
		payload["image_input"] = req.ImageInputs[0]
		payload["image_inputs"] = req.ImageInputs
	}
	if count > 1 {
		payload["n_variants"] = count
	}

	payloads := []map[string]any{payload}
	if len(req.ImageInputs) > 0 {
		content := []map[string]any{
			{"type": "text", "text": req.Prompt},
		}
		for _, dataURL := range req.ImageInputs {
			content = append(content, map[string]any{
				"type": "image_url",
				"image_url": map[string]any{
					"url": dataURL,
				},
			})
		}
		multimodalPayload := map[string]any{
			"model":    req.Model,
			"messages": []map[string]any{{"role": "user", "content": content}},
			"stream":   false,
		}
		if count > 1 {
			multimodalPayload["n"] = count
		}
		payloads = append(payloads, multimodalPayload)
	}
	return payloads
}

func addExternalImageOptions(payload map[string]any, req externalGenerateRequest, mode externalImageOptionMode, formatKey string) {
	for key, value := range externalImageOptionFields(req, mode, formatKey) {
		payload[key] = value
	}
}

func externalImageOptionFields(req externalGenerateRequest, mode externalImageOptionMode, formatKey string) map[string]string {
	fields := make(map[string]string)
	if mode == externalImageOptionMinimal {
		return fields
	}

	quality := strings.TrimSpace(req.Quality)
	background := strings.TrimSpace(req.Background)
	format := strings.TrimSpace(req.Format)
	if mode == externalImageOptionCompatible {
		if quality != "" && !isDefaultImageQuality(quality) {
			fields["quality"] = quality
		}
		if background != "" && !strings.EqualFold(background, "auto") {
			fields["background"] = background
		}
		if format != "" && !strings.EqualFold(format, "png") {
			fields[formatKey] = format
		}
		return fields
	}

	if quality != "" {
		fields["quality"] = quality
	}
	if background != "" {
		fields["background"] = background
	}
	if format != "" {
		fields[formatKey] = format
	}
	return fields
}

func isDefaultImageQuality(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "auto", "standard", "high":
		return true
	default:
		return false
	}
}

func optionFieldsSignature(fields map[string]string) string {
	return "quality=" + fields["quality"] +
		";background=" + fields["background"] +
		";format=" + fields["format"] +
		";output_format=" + fields["output_format"]
}

func joinURL(baseURL, endpointPath string) (string, error) {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}
	parsed.Path = strings.TrimRight(parsed.Path, "/") + "/" + strings.TrimLeft(endpointPath, "/")
	parsed.RawPath = ""
	return parsed.String(), nil
}

func normalizeCount(count int) int {
	if count <= 0 {
		return imageStudioDefaultImageCount
	}
	if count > imageStudioMaxImageCount {
		return imageStudioMaxImageCount
	}
	return count
}

func resolveSize(size, aspectRatio string) string {
	if size := strings.TrimSpace(size); size != "" {
		return size
	}
	switch strings.TrimSpace(aspectRatio) {
	case "16:9", "21:9", "4:3", "3:2", "5:4":
		return "1536x1024"
	case "9:16", "3:4", "2:3", "4:5":
		return "1024x1536"
	case "1:1":
		return "1024x1024"
	default:
		return ""
	}
}

func decodeDataURL(input string) ([]byte, string, error) {
	if !strings.HasPrefix(input, "data:") {
		return nil, "", errors.New("image_input must be a data URL")
	}
	commaIndex := strings.Index(input, ",")
	if commaIndex <= 5 {
		return nil, "", errors.New("invalid data URL")
	}
	metadata := input[5:commaIndex]
	payload := input[commaIndex+1:]
	mimeType := "image/png"
	if metadata != "" {
		parts := strings.Split(metadata, ";")
		if len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
			mimeType = strings.TrimSpace(parts[0])
		}
	}
	if !strings.Contains(metadata, ";base64") {
		return nil, "", errors.New("data URL must be base64 encoded")
	}
	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return nil, "", errors.New("failed to decode data URL base64 payload")
	}
	return decoded, mimeType, nil
}

func extensionForMimeType(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/jpeg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	default:
		return ".png"
	}
}

func mimeTypeForFormat(formatHint string) string {
	switch strings.ToLower(strings.TrimSpace(formatHint)) {
	case "jpeg", "jpg":
		return "image/jpeg"
	case "webp":
		return "image/webp"
	default:
		return "image/png"
	}
}

// ============================================================================
// Response normalization
// ============================================================================

func normalizeExternalResults(raw []byte, formatHint string) ([]normalizedResult, error) {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, errors.New("upstream response is not valid JSON")
	}

	results := make([]normalizedResult, 0, imageStudioMaxImageCount)
	seen := make(map[string]struct{})
	defaultMime := mimeTypeForFormat(formatHint)

	add := func(urlVal, source, mimeType, revisedPrompt string) {
		urlVal = strings.TrimSpace(urlVal)
		if urlVal == "" {
			return
		}
		if _, dup := seen[urlVal]; dup {
			return
		}
		seen[urlVal] = struct{}{}
		results = append(results, normalizedResult{
			URL:           urlVal,
			Source:        source,
			MimeType:      strings.TrimSpace(mimeType),
			RevisedPrompt: strings.TrimSpace(revisedPrompt),
		})
	}

	addTextContent := func(text, revisedPrompt string) {
		text = strings.TrimSpace(text)
		if text == "" {
			return
		}

		var nested map[string]any
		if err := json.Unmarshal([]byte(text), &nested); err == nil {
			if u := getStringField(nested, "url", "image_url", "media_url"); u != "" {
				add(u, "remote-url", getStringField(nested, "mime_type"), revisedPrompt)
			}
			if b64 := getStringField(nested, "result", "b64_json"); b64 != "" {
				mt := getStringField(nested, "mime_type")
				if mt == "" {
					mt = defaultMime
				}
				add(buildDataURL(b64, mt), "data-url", mt, revisedPrompt)
			}
		}

		for _, token := range strings.Fields(text) {
			token = strings.Trim(token, " \t\r\n\"'`<>()[]{}!,;")
			if strings.HasPrefix(token, "data:image/") {
				add(token, "data-url", "", revisedPrompt)
				continue
			}
			if strings.HasPrefix(token, "http://") || strings.HasPrefix(token, "https://") {
				add(token, "remote-url", "", revisedPrompt)
			}
		}
	}

	if mediaURL := getStringField(payload, "media_url"); mediaURL != "" {
		add(mediaURL, "remote-url", "", "")
	}
	if arr, ok := payload["media_urls"].([]any); ok {
		for _, item := range arr {
			if s, ok := item.(string); ok {
				add(s, "remote-url", "", "")
			}
		}
	}

	if data, ok := payload["data"].([]any); ok {
		for _, item := range data {
			m, ok := item.(map[string]any)
			if !ok {
				continue
			}
			rp := getStringField(m, "revised_prompt", "revisedPrompt")
			if u := getStringField(m, "url"); u != "" {
				add(u, "remote-url", getStringField(m, "mime_type"), rp)
			}
			if b64 := getStringField(m, "b64_json"); b64 != "" {
				mt := getStringField(m, "mime_type")
				if mt == "" {
					mt = defaultMime
				}
				add(buildDataURL(b64, mt), "data-url", mt, rp)
			}
		}
	}

	if output, ok := payload["output"].([]any); ok {
		for _, item := range output {
			m, ok := item.(map[string]any)
			if !ok {
				continue
			}
			rp := getStringField(m, "revised_prompt", "revisedPrompt")
			if u := getStringField(m, "url", "image_url"); u != "" {
				add(u, "remote-url", getStringField(m, "mime_type"), rp)
			}
			if b64 := getStringField(m, "result", "b64_json"); b64 != "" {
				mt := getStringField(m, "mime_type")
				if mt == "" {
					mt = defaultMime
				}
				add(buildDataURL(b64, mt), "data-url", mt, rp)
			}
			content, ok := m["content"].([]any)
			if !ok {
				continue
			}
			for _, ci := range content {
				cm, ok := ci.(map[string]any)
				if !ok {
					continue
				}
				if u := getStringField(cm, "url", "image_url"); u != "" {
					add(u, "remote-url", getStringField(cm, "mime_type"), rp)
				}
				if b64 := getStringField(cm, "result", "b64_json"); b64 != "" {
					mt := getStringField(cm, "mime_type")
					if mt == "" {
						mt = defaultMime
					}
					add(buildDataURL(b64, mt), "data-url", mt, rp)
				}
			}
		}
	}

	if choices, ok := payload["choices"].([]any); ok {
		for _, item := range choices {
			m, ok := item.(map[string]any)
			if !ok {
				continue
			}
			message, ok := m["message"].(map[string]any)
			if !ok {
				continue
			}
			rp := getStringField(message, "revised_prompt", "revisedPrompt")
			switch content := message["content"].(type) {
			case string:
				addTextContent(content, rp)
			case []any:
				for _, ci := range content {
					cm, ok := ci.(map[string]any)
					if !ok {
						continue
					}
					if text := getStringField(cm, "text", "content"); text != "" {
						addTextContent(text, rp)
					}
					if u := getStringField(cm, "url", "image_url"); u != "" {
						add(u, "remote-url", getStringField(cm, "mime_type"), rp)
					}
					if imageURL, ok := cm["image_url"].(map[string]any); ok {
						if u := getStringField(imageURL, "url"); u != "" {
							add(u, "remote-url", getStringField(cm, "mime_type"), rp)
						}
					}
					if b64 := getStringField(cm, "result", "b64_json"); b64 != "" {
						mt := getStringField(cm, "mime_type")
						if mt == "" {
							mt = defaultMime
						}
						add(buildDataURL(b64, mt), "data-url", mt, rp)
					}
				}
			}
		}
	}

	if u := getStringField(payload, "url"); u != "" {
		add(u, "remote-url", getStringField(payload, "mime_type"), "")
	}
	if b64 := getStringField(payload, "result", "b64_json"); b64 != "" {
		mt := getStringField(payload, "mime_type")
		if mt == "" {
			mt = defaultMime
		}
		add(buildDataURL(b64, mt), "data-url", mt, "")
	}

	if len(results) == 0 {
		return nil, errors.New("upstream response did not contain any image results")
	}
	return results, nil
}

func buildDataURL(b64, mimeType string) string {
	return "data:" + mimeType + ";base64," + strings.TrimSpace(b64)
}

func getStringField(source map[string]any, keys ...string) string {
	for _, k := range keys {
		v, ok := source[k]
		if !ok {
			continue
		}
		if s, ok := v.(string); ok {
			s = strings.TrimSpace(s)
			if s != "" {
				return s
			}
		}
	}
	return ""
}

func parseUpstreamErrorMessage(status int, raw []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err == nil {
		if errObj, ok := payload["error"].(map[string]any); ok {
			if m := getStringField(errObj, "message", "msg", "detail", "error", "err_code"); m != "" {
				return m
			}
		}
		if m := getStringField(payload, "message", "msg", "detail", "error", "err_code"); m != "" {
			return m
		}
	}
	if text := strings.TrimSpace(string(raw)); text != "" {
		return text
	}
	return fmt.Sprintf("upstream returned status %d", status)
}

// ============================================================================
// Filename helpers
// ============================================================================

func sanitizeFilename(raw string) string {
	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return ""
	}
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", "_",
		"*", "_",
		"?", "",
		"\"", "",
		"<", "",
		">", "",
		"|", "_",
	)
	cleaned = replacer.Replace(cleaned)
	cleaned = strings.Trim(cleaned, " .")
	return cleaned
}

func inferFilename(parsed *url.URL, contentType string) string {
	base := "image-studio-result"
	if parsed != nil {
		if name := strings.TrimSpace(path.Base(parsed.Path)); name != "" && name != "." && name != "/" {
			base = sanitizeFilename(name)
		}
	}
	if path.Ext(base) == "" {
		if exts, _ := mime.ExtensionsByType(contentType); len(exts) > 0 {
			base += exts[0]
		} else {
			base += ".png"
		}
	}
	return base
}

// ============================================================================
// JSON helpers
// ============================================================================

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json error: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, apiError{
		Code:    status,
		Msg:     msg,
		ErrCode: code,
	})
}
