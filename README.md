# FinOne – High-Performance People Search (Go + Next.js)

A high‑performance people search system built to handle 500M+ records with low latency. The backend uses Go (Gin) with ClickHouse for search and PostgreSQL for user/auth. The frontend is a modern Next.js app for user and admin workflows.

- GitHub: [`nikhilsahni7/finone-go`](https://github.com/nikhilsahni7/finone-go)

## Monorepo Layout

```
finone-go/
├─ backend/               # Go + Gin API, DBs, migrations, services
│  ├─ cmd/main.go         # Server entrypoint
│  ├─ config/             # YAML + env-based configuration
│  ├─ database/           # Postgres & ClickHouse clients, migrations
│  ├─ handlers/           # HTTP handlers (auth, users, search, admin)
│  ├─ middleware/         # Auth, rate-limiting, CORS
│  ├─ models/             # DB models
│  ├─ services/           # business logic
│  ├─ tests/              # API/system test scripts
│  └─ README.md           # Backend-specific docs
└─ frontend/              # Next.js 14 app (user/admin portals)
   ├─ app/                # App Router pages
   ├─ components/         # UI & feature components
   ├─ lib/                # API clients, auth context
   └─ package.json        # Frontend scripts/deps
```

## Features

- High‑throughput search on 500M+ rows (ClickHouse)
- Secure user management and JWT auth (PostgreSQL)
- Role-based access control (User/Admin)
- CSV import with large batch processing
- Search analytics, usage limits, export to CSV
- Modern, responsive UI (Next.js + Tailwind)

## Tech Stack

- Backend: Go (Gin), ClickHouse, PostgreSQL
- Frontend: Next.js 14 (React 18, App Router), TailwindCSS, Radix UI

## Prerequisites

- Go 1.21+ (module name: `finone-search-system`)
- Node.js 18+ and pnpm (recommended) or npm/yarn
- PostgreSQL 13+
- ClickHouse 23.3+

## Quickstart

### 1) Clone

```bash
git clone https://github.com/nikhilsahni7/finone-go.git
cd finone-go
```

### 2) Backend (API)

```bash
cd backend
# Install deps
go mod tidy

# Configure
# Option A: Edit config/config.yaml (default server port is 8082)
# Option B: Use environment variables (see Configuration below)

# Run
go run ./cmd/main.go
# or build
# go build -o finone-search ./cmd/main.go && ./finone-search
```

- Health check: `GET http://localhost:8082/health`
- API base: `http://localhost:8082/api/v1`

For endpoints, CSV import, admin actions, and deployment, see `backend/README.md`.

### 3) Frontend (Next.js)

```bash
cd frontend
pnpm install # or npm install / yarn
pnpm dev     # or npm run dev / yarn dev
```

- Dev server: `http://localhost:3000`
- User portal: `http://localhost:3000/user/login`
- Admin pages: `http://localhost:3000/admin/login` and `http://localhost:3000/admin/dashboard`

The frontend expects the backend to be running and accessible. If you’re proxying or deploying separately, ensure the frontend API base URL matches your backend.

## Configuration

Configuration loads from `config/config.yaml` first, then environment variables override values.

Key environment variables (override any of these):

- Server
  - `SERVER_PORT` (default 8082 via YAML)
  - `SERVER_HOST` (default `0.0.0.0`)
  - `SERVER_TIMEOUT` (seconds)
- PostgreSQL
  - `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - `POSTGRES_DB`, `POSTGRES_SSLMODE`
- ClickHouse
  - `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DB`
- Auth
  - `JWT_SECRET`, `JWT_EXPIRY_HOURS`
- Limits
  - `MAX_SEARCHES_PER_DAY`, `MAX_EXPORTS_PER_DAY`, `MAX_ROWS_PER_SEARCH`, `MAX_UPLOAD_SIZE`
- CSV
  - `CSV_BATCH_SIZE`, `CSV_TEMP_DIR`

Tip: Do not commit secrets. Prefer environment variables in production.

## Database & Migrations

Migrations are auto-run at startup for both PostgreSQL and ClickHouse using the SQL files in `backend/migrations/`.

Ensure both databases are reachable before starting the API. Example (Docker for ClickHouse):

```bash
docker run -d --name clickhouse -p 9000:9000 -p 8123:8123 clickhouse/clickhouse-server
```

## Testing

There are end-to-end/system scripts in `backend/tests/`.

```bash
cd backend/tests
bash test_search.sh
bash test_auth_system.sh
bash final_comprehensive_test.sh
```

See test READMEs and scripts for details and prerequisites.

## Production

- Reverse proxy (e.g., Nginx) in front of the Go server
- Set secure `JWT_SECRET` and database credentials via environment variables
- Consider Docker or systemd for process management
- See `backend/README.md` for Dockerfile and systemd examples

## Contributing

- Fork, branch, implement, test, and open a PR

## License

MIT (see repository for license details)
