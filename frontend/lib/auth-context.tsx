"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  ApiError,
  UserProfile,
  login as apiLogin,
  logout as apiLogout,
  clearAuth,
  getProfile,
} from "./api";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Check if we have valid tokens
      const token = localStorage.getItem("access_token");
      const expiresAt = localStorage.getItem("token_expires_at");

      if (!token || !expiresAt) {
        setLoading(false);
        return;
      }

      // Check if token is expired
      if (new Date(expiresAt) <= new Date()) {
        clearAuth();
        setLoading(false);
        return;
      }

      // Try to get user profile from server to validate session
      const profile = await getProfile();
      setUser(profile);
    } catch (error) {
      console.error("Auth check failed:", error);
      clearAuth();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await apiLogin(email, password);

      // Store all authentication data
      localStorage.setItem("access_token", data.token);
      localStorage.setItem("token_expires_at", data.expires_at);
      localStorage.setItem("session_id", data.session_id);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Set cookie for middleware
      const expiryDate = new Date(data.expires_at);
      const maxAge = Math.floor(
        (expiryDate.getTime() - new Date().getTime()) / 1000
      );
      document.cookie = `token=${data.token}; path=/; max-age=${maxAge}; secure; samesite=strict`;

      setUser(data.user);
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      // Call server logout to invalidate session
      await apiLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local storage and redirect
      clearAuth();
      setUser(null);
      window.location.href = "/user/login";
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      clearAuth();
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
