const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8082";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchRequest {
  query: string;
  fields?: string[];
  field_queries?: { [key: string]: string };
  logic?: "AND" | "OR";
  match_type?: "partial" | "full";
  limit?: number;
  offset?: number;
  search_within?: boolean;
}

export interface SearchResponse {
  results: any[];
  total_count: number;
  execution_time_ms: number;
  search_id: string;
  has_more: boolean;
}

export interface SearchWithinRequest {
  search_id: string;
  query: string;
  fields?: string[];
  match_type?: "partial" | "full";
  limit?: number;
  offset?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  user_type: string;
  expires_at?: string | null;
  is_active: boolean;
  max_searches_per_day: number;
  max_exports_per_day: number;
  today_searches: number;
  created_at: string;
  updated_at: string;
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

export interface RegistrationRequest {
  name: string;
  email: string;
  phone_number: string;
  requested_searches: number;
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

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle 401 errors by clearing auth state
    if (response.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/user/login";
      }
    }
    throw new ApiError(
      response.status,
      data.error || data.message || "API request failed"
    );
  }

  return data;
}

export async function login(email: string, password: string) {
  return apiCall("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiCall("/api/v1/users/logout", {
    method: "POST",
  });
}

export async function getProfile(): Promise<UserProfile> {
  return apiCall("/api/v1/users/profile");
}

export async function getMyAnalytics(): Promise<UserAnalytics> {
  return apiCall("/api/v1/users/analytics");
}

export async function search(query: SearchRequest): Promise<SearchResponse> {
  return apiCall("/api/v1/search/", {
    method: "POST",
    body: JSON.stringify(query),
  });
}

export async function searchWithin(
  request: SearchWithinRequest
): Promise<SearchResponse> {
  return apiCall("/api/v1/search/within", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getSearchStats() {
  return apiCall("/api/v1/search/stats");
}

export async function exportSearchResults(
  searchId: string,
  format: "csv" | "json" = "csv"
) {
  return apiCall("/api/v1/search/export", {
    method: "POST",
    body: JSON.stringify({
      search_id: searchId,
      format: format,
      file_name: `search_results_${Date.now()}.${format}`,
    }),
  });
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("access_token");
  const expiresAt = localStorage.getItem("token_expires_at");

  if (!token || !expiresAt) return false;

  // Check if token is expired
  if (new Date(expiresAt) <= new Date()) {
    clearAuth();
    return false;
  }

  return true;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getUser(): any {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_expires_at");
  localStorage.removeItem("session_id");
  localStorage.removeItem("user");
  // Clear cookie
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
}

// Registration API functions
export async function createRegistrationRequest(
  request: RegistrationRequest
): Promise<{ message: string; request: UserRegistrationRequest }> {
  return apiCall("/api/v1/register", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
