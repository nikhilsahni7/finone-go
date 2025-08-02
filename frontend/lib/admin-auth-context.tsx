"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  AdminLoginResponse,
  adminLogin,
  adminLogout,
  getAdminProfile,
  isAdminTokenValid,
} from "./admin-auth";
import { ApiError, UserProfile } from "./api";

interface AdminAuthContextType {
  admin: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};

export const AdminAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [admin, setAdmin] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      if (!isAdminTokenValid()) {
        setLoading(false);
        return;
      }

      // Try to get admin profile from server to validate session
      const profile = await getAdminProfile();
      if (profile.role === "ADMIN") {
        setAdmin(profile);
      } else {
        // Not an admin, clear session
        await adminLogout();
      }
    } catch (error) {
      console.error("Admin auth check failed:", error);
      // Clear invalid session
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      localStorage.removeItem("admin_session_id");
      localStorage.removeItem("admin_expires_at");
      document.cookie =
        "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data: AdminLoginResponse = await adminLogin(email, password);

      // Store admin authentication data
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_expires_at", data.expires_at);
      localStorage.setItem("admin_session_id", data.session_id);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      // Set admin cookie for middleware
      const expiryDate = new Date(data.expires_at);
      const maxAge = Math.floor(
        (expiryDate.getTime() - new Date().getTime()) / 1000
      );
      document.cookie = `admin_token=${data.token}; path=/; max-age=${maxAge}; secure; samesite=strict`;

      setAdmin(data.user);
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
      await adminLogout();
    } catch (error) {
      console.error("Admin logout error:", error);
    } finally {
      setAdmin(null);
      // Redirect to admin login
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
    }
  };

  const refreshAdmin = async () => {
    try {
      const profile = await getAdminProfile();
      setAdmin(profile);
    } catch (error) {
      console.error("Failed to refresh admin profile:", error);
      setAdmin(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    admin,
    loading,
    isAuthenticated: !!admin,
    login,
    logout,
    refreshAdmin,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
