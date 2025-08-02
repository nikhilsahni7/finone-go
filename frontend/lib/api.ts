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
  max_searches_per_day: number;
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
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

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
    throw new ApiError(response.status, data.message || "API request failed");
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
  return !!localStorage.getItem("token");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getUser(): any {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
