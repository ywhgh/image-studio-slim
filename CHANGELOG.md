# Changelog

## v1.3.2 - 2026-05-29

Patch release for Grok image generation, local history, and Image Studio UI polish:

- Added a dedicated Grok image protocol for official xAI `/images` endpoints and Grok2API-style OpenAI-compatible relays.
- Improved upstream model probing so Grok first tries `/image-generation-models` and automatically falls back to `/models` for compatible relays.
- Added Grok image request variants for official xAI JSON payloads and OpenAI-compatible fallback payloads.
- Improved local history persistence, source statistics, recent prompt/parameter restore, and compact scrolling history display.
- Improved prompt-helper model configuration, probing, and fetch error handling.
- Fixed night-mode colors, global radius coverage, history/workbench card texture, image preview cropping, and hover action behavior.
- Added API channel presets and workspace identity controls for switching between multiple upstream URLs and keys.

Validation:

- `pnpm -s typecheck`
- `go test -count=1 .`

## v1.3.1 - 2026-05-23

Patch release for native 4K generation, workspace layout, and local result recovery:

- Added a separate native 4K generation option based on the `gpt_image_playground` size-budget logic.
- Improved Image Studio history cards, hidden-scroll history/workbench browsing, and avatar-hosted update notes.
- Fixed generated `blob:` images failing to download by resolving local browser URLs before falling back to backend download.
- Fixed oversized local history records by avoiding duplicated `data:` / `blob:` URLs in IndexedDB payloads.
- Improved IndexedDB save completion handling so history writes only succeed after the transaction completes.

Validation:

- `pnpm typecheck`
- `pnpm build`

## v1.3.0 - 2026-05-23

Feature release for prompt-library storage, relay compatibility, and generation reliability:

- Added a Cloudflare R2 Worker for prompt-library metadata and preview-image storage without exposing R2 credentials in the frontend.
- Added editable custom prompt templates, including title, category, description, prompt text, and preview image updates while built-in templates remain read-only.
- Added an in-app release badge so the Image Studio header shows the current version and update notes.
- Restored 4K presets to the pre-upscale long-edge behavior, generating dimensions by aspect ratio from a 3840px long edge.
- Improved image-to-image prompt handling to better preserve the reference subject, pose, camera angle, and composition.
- Improved local history resilience so completed images remain available in the current session when browser persistent storage fails.
- Improved Sub2API and external relay probing, upstream error messages, and OpenAI-compatible image request handling.

Validation:

- `pnpm -s typecheck`
- `go test ./...`

## v1.2.1 - 2026-05-16

Patch release for image-to-image generation stability:

- Fixed reference images with `application/octet-stream` data URLs by normalizing them back to real `image/*` MIME types on both frontend and backend.
- Fixed OpenAI-compatible `/images/edits` multipart uploads by writing an explicit image `Content-Type` for each reference image part.
- Expanded image-to-image compatibility for OpenAI image, chatgpt2api, and chat-completions-style relay paths with multiple accepted reference-image payload shapes.
- Improved browser-direct fallback so CORS/network failures automatically fall back to the backend asynchronous queue.
- Clamped browser-direct over-returned image results to the requested count, matching backend queue behavior.

Validation:

- `pnpm -s typecheck`
- `go test ./...`

## v1.2.0 - 2026-05-16

Compared with v1.1.0, this release focuses on the Image Studio workflow:

- Reworked local history cards with a glass layout, 2:3 cropped previews, richer generation metadata, seed copy, and a guarded clear-history action.
- Added prompt library and prompt preview workspace improvements for saving reusable prompts with local preview images.
- Added current-site `chatgpt2api` mode with `/v1` proxy support, image quota probing, and model detection.
- Forced external relay generation through the asynchronous job queue for both single and batch generations, including visible queued/running progress.
- Added seed passthrough, requested-size metadata, duration, quality, background, format, style, and current-site profile persistence in history.
- Improved relay/backend logging for queued jobs, upstream attempts, result counts, clamped over-returned results, download dimensions, and upstream errors.
- Added `chatgpt2api` support to the backend OpenAI-compatible image path.
- Added download dimension detection so tests can distinguish native upstream resolution from locally upscaled output.

Validation:

- `pnpm -s typecheck`
- `go test ./...`
