# Frontend

React/Vite app for the Rmcluster UI.

## Start

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`

The dev server proxies API calls to `http://127.0.0.1:4917`.

## API contract

- `GET /api/ui/models`
- `GET /api/ui/models/search?q=...`
- `POST /api/ui/models/hf`
- `POST /api/ui/models/local`
- `GET /api/ui/dashboard`
