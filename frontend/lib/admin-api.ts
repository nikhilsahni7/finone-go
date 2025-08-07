/**
 * Admin API functions for user management
 */

import { ApiError } from "./api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8082";

// Types based on backend models
export interface User {
  id: string;
  name: string;
  email: string;
  user_type: "DEMO" | "PERMANENT";
  role: "USER" | "ADMIN";
  expires_at?: string | null;
  is_active: boolean;
  max_searches_per_day: number;
  max_exports_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  user_type: "DEMO" | "PERMANENT";
  role: "USER" | "ADMIN";
  expires_at?: string | null;
  max_searches_per_day: number;
  max_exports_per_day: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  user_type?: "DEMO" | "PERMANENT";
  is_active?: boolean;
  expires_at?: string | null;
  max_searches_per_day?: number;
  max_exports_per_day?: number;
}

export interface UserListResponse {
  users: User[];
  total_count: number;
  page: number;
  limit: number;
}

export interface UserAnalytics {
  user_id: string;
  name: string;
  email: string;
  total_searches: number;
  today_searches: number;
  total_exports: number;
  today_exports: number;
  last_login?: string;
  last_search_time?: string;
}

export interface AdminAnalyticsResponse {
  analytics: UserAnalytics[];
}

export interface RecentSearch {
  id: string;
  search_time: string;
  search_query: any;
  result_count: number;
  execution_time_ms: number;
}

export interface UserSearchHistoryResponse {
  searches: RecentSearch[];
}

export interface UserRegistrationRequest {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  requested_searches: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface RegistrationRequestListResponse {
  requests: UserRegistrationRequest[];
  total_count: number;
  page: number;
  limit: number;
}

export interface UpdateRegistrationRequest {
  status: "APPROVED" | "REJECTED";
  admin_notes?: string;
}

export interface UserPasswordChangeRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface PasswordChangeRequestListResponse {
  requests: UserPasswordChangeRequest[];
  total_count: number;
  page: number;
  limit: number;
}

export interface UpdatePasswordChangeRequest {
  status: "APPROVED" | "REJECTED";
  admin_notes?: string;
}

/**
 * Create a new user (admin only)
 */
export const createUser = async (
  userData: CreateUserRequest
): Promise<User> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Failed to create user");
  }

  return data;
};

/**
 * Get paginated list of users (admin only)
 */
export const getUsers = async (
  page: number = 1,
  limit: number = 20
): Promise<UserListResponse> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/users?page=${page}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Failed to get users");
  }

  return data;
};

/**
 * Get a specific user by ID (admin only)
 */
export const getUser = async (userId: string): Promise<User> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Failed to get user");
  }

  return data;
};

/**
 * Update user information (admin only)
 */
export const updateUser = async (
  userId: string,
  updateData: UpdateUserRequest
): Promise<User> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Failed to update user");
  }

  return data;
};

/**
 * Get user analytics for all users (admin only)
 */
export const getUserAnalytics = async (): Promise<AdminAnalyticsResponse> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get user analytics"
    );
  }

  return data;
};

/**
 * Reset daily search counts for all users (admin only)
 */
export const resetDailySearchCounts = async (): Promise<{
  message: string;
}> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/reset/daily-search-counts`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to reset daily search counts"
    );
  }

  return data;
};

/**
 * Reset daily search count for a specific user (admin only)
 */
export const resetUserDailySearchCount = async (
  userId: string
): Promise<{
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  note: string;
}> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/users/${userId}/reset-daily-search-count`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to reset user daily search count"
    );
  }

  return data;
};

/**
 * Get next reset time (admin only)
 */
export const getNextResetTime = async (): Promise<{
  next_reset_time: string;
  next_reset_unix: number;
  time_until_reset: string;
}> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/reset/next-reset-time`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get next reset time"
    );
  }

  return data;
};

/**
 * Get user search history (admin only)
 */
export const getUserSearchHistory = async (
  userId: string,
  limit: number = 10
): Promise<UserSearchHistoryResponse> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/users/${userId}/search-history?limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get user search history"
    );
  }

  return data;
};

/**
 * Get user profile details (admin only)
 */
export const getUserProfile = async (userId: string): Promise<User> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get user profile"
    );
  }

  return data;
};

/**
 * Delete a user completely (admin only)
 */
export const deleteUser = async (
  userId: string
): Promise<{ message: string; deleted_user: any }> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(`${BACKEND_URL}/api/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Failed to delete user");
  }

  return data;
};

/**
 * Get paginated list of registration requests (admin only)
 */
export const getRegistrationRequests = async (
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<RegistrationRequestListResponse> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append("status", status);
  }

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/registration-requests?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get registration requests"
    );
  }

  return data;
};

/**
 * Get a specific registration request by ID (admin only)
 */
export const getRegistrationRequest = async (
  id: string
): Promise<UserRegistrationRequest> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/registration-requests/${id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get registration request"
    );
  }

  return data;
};

/**
 * Update registration request status (admin only)
 */
export const updateRegistrationRequest = async (
  id: string,
  update: UpdateRegistrationRequest
): Promise<{ message: string; request: UserRegistrationRequest }> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/registration-requests/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to update registration request"
    );
  }

  return data;
};

/**
 * Delete a registration request (admin only)
 */
export const deleteRegistrationRequest = async (
  id: string
): Promise<{ message: string }> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/registration-requests/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to delete registration request"
    );
  }

  return data;
};

/**
 * Get paginated list of password change requests (admin only)
 */
export const getPasswordChangeRequests = async (
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<PasswordChangeRequestListResponse> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append("status", status);
  }

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/password-change-requests?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get password change requests"
    );
  }

  return data;
};

/**
 * Get a specific password change request by ID (admin only)
 */
export const getPasswordChangeRequest = async (
  id: string
): Promise<UserPasswordChangeRequest> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/password-change-requests/${id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to get password change request"
    );
  }

  return data;
};

/**
 * Update password change request status (admin only)
 */
export const updatePasswordChangeRequest = async (
  id: string,
  update: UpdatePasswordChangeRequest
): Promise<{ message: string; request: UserPasswordChangeRequest }> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/password-change-requests/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to update password change request"
    );
  }

  return data;
};

/**
 * Delete a password change request (admin only)
 */
export const deletePasswordChangeRequest = async (
  id: string
): Promise<{ message: string }> => {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new ApiError(401, "No admin token found");

  const response = await fetch(
    `${BACKEND_URL}/api/v1/admin/password-change-requests/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "Failed to delete password change request"
    );
  }

  return data;
};
