# Quran Progress Tracker

Vanilla JS SPA + Express REST API + PostgreSQL for tracking Quran reading progress across admin, teacher, and student roles.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Quick start

1. Copy environment variables (already provided as `.env` for local dev):

   ```bash
   cp .env.example .env
   ```

2. Start all services:

   ```bash
   docker compose up --build
   ```

3. Open [http://localhost:3000](http://localhost:3000)

   Default admin credentials (after Phase 1 migrations): `admin` / value of `ADMIN_PASSWORD` in `.env`.

## Project structure

```
quran-tracker/
├── docker-compose.yml    # PostgreSQL + backend
├── .env.example          # Environment template
├── backend/              # Node.js Express API
└── frontend/             # Vanilla JS SPA (served as static files)
```

## Development

- **Backend API**: `http://localhost:3000/api/v1`
- **Health check**: `GET /api/v1/health`
- **Timezone**: `Asia/Bishkek` (configured via `TZ`)
- **Frontend**: hash-based routing (`#/login`, `#/admin`, etc.)

## Render deployment

This repository includes `render.yaml` for Render Blueprint deployment.

1. Push this repository to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Select this repository.
4. Fill the required environment variables shown in `RENDER_DEPLOY_GUIDE.txt`.
5. Use the generated HTTPS Render URL for Telegram Mini App.

### Local backend (without Docker)

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Set `DATABASE_URL` to point at a running PostgreSQL instance.

## Environment variables

See `.env.example` for all options. Key variables:

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seed admin account |
| `TZ` | Timezone for "today" logic (`Asia/Bishkek`) |
