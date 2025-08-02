package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	JWT      JWTConfig      `yaml:"jwt"`
	Limits   LimitsConfig   `yaml:"limits"`
	CSV      CSVConfig      `yaml:"csv"`
}

type ServerConfig struct {
	Port    int           `yaml:"port"`
	Host    string        `yaml:"host"`
	Timeout time.Duration `yaml:"timeout"`
}

type DatabaseConfig struct {
	Postgres   PostgresConfig   `yaml:"postgres"`
	ClickHouse ClickHouseConfig `yaml:"clickhouse"`
}

type PostgresConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
	SSLMode  string `yaml:"sslmode"`
}

type ClickHouseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	Database string `yaml:"database"`
}

type JWTConfig struct {
	Secret string        `yaml:"secret"`
	Expiry time.Duration `yaml:"expiry"`
}

type LimitsConfig struct {
	MaxSearchesPerDay  int    `yaml:"max_searches_per_day"`
	MaxExportsPerDay   int    `yaml:"max_exports_per_day"`
	MaxRowsPerSearch   int    `yaml:"max_rows_per_search"`
	MaxUploadSize      string `yaml:"max_upload_size"`
}

type CSVConfig struct {
	BatchSize int    `yaml:"batch_size"`
	TempDir   string `yaml:"temp_dir"`
}

var AppConfig *Config

func LoadConfig() error {
	config := &Config{}

	// Try to load from YAML file first
	if err := loadFromYAML(config); err != nil {
		// If YAML fails, load from environment variables
		loadFromEnv(config)
	}

	// Override with environment variables if they exist
	overrideWithEnv(config)

	AppConfig = config
	return nil
}

func loadFromYAML(config *Config) error {
	file, err := os.Open("config/config.yaml")
	if err != nil {
		return err
	}
	defer file.Close()

	decoder := yaml.NewDecoder(file)
	return decoder.Decode(config)
}

func loadFromEnv(config *Config) {
	config.Server.Port = getEnvAsInt("SERVER_PORT", 8080)
	config.Server.Host = getEnv("SERVER_HOST", "0.0.0.0")
	config.Server.Timeout = time.Duration(getEnvAsInt("SERVER_TIMEOUT", 30)) * time.Second

	config.Database.Postgres.Host = getEnv("POSTGRES_HOST", "localhost")
	config.Database.Postgres.Port = getEnvAsInt("POSTGRES_PORT", 5432)
	config.Database.Postgres.User = getEnv("POSTGRES_USER", "postgres")
	config.Database.Postgres.Password = getEnv("POSTGRES_PASSWORD", "secret")
	config.Database.Postgres.DBName = getEnv("POSTGRES_DB", "finone_search")
	config.Database.Postgres.SSLMode = getEnv("POSTGRES_SSLMODE", "disable")

	config.Database.ClickHouse.Host = getEnv("CLICKHOUSE_HOST", "localhost")
	config.Database.ClickHouse.Port = getEnvAsInt("CLICKHOUSE_PORT", 9000)
	config.Database.ClickHouse.User = getEnv("CLICKHOUSE_USER", "default")
	config.Database.ClickHouse.Password = getEnv("CLICKHOUSE_PASSWORD", "")
	config.Database.ClickHouse.Database = getEnv("CLICKHOUSE_DB", "finone_search")

	config.JWT.Secret = getEnv("JWT_SECRET", "your-super-secret-key-change-in-production")
	config.JWT.Expiry = time.Duration(getEnvAsInt("JWT_EXPIRY_HOURS", 24)) * time.Hour

	config.Limits.MaxSearchesPerDay = getEnvAsInt("MAX_SEARCHES_PER_DAY", 500)
	config.Limits.MaxExportsPerDay = getEnvAsInt("MAX_EXPORTS_PER_DAY", 3)
	config.Limits.MaxRowsPerSearch = getEnvAsInt("MAX_ROWS_PER_SEARCH", 10000)
	config.Limits.MaxUploadSize = getEnv("MAX_UPLOAD_SIZE", "2GB")

	config.CSV.BatchSize = getEnvAsInt("CSV_BATCH_SIZE", 100000)
	config.CSV.TempDir = getEnv("CSV_TEMP_DIR", "/tmp/csv_uploads")
}

func overrideWithEnv(config *Config) {
	if port := os.Getenv("SERVER_PORT"); port != "" {
		if p, err := strconv.Atoi(port); err == nil {
			config.Server.Port = p
		}
	}
	// Add more overrides as needed
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func (c *Config) GetPostgresConnectionString() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Postgres.Host,
		c.Database.Postgres.Port,
		c.Database.Postgres.User,
		c.Database.Postgres.Password,
		c.Database.Postgres.DBName,
		c.Database.Postgres.SSLMode,
	)
}

func (c *Config) GetClickHouseConnectionString() string {
	connectionStr := fmt.Sprintf("tcp://%s:%d?database=%s&username=%s",
		c.Database.ClickHouse.Host,
		c.Database.ClickHouse.Port,
		c.Database.ClickHouse.Database,
		c.Database.ClickHouse.User,
	)
	
	if c.Database.ClickHouse.Password != "" {
		connectionStr += "&password=" + c.Database.ClickHouse.Password
	}
	
	return connectionStr
}
