# 🚀 High-Performance People Search System

A scalable, performant data ingestion and search system built to handle **100+ million rows** of people records from CSV using **ClickHouse** for blazing-fast queries and **PostgreSQL** for authentication, user management, and logging.

---

## 🧠 Use Case

We have a large dataset (100M+ records) representing individual profiles with fields like "mobile","name","fname","address","alt","circle","id","email"
- Perform **fast searches** (full or partial matches).
- Export filtered search results to CSV.
- Have **search usage tracking**, limits, and audit logging.
- Allow **admin-controlled user access** (demo or permanent users).
- Monitor daily logins, search frequency, and activity patterns.

---

## 🛠️ Tech Stack

| Layer       | Tool                      | Purpose                                  |
|------------|---------------------------|------------------------------------------|
| Backend    | Golang                    | API Server, Services                     |
| Database   | **ClickHouse**            | Primary for search, read-heavy ops       |
| Database   | **PostgreSQL**            | Auth, user mgmt, tracking, audit logs    |
| Queue      | Optional (e.g. Kafka)     | Async CSV ingestion (if needed)          |
| Deployment | Docker, Nginx, systemd    | Service control and reverse proxy        |

---

## 📁 Project Structure

.
├── cmd
│ └── main.go
├── config
│ └── config.yaml / .env
├── handlers
│ └── user.go
│ └── search.go
├── services
│ └── auth.go
│ └── csv_ingest.go
├── models
│ └── postgres_models.go
│ └── clickhouse_models.go
├── database
│ └── clickhouse.go
│ └── postgres.go
├── utils
│ └── csv.go
│ └── logger.go
├── migrations
│ └── schema.sql
├── README.md

markdown
Copy
Edit

---

## 🧩 Key Features

### 🔎 Search System
- **Fast search** via ClickHouse.
- Support for:
  - `mobile`, `name`, `fatherName`, `address`, `email`, `circle`
  - "Search within search"
  - AND/OR logic toggle
  - Partial + full match
- Search result limit (e.g. 10,000 rows max per query).
- Option to export search result as CSV.
- Admin view to see latest searches and results.

### 👤 User Management
- **Types**:
  - Demo (expire after X days)
  - Permanent
- Admins can:
  - View all users
  - Disable users (prevent login)
  - Set search/export limits
- User activity tracked:
  - Login time
  - Search terms
  - Export count
  - API usage per day

### 📄 CSV Ingestion
- Upload via admin panel or backend
- Ingests 100M+ rows into ClickHouse using:
  - `clickhouse-client`
  - Golang batch insert
- UUIDs assigned per row
- `master_id` from CSV retained

---

## 🗃️ ClickHouse Schema (Highly Optimized)

```sql
CREATE TABLE people
(
    id UUID DEFAULT generateUUIDv4(),   -- internal UUID
    master_id String,                   -- mapped from CSV "id"
    mobile String,
    name String,
    fname String,
    address String,
    alt String,
    circle String,
    email String,
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (mobile, name, master_id);

📥 CSV Field Mapping
CSV Field	ClickHouse Column

mobile	mobile-1
name	name -2
fname	fname-3
address	address-4
alt	alt-5
circle	circle-5
id	master_id-7
email	email-8 
✅ Notes:

phone is added as an alternate fast filter.

ORDER BY improves range scans and indexing.

Partial search done via LIKE/ILIKE or tokens.

🐘 PostgreSQL Schema
sql
Copy
Edit
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    user_type TEXT CHECK (user_type IN ('DEMO', 'PERMANENT')),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Login activity
CREATE TABLE logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    login_time TIMESTAMP DEFAULT now()
);

-- Search logs
CREATE TABLE searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    search_query TEXT,
    search_time TIMESTAMP DEFAULT now(),
    result_count INT
);

-- Export logs
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    exported_at TIMESTAMP DEFAULT now(),
    row_count INT
);
🔐 Authentication Flow
JWT-based login system.

Only active users with valid email/password and non-expired accounts can log in.

Middleware to validate JWT on all protected routes.

Admin UI can manage users (enable/disable, extend expiry).

🔍 Example API Endpoints
Method	Endpoint	Purpose
POST	/login	Login user and return JWT
POST	/search	Perform full-text search
GET	/me	Get current user info
POST	/export	Export last search to CSV
GET	/admin/users	List all users
PATCH	/admin/users/:id	Toggle active/inactive
POST	/admin/ingest	Upload new CSV and ingest

🧪 Search Logic Example
json
Copy
Edit
POST /search
{
  "query": "delhi",
  "fields": ["address", "circle"],
  "logic": "OR",
  "searchWithin": true
}
⏳ Limits and Throttling
Max searches per user/day: e.g. 500

Max CSV export per day: 3

Max rows per search: 10,000

Admins can adjust limits via dashboard

🚀 Performance Tips
Use ClickHouse INSERT INTO people FORMAT CSV for ingestion.

Use batch insert in Golang for ingestion in 1M+ chunks.

Index smartly in PostgreSQL.

Add logs and dashboards with tools like Grafana + Prometheus (optional).

Optionally add Redis caching for repeated search terms.

👨‍💻 Developer Setup
bash
Copy
Edit
# ClickHouse
docker run -d --name ch \
  -p 8123:8123 -p 9000:9000 \
  clickhouse/clickhouse-server

# PostgreSQL
docker run -d --name pg \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 postgres

# Golang Server
go run cmd/main.go
🧠 Summary
🔥 ClickHouse for ultra-fast analytics & filtering.

🐘 PostgreSQL for relational data, audit logs, and users.

🔒 Secure, scalable and audit-friendly.

💼 Suitable for enterprise-grade search systems.
