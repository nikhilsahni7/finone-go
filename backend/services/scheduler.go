package services

import (
	"finone-search-system/database"
	"finone-search-system/utils"
	"fmt"
	"time"
)

type SchedulerService struct{}

func NewSchedulerService() *SchedulerService {
	return &SchedulerService{}
}

// StartDailyResetScheduler starts a background goroutine that resets search counts at 12 AM IST daily
func (s *SchedulerService) StartDailyResetScheduler() {
	utils.LogInfo("Starting daily search count reset scheduler...")

	go func() {
		for {
			// Calculate next 12 AM IST
			nextMidnight := s.getNextMidnightIST()

			// Calculate duration until next midnight
			duration := time.Until(nextMidnight)
			utils.LogInfo(fmt.Sprintf("Next search count reset scheduled at: %s (in %v)",
				nextMidnight.Format("2006-01-02 15:04:05 IST"), duration))

			// Sleep until midnight
			time.Sleep(duration)

			// Reset search counts
			s.resetDailySearchCounts()
		}
	}()
}

// getNextMidnightIST calculates the next 12:00 AM IST
func (s *SchedulerService) getNextMidnightIST() time.Time {
	// Get current time in IST (UTC + 5:30)
	istLocation := time.FixedZone("IST", 5*3600+30*60)
	now := time.Now().In(istLocation)

	// Calculate next midnight in IST
	nextMidnight := time.Date(
		now.Year(), now.Month(), now.Day()+1,
		0, 0, 0, 0, // 12:00:00 AM
		istLocation,
	)

	return nextMidnight
}

// resetDailySearchCounts resets all users' daily search counts to 0
func (s *SchedulerService) resetDailySearchCounts() {
	utils.LogInfo("🕛 Starting daily search count reset at 12 AM IST...")

	// Get current IST date
	istLocation := time.FixedZone("IST", 5*3600+30*60)
	today := time.Now().In(istLocation).Format("2006-01-02")

	// Option 1: Delete all daily_usage records for today
	// This ensures clean start with 0 counts
	deleteQuery := `DELETE FROM daily_usage WHERE date = $1`

	result, err := database.PostgresDB.Exec(deleteQuery, today)
	if err != nil {
		utils.LogError("Failed to reset daily search counts", err)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		utils.LogError("Failed to get affected rows count", err)
	} else {
		utils.LogInfo(fmt.Sprintf("✅ Daily search count reset completed: %d user records reset for date %s",
			rowsAffected, today))
	}

	// Log the reset operation for audit
	s.logResetOperation(today, int(rowsAffected))
}

// resetDailySearchCountsAlternative - Alternative approach: Reset counts to 0 instead of deleting
func (s *SchedulerService) resetDailySearchCountsAlternative() {
	utils.LogInfo("🕛 Starting daily search count reset at 12 AM IST (alternative method)...")

	// Get current IST date
	istLocation := time.FixedZone("IST", 5*3600+30*60)
	today := time.Now().In(istLocation).Format("2006-01-02")

	// Update all existing records to 0
	updateQuery := `UPDATE daily_usage SET search_count = 0, export_count = 0 WHERE date = $1`

	result, err := database.PostgresDB.Exec(updateQuery, today)
	if err != nil {
		utils.LogError("Failed to reset daily search counts (alternative method)", err)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		utils.LogError("Failed to get affected rows count", err)
	} else {
		utils.LogInfo(fmt.Sprintf("✅ Daily search count reset completed (alternative): %d user records reset for date %s",
			rowsAffected, today))
	}

	// Log the reset operation for audit
	s.logResetOperation(today, int(rowsAffected))
}

// logResetOperation logs the reset operation for audit purposes
func (s *SchedulerService) logResetOperation(date string, affectedUsers int) {
	// Create an audit log entry
	logQuery := `INSERT INTO system_logs (operation, details, timestamp)
	             VALUES ($1, $2, now())
	             ON CONFLICT DO NOTHING` // In case system_logs table doesn't exist yet

	details := fmt.Sprintf("Daily search count reset completed for date %s. Users affected: %d",
		date, affectedUsers)

	_, err := database.PostgresDB.Exec(logQuery, "DAILY_RESET", details)
	if err != nil {
		// Don't fail the reset operation if logging fails
		utils.LogError("Failed to log reset operation (non-critical)", err)
	}
}

// ManualReset allows admin to manually trigger a reset (useful for testing)
func (s *SchedulerService) ManualReset() error {
	utils.LogInfo("🔧 Manual daily search count reset triggered...")
	s.resetDailySearchCounts()
	return nil
}

// GetNextResetTime returns when the next reset will occur
func (s *SchedulerService) GetNextResetTime() time.Time {
	return s.getNextMidnightIST()
}

// CleanupOldDailyUsage removes daily_usage records older than specified days
func (s *SchedulerService) CleanupOldDailyUsage(daysToKeep int) error {
	if daysToKeep <= 0 {
		daysToKeep = 30 // Default: keep 30 days of history
	}

	// Get current IST date
	istLocation := time.FixedZone("IST", 5*3600+30*60)
	cutoffDate := time.Now().In(istLocation).AddDate(0, 0, -daysToKeep).Format("2006-01-02")

	deleteQuery := `DELETE FROM daily_usage WHERE date < $1`

	result, err := database.PostgresDB.Exec(deleteQuery, cutoffDate)
	if err != nil {
		return fmt.Errorf("failed to cleanup old daily usage records: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err == nil {
		utils.LogInfo(fmt.Sprintf("🧹 Cleaned up %d old daily_usage records (older than %s)",
			rowsAffected, cutoffDate))
	}

	return nil
}

// StartWeeklyCleanup starts a weekly cleanup of old daily_usage records
func (s *SchedulerService) StartWeeklyCleanup() {
	utils.LogInfo("Starting weekly cleanup scheduler for old daily_usage records...")

	go func() {
		// Run cleanup every Sunday at 1 AM IST
		for {
			nextSunday := s.getNextSunday1AM()
			duration := time.Until(nextSunday)

			utils.LogInfo(fmt.Sprintf("Next weekly cleanup scheduled at: %s",
				nextSunday.Format("2006-01-02 15:04:05 IST")))

			time.Sleep(duration)

			// Keep 90 days of history
			s.CleanupOldDailyUsage(90)
		}
	}()
}

// getNextSunday1AM calculates next Sunday 1 AM IST
func (s *SchedulerService) getNextSunday1AM() time.Time {
	istLocation := time.FixedZone("IST", 5*3600+30*60)
	now := time.Now().In(istLocation)

	// Find next Sunday
	daysUntilSunday := (7 - int(now.Weekday())) % 7
	if daysUntilSunday == 0 && (now.Hour() >= 1) {
		daysUntilSunday = 7 // If it's Sunday and past 1 AM, go to next Sunday
	}

	nextSunday := time.Date(
		now.Year(), now.Month(), now.Day()+daysUntilSunday,
		1, 0, 0, 0, // 1:00:00 AM
		istLocation,
	)

	return nextSunday
}
