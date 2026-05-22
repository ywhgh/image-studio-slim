# Image Studio Prompt Library R2 Worker

This Worker stores prompt-library metadata and preview images in Cloudflare R2.
The browser talks only to this Worker; R2 credentials never go into frontend code.

## Setup

```powershell
cd D:\chatgpt-main-image-studio\workers\prompt-library-r2
npm install
npx wrangler login
npx wrangler r2 bucket create image-studio-prompts
npx wrangler secret put PROMPT_LIBRARY_TOKEN
npx wrangler deploy
```

Use the deployed Worker URL in the frontend:

```env
VITE_PROMPT_LIBRARY_API_BASE=https://image-studio-prompt-library.<your-subdomain>.workers.dev/api
VITE_PROMPT_LIBRARY_TOKEN=<same token you put into PROMPT_LIBRARY_TOKEN>
```

If `PROMPT_LIBRARY_TOKEN` is not set in the Worker, the API is open. For personal
or private deployments, set the token. For public multi-user deployments, add a
real login/auth layer instead of relying only on a frontend-visible token.
