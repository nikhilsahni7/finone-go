/**
 * Admin Authentication Service
 * Handles admin-specific authentication and session management
 */

import { ApiError, UserProfile } from "./api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8082";

export interface AdminLoginResponse {
  token: string;
  session_id: string;
  expires_at: string;
  user: UserProfile;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface SessionsResponse {
  sessions: SessionInfo[];
}

/**
 * Admin login - separate from regular user login
 */
export const adminLogin = async (
  email: string,
  password: string
): Promise<AdminLoginResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Login failed");
  }

  // Verify the user is an admin
  if (data.user.role !== "ADMIN") {
    throw new ApiError(403, "Admin access required");
  }

  return data;
};

/**
 * Admin logout
 */
export const adminLogout = async (): Promise<void> => {
  const token = localStorage.getItem("admin_token");
  if (!token) return;

  await fetch(`${BACKEND_URL}/api/v1/users/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  // Clear admin session data
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
  localStorage.removeItem("admin_session_id");
  localStorage.removeItem("admin_expires_at");

  // Clear admin cookie
  document.cookie =
    "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};

/**
 * Get admin profile
 */
export const getAdminProfile = async (): Promise<UserProfile> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Failed to get profile");
  }

  return data;
};

/**
 * Get all active sessions (admin only)
 */
export const getAllSessions = async (): Promise<SessionsResponse> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Failed to get sessions");
  }

  return data;
};

/**
 * Get sessions for a specific user (admin only)
 */
export const getUserSessions = async (
  userId: string
): Promise<SessionsResponse> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/users/${userId}/sessions`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get user sessions"
    );
  }

  return data;
};

/**
 * Invalidate all sessions for a user (admin only)
 */
export const invalidateUserSessions = async (userId: string): Promise<void> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/users/${userId}/sessions`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new ApiError(
      response.status,
      data.error || "Failed to invalidate sessions"
    );
  }
};

/**
 * Cleanup expired sessions (admin only)
 */
export const cleanupExpiredSessions = async (): Promise<{
  message: string;
  cleaned_count: number;
}> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/sessions/cleanup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to cleanup sessions"
    );
  }

  return data;
};

/**
 * Check if admin token is valid and not expired
 */
export const isAdminTokenValid = (): boolean => {
  const token = localStorage.getItem("admin_token");
  const expiresAt = localStorage.getItem("admin_expires_at");

  if (!token || !expiresAt) return false;

  return new Date(expiresAt) > new Date();
};
