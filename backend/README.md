# Finone High-Performance People Search System

A high-performance people search system built with Golang, designed to handle 100+ million records efficiently using ClickHouse for search operations and PostgreSQL for user management.

## 🚀 Features

- **High-Performance Search**: ClickHouse-powered search engine for 100M+ records
- **User Management**: JWT-based authentication with PostgreSQL
- **CSV Import**: Efficient batch processing for large CSV files (15GB+)
- **Admin Panel**: User management and system monitoring
- **Rate Limiting**: Configurable search and export limits
- **Real-time Stats**: Search performance metrics and analytics

## 🏗️ Architecture

- **Backend**: Golang with Gin web framework
- **Search Database**: ClickHouse (optimized for read-heavy operations)
- **User Database**: PostgreSQL (ACID compliance for user data)
- **Authentication**: JWT tokens with role-based access control
- **File Processing**: Streaming CSV processor for large files

## 📁 Project Structure

```
finone-search-system/
├── cmd/
│   └── main.go                 # Application entry point
├── config/
│   ├── config.go               # Configuration management
│   └── config.yaml             # Default configuration
├── database/
│   ├── postgres.go             # PostgreSQL connection
│   └── clickhouse.go           # ClickHouse connection
├── handlers/
│   ├── user.go                 # User management endpoints
│   └── search.go               # Search endpoints
├── middleware/
│   └── auth.go                 # Authentication middleware
├── models/
│   ├── postgres_models.go      # PostgreSQL models
│   └── clickhouse_models.go    # ClickHouse models
├── services/
│   ├── auth.go                 # Authentication service
│   └── search.go               # Search service
├── utils/
│   ├── logger.go               # Logging utilities
│   └── csv.go                  # CSV processing utilities
├── migrations/
│   ├── 001_postgres_schema.sql # PostgreSQL schema
│   └── 002_clickhouse_schema.sql # ClickHouse schema
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

1. **Go 1.21+**
2. **PostgreSQL 13+**
3. **ClickHouse 23.3+**

### Database Setup

1. **PostgreSQL Setup**:
```bash
# Create database
createdb finone_search

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'secret';"
```

2. **ClickHouse Setup**:
```bash
# Start ClickHouse (if using Docker)
docker run -d --name clickhouse-server -p 9000:9000 -p 8123:8123 clickhouse/clickhouse-server

# Or install ClickHouse locally
sudo apt-get install -y clickhouse-server clickhouse-client
sudo systemctl start clickhouse-server
```

### Application Setup

1. **Clone and build**:
```bash
cd /path/to/finone-go/backend
go mod tidy
go build -o finone-search ./cmd/main.go
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Run the application**:
```bash
./finone-search
```

The server will start on `http://localhost:8080`

## 📝 API Documentation

### Authentication

#### Login
```bash
POST /api/v1/auth/login
{
  "email": "admin@finone.com",
  "password": "admin123"
}
```

### Search Operations

#### Search People
```bash
POST /api/v1/search/
Authorization: Bearer <token>
{
  "query": "john",
  "fields": ["name", "mobile"],
  "logic": "OR",
  "match_type": "partial",
  "limit": 1000
}
```

#### Get Search Statistics
```bash
GET /api/v1/search/stats
Authorization: Bearer <token>
```

### Admin Operations

#### Import CSV
```bash
POST /api/v1/admin/import/csv
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form data:
- csv_file: <file>
- batch_size: 100000
- has_header: true
```

#### Create User
```bash
POST /api/v1/admin/users
Authorization: Bearer <admin_token>
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "user_type": "PERMANENT",
  "role": "USER"
}
```

## 📊 CSV Import Process

To import your 15GB CSV file (`delhi_inventory_clean.csv`):

1. **Prepare the file**: Ensure it's in the Downloads folder
2. **Start the import**:
```bash
curl -X POST http://localhost:8080/api/v1/admin/import/csv \
  -H "Authorization: Bearer <admin_token>" \
  -F "csv_file=@/home/nikhil-sahni/Downloads/delhi_inventory_clean.csv" \
  -F "batch_size=100000" \
  -F "has_header=true"
```

### Expected CSV Format

The system expects the following column order:
1. mobile
2. name
3. fname (father's name)
4. address
5. alt (alternative contact)
6. circle
7. id (original ID, stored as master_id)
8. email

## 🔧 Configuration

### Environment Variables

- `SERVER_PORT`: Server port (default: 8080)
- `POSTGRES_HOST`: PostgreSQL host
- `POSTGRES_PASSWORD`: PostgreSQL password
- `CLICKHOUSE_HOST`: ClickHouse host
- `JWT_SECRET`: JWT signing secret
- `CSV_BATCH_SIZE`: Batch size for CSV import

### Performance Tuning

1. **ClickHouse Optimization**:
   - Increase `max_memory_usage` for large imports
   - Tune `merge_tree` settings for your data size
   - Use SSD storage for better performance

2. **PostgreSQL Optimization**:
   - Increase `shared_buffers` and `work_mem`
   - Configure connection pooling

3. **Application Optimization**:
   - Adjust CSV batch size based on memory
   - Use multiple workers for parallel processing

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod tidy && go build -o finone-search ./cmd/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/finone-search .
COPY --from=builder /app/config ./config
COPY --from=builder /app/migrations ./migrations
CMD ["./finone-search"]
```

### systemd Service

```ini
[Unit]
Description=Finone Search System
After=network.target

[Service]
Type=simple
User=finone
WorkingDirectory=/opt/finone-search
ExecStart=/opt/finone-search/finone-search
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 📈 Monitoring

### Health Check
```bash
GET /health
```

### Metrics
- Search response times
- Database connection status
- Import progress tracking
- User activity logs

## 🔒 Security

- JWT token authentication
- Role-based access control (USER/ADMIN)
- Rate limiting on API endpoints
- SQL injection protection
- Password hashing with bcrypt

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the logs: `tail -f /var/log/finone-search.log`
2. Verify database connections
3. Check CSV file format
4. Review configuration settings
