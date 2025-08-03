package middleware

import (
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()

	// Get frontend URL from environment variable
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		// Default for development
		frontendURL = "http://localhost:3000"
	}

	// Support multiple frontend URLs (comma-separated)
	allowedOrigins := strings.Split(frontendURL, ",")
	for i, origin := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(origin)
	}

	// Add common production domains if not explicitly set
	if frontendURL == "http://localhost:3000" {
		// If only default is set, add production domains
		allowedOrigins = append(allowedOrigins,
			
		"https://finoneweb.nikhilsahni.xyz",
			"https://finone.nikhilsahni.xyz",
		)
	}

	config.AllowOrigins = allowedOrigins
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{
		"Origin",
		"Content-Type",
		"Accept",
		"Authorization",
		"X-Requested-With",
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Methods",
	}
	config.AllowCredentials = true
	config.ExposeHeaders = []string{
		"Content-Length",
		"Content-Type",
		"Content-Disposition",
	}

	return cors.New(config)
}
