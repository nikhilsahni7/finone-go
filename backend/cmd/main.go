package main

import (
	"fmt"
	"log"
	"os"

	"finone-search-system/config"
	"finone-search-system/database"
	"finone-search-system/handlers"
	"finone-search-system/middleware"
	"finone-search-system/services"
	"finone-search-system/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize logger
	utils.InitLogger()
	utils.LogInfo("Starting Finone Search System...")

	// Load configuration
	if err := config.LoadConfig(); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	utils.LogInfo("Configuration loaded successfully")

	// Initialize PostgreSQL connection
	if err := database.InitPostgres(); err != nil {
		log.Fatalf("Failed to initialize PostgreSQL: %v", err)
	}
	defer database.ClosePostgres()

	// Run PostgreSQL migrations
	if err := database.RunPostgresMigrations(); err != nil {
		log.Fatalf("Failed to run PostgreSQL migrations: %v", err)
	}

	// Initialize ClickHouse connection
	if err := database.InitClickHouse(); err != nil {
		log.Fatalf("Failed to initialize ClickHouse: %v", err)
	}
	defer database.CloseClickHouse()

	// Run ClickHouse migrations
	if err := database.RunClickHouseMigrations(); err != nil {
		log.Fatalf("Failed to run ClickHouse migrations: %v", err)
	}

	// Start the daily reset scheduler
	utils.LogInfo("Starting background schedulers...")
	schedulerService := services.NewSchedulerService()
	schedulerService.StartDailyResetScheduler()
	schedulerService.StartWeeklyCleanup()
	utils.LogInfo("Background schedulers started successfully")

	// Setup Gin router
	router := setupRouter()

	// Start server
	serverAddr := fmt.Sprintf("%s:%d", config.AppConfig.Server.Host, config.AppConfig.Server.Port)
	utils.LogInfo(fmt.Sprintf("Server starting on %s", serverAddr))

	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func setupRouter() *gin.Engine {
	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Global middleware
	router.Use(utils.GinLogger())
	router.Use(utils.GinRecovery())
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.RateLimitMiddleware())

	// Initialize handlers
	userHandler := handlers.NewUserHandler()
	searchHandler := handlers.NewSearchHandler()
	registrationHandler := handlers.NewRegistrationHandler()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		// Check database connections
		pgErr := database.PostgresHealthCheck()
		chErr := database.ClickHouseHealthCheck()

		status := "healthy"
		if pgErr != nil || chErr != nil {
			status = "unhealthy"
		}

		c.JSON(200, gin.H{
			"status":     status,
			"postgresql": pgErr == nil,
			"clickhouse": chErr == nil,
		})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Public routes (no authentication required)
		auth := api.Group("/auth")
		{
			auth.POST("/login", userHandler.Login)
		}

		// Public registration endpoint
		api.POST("/register", registrationHandler.CreateRegistrationRequest)

		// Protected routes (authentication required)
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// User routes
			users := protected.Group("/users")
			{
				users.GET("/profile", userHandler.GetProfile)
				users.GET("/analytics", userHandler.GetMyAnalytics)
				users.POST("/logout", userHandler.Logout)
			}

			// Search routes
			search := protected.Group("/search")
			{
				search.POST("/", searchHandler.Search)
				search.POST("/within", searchHandler.SearchWithin)
				search.GET("/person/:id", searchHandler.GetPerson)
				search.GET("/stats", searchHandler.GetStats)
				search.POST("/export", searchHandler.ExportSearchResults)
			}

			// Admin only routes
			admin := protected.Group("/admin")
			admin.Use(middleware.AdminMiddleware())
			{
				// User management
				admin.POST("/users", userHandler.CreateUser)
				admin.GET("/users", userHandler.GetUsers)
				admin.GET("/users/:id", userHandler.GetUser)
				admin.PUT("/users/:id", userHandler.UpdateUser)
				admin.DELETE("/users/:id", userHandler.DeleteUser)
				admin.GET("/analytics", userHandler.GetUserAnalytics)

				// Registration request management
				admin.GET("/registration-requests", registrationHandler.GetRegistrationRequests)
				admin.GET("/registration-requests/:id", registrationHandler.GetRegistrationRequest)
				admin.PUT("/registration-requests/:id", registrationHandler.UpdateRegistrationRequest)
				admin.DELETE("/registration-requests/:id", registrationHandler.DeleteRegistrationRequest)

				// Session management
				admin.GET("/sessions", userHandler.GetAllActiveSessions)
				admin.GET("/users/:id/sessions", userHandler.GetUserSessions)
				admin.DELETE("/users/:id/sessions", userHandler.InvalidateUserSessions)
				admin.POST("/sessions/cleanup", userHandler.CleanupExpiredSessions)

				// User search history
				admin.GET("/users/:id/search-history", userHandler.GetUserSearchHistory)

				// Daily reset management
				admin.POST("/reset/daily-search-counts", userHandler.ResetDailySearchCounts)
				admin.GET("/reset/next-reset-time", userHandler.GetNextResetTime)

				// CSV import
				admin.POST("/import/csv", searchHandler.ImportCSV)
				admin.POST("/import/csv-path", searchHandler.ImportCSVFromPath)
			}
		}
	}

	// Serve static files (for file downloads)
	router.Static("/downloads", "./downloads")

	return router
}
