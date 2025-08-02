package utils

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

var Logger *log.Logger

func InitLogger() {
	Logger = log.New(os.Stdout, "[FINONE-SEARCH] ", log.LstdFlags|log.Lshortfile)
}

func LogInfo(msg string) {
	Logger.Printf("[INFO] %s", msg)
}

func LogError(msg string, err error) {
	if err != nil {
		Logger.Printf("[ERROR] %s: %v", msg, err)
	} else {
		Logger.Printf("[ERROR] %s", msg)
	}
}

func LogWarning(msg string) {
	Logger.Printf("[WARNING] %s", msg)
}

func LogDebug(msg string) {
	Logger.Printf("[DEBUG] %s", msg)
}

// GinLogger returns a gin.HandlerFunc (middleware) that logs requests using our custom logger
func GinLogger() gin.HandlerFunc {
	return gin.LoggerWithWriter(os.Stdout)
}

// Recovery middleware
func GinRecovery() gin.HandlerFunc {
	return gin.Recovery()
}
