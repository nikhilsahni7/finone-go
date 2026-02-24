package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Server     ServerConfig     `yaml:"server"`
	Database   DatabaseConfig   `yaml:"database"`
	JWT        JWTConfig        `yaml:"jwt"`
	Limits     LimitsConfig     `yaml:"limits"`
	CSV        CSVConfig        `yaml:"csv"`
	OpenSearch OpenSearchConfig `yaml:"opensearch"`
}

type ServerConfig struct {
	Port    int           `yaml:"port"`
	Host    string        `yaml:"host"`
	Timeout time.Duration `yaml:"timeout"`
}

type DatabaseConfig struct {
	Postgres PostgresConfig `yaml:"postgres"`
}

type PostgresConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
	SSLMode  string `yaml:"sslmode"`
}

type OpenSearchConfig struct {
	Endpoint   string   `yaml:"endpoint"`
	Index      string   `yaml:"index"`
	Indices    []string `yaml:"indices"`
	MasterUser string   `yaml:"master_user"`
	MasterPass string   `yaml:"master_pass"`
}

type JWTConfig struct {
	Secret string        `yaml:"secret"`
	Expiry time.Duration `yaml:"expiry"`
}

type LimitsConfig struct {
	MaxSearchesPerDay int    `yaml:"max_searches_per_day"`
	MaxExportsPerDay  int    `yaml:"max_exports_per_day"`
	MaxRowsPerSearch  int    `yaml:"max_rows_per_search"`
	MaxUploadSize     string `yaml:"max_upload_size"`
}

type CSVConfig struct {
	BatchSize int    `yaml:"batch_size"`
	TempDir   string `yaml:"temp_dir"`
}

var AppConfig *Config

func LoadConfig() error {
	config := &Config{}

	// Load .env file if present (sets OS env vars)
	loadDotEnv()

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

// loadDotEnv reads a .env file and sets the key=value pairs as environment variables.
// It tries several candidate paths relative to the working directory.
func loadDotEnv() {
	candidates := []string{".env", "../.env", "../../.env"}
	if envPath := os.Getenv("ENV_FILE"); envPath != "" {
		candidates = append([]string{envPath}, candidates...)
	}

	for _, path := range candidates {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			eqIdx := strings.Index(line, "=")
			if eqIdx < 0 {
				continue
			}
			key := strings.TrimSpace(line[:eqIdx])
			value := strings.TrimSpace(line[eqIdx+1:])
			// Strip surrounding quotes if present
			if len(value) >= 2 && ((value[0] == '"' && value[len(value)-1] == '"') || (value[0] == '\'' && value[len(value)-1] == '\'')) {
				value = value[1 : len(value)-1]
			}
			// Only set if not already set in real env (real env takes precedence)
			if os.Getenv(key) == "" {
				os.Setenv(key, value)
			}
		}
		break // Only load from the first file found
	}
}

func loadFromYAML(config *Config) error {
	// Allow overriding the config file path via env var
	candidatePaths := []string{}
	if envPath := os.Getenv("CONFIG_PATH"); envPath != "" {
		candidatePaths = append(candidatePaths, envPath)
	}

	// Try common relative locations based on typical run directories
	candidatePaths = append(candidatePaths,
		"config/config.yaml",       // repo root or backend/
		"../config/config.yaml",    // e.g., running from backend/cmd
		"../../config/config.yaml", // deeper nested run directories
	)

	var lastErr error
	for _, p := range candidatePaths {
		file, err := os.Open(p)
		if err != nil {
			lastErr = err
			continue
		}
		defer file.Close()

		decoder := yaml.NewDecoder(file)
		if err := decoder.Decode(config); err != nil {
			lastErr = err
			continue
		}
		return nil
	}

	if lastErr != nil {
		return lastErr
	}
	return fmt.Errorf("config file not found in candidate paths")
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

	// OpenSearch config from env
	config.OpenSearch.Endpoint = getEnv("OPENSEARCH_ENDPOINT", "")
	config.OpenSearch.Index = getEnv("OPENSEARCH_INDEX", "")
	config.OpenSearch.MasterUser = getEnv("OPENSEARCH_MASTER_USER", "")
	config.OpenSearch.MasterPass = getEnv("OPENSEARCH_MASTER_PASSWORD", "")

	indicesStr := getEnv("OPENSEARCH_INDICES", "")
	if indicesStr != "" {
		for _, idx := range strings.Split(indicesStr, ",") {
			if trimmed := strings.TrimSpace(idx); trimmed != "" {
				config.OpenSearch.Indices = append(config.OpenSearch.Indices, trimmed)
			}
		}
	}
	if len(config.OpenSearch.Indices) == 0 && config.OpenSearch.Index != "" {
		config.OpenSearch.Indices = []string{config.OpenSearch.Index}
	}

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

	// PostgreSQL env overrides
	if v := os.Getenv("POSTGRES_HOST"); v != "" {
		config.Database.Postgres.Host = v
	}
	if v := os.Getenv("POSTGRES_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			config.Database.Postgres.Port = p
		}
	}
	if v := os.Getenv("POSTGRES_USER"); v != "" {
		config.Database.Postgres.User = v
	}
	if v := os.Getenv("POSTGRES_PASSWORD"); v != "" {
		config.Database.Postgres.Password = v
	}
	if v := os.Getenv("POSTGRES_DB"); v != "" {
		config.Database.Postgres.DBName = v
	}
	if v := os.Getenv("POSTGRES_SSLMODE"); v != "" {
		config.Database.Postgres.SSLMode = v
	}

	// JWT env overrides
	if v := os.Getenv("JWT_SECRET"); v != "" {
		config.JWT.Secret = v
	}

	// OpenSearch env overrides
	if v := os.Getenv("OPENSEARCH_ENDPOINT"); v != "" {
		config.OpenSearch.Endpoint = v
	}
	if v := os.Getenv("OPENSEARCH_INDEX"); v != "" {
		config.OpenSearch.Index = v
	}
	if v := os.Getenv("OPENSEARCH_MASTER_USER"); v != "" {
		config.OpenSearch.MasterUser = v
	}
	if v := os.Getenv("OPENSEARCH_MASTER_PASSWORD"); v != "" {
		config.OpenSearch.MasterPass = v
	}
	if v := os.Getenv("OPENSEARCH_INDICES"); v != "" {
		config.OpenSearch.Indices = nil
		for _, idx := range strings.Split(v, ",") {
			if trimmed := strings.TrimSpace(idx); trimmed != "" {
				config.OpenSearch.Indices = append(config.OpenSearch.Indices, trimmed)
			}
		}
	}
	if len(config.OpenSearch.Indices) == 0 && config.OpenSearch.Index != "" {
		config.OpenSearch.Indices = []string{config.OpenSearch.Index}
	}
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

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		switch value {
		case "1", "true", "TRUE", "True":
			return true
		case "0", "false", "FALSE", "False":
			return false
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
