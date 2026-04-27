package main

import (
	"bytes"
	"context"
	"embed"
	"encoding/base64"
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
	"syscall"
	"time"
)

//go:embed all:web
var embeddedWeb embed.FS

const (
	defaultPort                  = "8090"
	defaultHost                  = "0.0.0.0"
	defaultDownloadTimeout       = 60 * time.Second
	defaultUpstreamTimeout       = 180 * time.Second
	maxUpstreamBodyBytes         = 32 << 20
	maxRequestBodyBytes          = 16 << 20
	imageStudioMaxImageCount     = 10
	imageStudioDefaultImageCount = 1

	profileOpenAIImageAPI = "openai-image-api"
	profileOpenAIResponses = "openai-responses"
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
	Code int               `json:"code"`
	Msg  string            `json:"msg"`
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

type config struct {
	Host                string
	Port                string
	AllowPrivateUpstream bool
	UpstreamTimeout     time.Duration
	DownloadTimeout     time.Duration
}

func main() {
	cfg := loadConfig()

	httpClient := &http.Client{
		Timeout: cfg.UpstreamTimeout,
	}
	downloadClient := &http.Client{
		Timeout: cfg.DownloadTimeout,
	}

	mux := http.NewServeMux()
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
		Host:                getenv("HOST", defaultHost),
		Port:                getenv("PORT", defaultPort),
		AllowPrivateUpstream: parseBool(os.Getenv("ALLOW_PRIVATE_UPSTREAM"), false),
		UpstreamTimeout:     parseDuration(os.Getenv("UPSTREAM_TIMEOUT"), defaultUpstreamTimeout),
		DownloadTimeout:     parseDuration(os.Getenv("DOWNLOAD_TIMEOUT"), defaultDownloadTimeout),
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
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
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

func handleGenerateExternal(client *http.Client, cfg config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req externalGenerateRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, maxRequestBodyBytes)).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid JSON body")
			return
		}

		req.BaseURL = strings.TrimSpace(req.BaseURL)
		req.APIKey = strings.TrimSpace(req.APIKey)
		req.Profile = strings.ToLower(strings.TrimSpace(req.Profile))
		req.Model = strings.TrimSpace(req.Model)
		req.Prompt = strings.TrimSpace(req.Prompt)
		req.ImageInput = strings.TrimSpace(req.ImageInput)
		// Normalize ImageInputs: prefer the array; fall back to the single field for legacy callers.
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
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "base_url, api_key, profile, model and prompt are required")
			return
		}

		normalizedBaseURL, err := validateRemoteURL(req.BaseURL, cfg.AllowPrivateUpstream)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_BASE_URL", err.Error())
			return
		}

		endpointURL, body, contentType, err := buildExternalImagePayload(req, normalizedBaseURL)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}

		upstreamReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, endpointURL, bytes.NewReader(body))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "REQUEST_BUILD_FAILED", "failed to build upstream request")
			return
		}
		upstreamReq.Header.Set("Authorization", "Bearer "+req.APIKey)
		upstreamReq.Header.Set("Content-Type", contentType)
		upstreamReq.Header.Set("Accept", "application/json")

		resp, err := client.Do(upstreamReq)
		if err != nil {
			writeError(w, http.StatusBadGateway, "UPSTREAM_REQUEST_FAILED", fmt.Sprintf("failed to reach upstream provider: %v", err))
			return
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(io.LimitReader(resp.Body, maxUpstreamBodyBytes))
		if err != nil {
			writeError(w, http.StatusBadGateway, "UPSTREAM_READ_FAILED", "failed to read upstream response")
			return
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			mappedStatus := resp.StatusCode
			if mappedStatus >= http.StatusInternalServerError {
				mappedStatus = http.StatusBadGateway
			}
			writeError(w, mappedStatus, "UPSTREAM_ERROR", parseUpstreamErrorMessage(resp.StatusCode, respBody))
			return
		}

		results, err := normalizeExternalResults(respBody, req.Format)
		if err != nil {
			writeError(w, http.StatusBadGateway, "UPSTREAM_RESPONSE_INVALID", err.Error())
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

func buildExternalImagePayload(req externalGenerateRequest, baseURL string) (string, []byte, string, error) {
	count := normalizeCount(req.Count)
	size := resolveSize(req.Size, req.AspectRatio)

	switch req.Profile {
	case profileOpenAIImageAPI:
		if len(req.ImageInputs) == 0 {
			payload := map[string]any{
				"model":  req.Model,
				"prompt": req.Prompt,
				"n":      count,
			}
			if size != "" {
				payload["size"] = size
			}
			if req.Quality != "" {
				payload["quality"] = req.Quality
			}
			if req.Background != "" {
				payload["background"] = req.Background
			}
			if req.Format != "" {
				payload["output_format"] = req.Format
			}
			body, err := json.Marshal(payload)
			if err != nil {
				return "", nil, "", err
			}
			endpoint, err := joinURL(baseURL, "/images/generations")
			if err != nil {
				return "", nil, "", err
			}
			return endpoint, body, "application/json", nil
		}

		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		_ = writer.WriteField("model", req.Model)
		_ = writer.WriteField("prompt", req.Prompt)
		_ = writer.WriteField("n", strconv.Itoa(count))
		if size != "" {
			_ = writer.WriteField("size", size)
		}
		if req.Quality != "" {
			_ = writer.WriteField("quality", req.Quality)
		}
		if req.Background != "" {
			_ = writer.WriteField("background", req.Background)
		}
		if req.Format != "" {
			_ = writer.WriteField("output_format", req.Format)
		}
		for idx, dataURL := range req.ImageInputs {
			imageBytes, mimeType, err := decodeDataURL(dataURL)
			if err != nil {
				return "", nil, "", fmt.Errorf("image_inputs[%d]: %w", idx, err)
			}
			fileWriter, err := writer.CreateFormFile("image[]", fmt.Sprintf("reference-%d%s", idx+1, extensionForMimeType(mimeType)))
			if err != nil {
				return "", nil, "", err
			}
			if _, err := fileWriter.Write(imageBytes); err != nil {
				return "", nil, "", err
			}
		}
		if err := writer.Close(); err != nil {
			return "", nil, "", err
		}
		endpoint, err := joinURL(baseURL, "/images/edits")
		if err != nil {
			return "", nil, "", err
		}
		return endpoint, body.Bytes(), writer.FormDataContentType(), nil

	case profileOpenAIResponses:
		content := []map[string]any{
			{"type": "input_text", "text": req.Prompt},
		}
		for _, dataURL := range req.ImageInputs {
			content = append(content, map[string]any{
				"type":      "input_image",
				"image_url": dataURL,
			})
		}

		tool := map[string]any{"type": "image_generation"}
		if size != "" {
			tool["size"] = size
		}
		if req.Quality != "" {
			tool["quality"] = req.Quality
		}
		if req.Background != "" {
			tool["background"] = req.Background
		}
		if req.Format != "" {
			tool["format"] = req.Format
		}
		if count > 1 {
			tool["n"] = count
		}

		payload := map[string]any{
			"model": req.Model,
			"input": []map[string]any{
				{
					"role":    "user",
					"content": content,
				},
			},
			"tools":  []map[string]any{tool},
			"stream": false,
		}
		body, err := json.Marshal(payload)
		if err != nil {
			return "", nil, "", err
		}
		endpoint, err := joinURL(baseURL, "/responses")
		if err != nil {
			return "", nil, "", err
		}
		return endpoint, body, "application/json", nil

	default:
		return "", nil, "", fmt.Errorf("unsupported profile: %s", req.Profile)
	}
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
			if m := getStringField(errObj, "message", "detail", "error"); m != "" {
				return m
			}
		}
		if m := getStringField(payload, "message", "detail", "error"); m != "" {
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
