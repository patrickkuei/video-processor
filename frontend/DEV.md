Frontend (Vite + React) — MVP

Scripts
- npm run dev: Start dev server
- npm run build: Build production bundle
- npm run preview: Preview production build

Env
- Dev server proxies /upload-url and /jobs to http://localhost:8787.
- No env needed for dev if your worker runs on 8787.
- For non-dev (or different origin), copy .env.example to .env and set VITE_API_BASE.

API Endpoints (expected)
- POST /upload-url → { uploadUrl, fileUrl }
- POST /jobs → { id, status }
- GET /jobs/:id → { id, status, result_url?, error? }

User Flow
1) Select .mp4/.mov (<100MB)
2) POST /upload-url to get signed URL
3) PUT file to uploadUrl
4) POST /jobs with fileUrl
5) Redirect to /jobs/:id and poll every 3s
