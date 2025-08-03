/**
 * Time utility functions for IST formatting
 */

// IST (India Standard Time) is UTC+5:30
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Convert a date to IST and format it nicely
 * NOTE: Backend incorrectly stores IST times as UTC, so we need to adjust
 */
export const formatToIST = (dateString: string | undefined): string => {
  if (!dateString) return "Never";

  let date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  // TEMPORARY FIX: Backend stores IST time as UTC, so we need to subtract IST offset
  // This is because backend uses time.Now() which gives system time (IST) but stores it as UTC
  if (dateString.includes("Z")) {
    // Subtract IST offset (5.5 hours) since backend incorrectly stored IST as UTC
    date = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
  }

  // Format in IST timezone
  const result = date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return result;
};

/**
 * Convert a date to IST and format for datetime-local input
 */
export const formatToISTInput = (dateString: string | undefined): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  // Get the date in IST timezone and format for datetime-local input
  const istFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const formattedIST = istFormatter.format(date);
  return formattedIST.replace(" ", "T");
};

/**
 * Get current IST time formatted nicely
 */
export const getCurrentISTTime = (): string => {
  return formatToIST(new Date().toISOString());
};

/**
 * Format relative time (e.g., "2 hours ago", "Yesterday")
 */
export const formatRelativeTimeIST = (
  dateString: string | undefined
): string => {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Convert to different time units
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // For older dates, show the full IST date
    return formatToIST(dateString);
  }
};

/**
 * Format time duration in a human-readable way
 */
export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

/**
 * Format date only (without time) in IST
 */
export const formatDateOnlyIST = (dateString: string | undefined): string => {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  // Format only the date part in IST
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Format date in a compact format for UI cards (e.g., "3 Aug")
 */
export const formatCompactDateIST = (
  dateString: string | undefined
): string => {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid";

  // Format in compact format: "3 Aug" or "3 Aug 24" if not current year
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  };

  // Add year if not current year
  if (dateYear !== currentYear) {
    options.year = "2-digit";
  }

  return date.toLocaleDateString("en-US", options);
};

/**
 * Check if a date is today in IST
 */
export const isTodayIST = (dateString: string): boolean => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  const today = new Date();

  // Get IST dates using proper timezone conversion
  const istDate = date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const istToday = today.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  return istDate === istToday;
};

/**
 * Format time for admin session table specifically
 */
export const formatTimeForSession = (
  dateString: string | undefined
): string => {
  if (!dateString) return "Never";

  let date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  // TEMPORARY FIX: Backend stores IST time as UTC, so we need to subtract IST offset
  if (dateString.includes("Z")) {
    date = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
  }

  // Format time in IST with proper timezone handling
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Use 24-hour format for admin
  });
};

/**
 * Parse backend time response which includes timezone info
 */
export const parseBackendTime = (
  timeString: string | undefined
): Date | null => {
  if (!timeString) return null;

  // Handle different time formats from backend
  try {
    // If it's already an ISO string, use directly
    if (timeString.includes("T") && timeString.includes("Z")) {
      return new Date(timeString);
    }

    // If it's in IST format from backend (e.g., "2006-01-02 15:04:05 IST")
    if (timeString.includes(" IST")) {
      const cleanTime = timeString.replace(" IST", "");
      // Convert to ISO format assuming IST
      const istDate = new Date(cleanTime + "+05:30");
      return istDate;
    }

    // Default: try parsing as is
    return new Date(timeString);
  } catch (error) {
    console.error("Error parsing backend time:", error);
    return null;
  }
};

/**
 * Convert backend time to display format in IST
 */
export const formatBackendTimeToIST = (
  timeString: string | undefined
): string => {
  if (!timeString) return "Never";

  let date = new Date(timeString);
  if (isNaN(date.getTime())) return "Invalid Date";

  // TEMPORARY FIX: Backend stores IST time as UTC, so we need to subtract IST offset
  if (timeString.includes("Z")) {
    date = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};
