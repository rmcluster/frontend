# Frontend

React/Vite app for the Rmcluster UI.

## Start

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`

The dev server proxies API calls to `http://127.0.0.1:4917`.

## API contract

Canonical OpenAPI spec: `../server/openapi/ui-api.yaml`

Current frontend scope (leaderboard excluded):

- `GET /api/ui`
- `GET /api/ui/connect-info`
- `POST /api/v1/devices/register`
- `POST /api/v1/devices/{device_id}/keepalive`
- `GET /api/ui/dashboard`
- `GET /api/ui/models`
- `GET /api/ui/models/search?q=...`
- `POST /api/ui/models/hf`
- `POST /api/ui/models/local`
- `POST /v1/chat/completions`
- `POST /api/ui/chats` (chat initiated)
- `POST /api/ui/chats/{chat_id}/events` (messages sent/received)
- `GET /api/ui/chats/{chat_id}`
