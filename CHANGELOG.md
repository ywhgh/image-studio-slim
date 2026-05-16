# Changelog

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
