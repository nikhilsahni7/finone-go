"use client";

import { useCallback, useState } from "react";
import {
  cleanupExpiredSessions,
  getAllSessions,
  invalidateUserSessions,
  SessionInfo,
} from "../lib/admin-auth";

export interface UseSessionsReturn {
  sessions: SessionInfo[];
  loading: boolean;
  error: string | null;
  loadSessions: () => Promise<void>;
  invalidateUserSessionsAction: (userId: string) => Promise<void>;
  cleanupExpiredSessionsAction: () => Promise<{ cleaned_count: number }>;
  clearError: () => void;
}

export const useSessions = (): UseSessionsReturn => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllSessions();
      setSessions(response.sessions);
    } catch (err: any) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateUserSessionsAction = useCallback(
    async (userId: string) => {
      try {
        await invalidateUserSessions(userId);
        // Refresh sessions after invalidation
        await loadSessions();
      } catch (err: any) {
        setError(err.message || "Failed to invalidate sessions");
        throw err;
      }
    },
    [loadSessions]
  );

  const cleanupExpiredSessionsAction = useCallback(async () => {
    try {
      const result = await cleanupExpiredSessions();
      // Refresh sessions after cleanup
      await loadSessions();
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to cleanup sessions");
      throw err;
    }
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    loadSessions,
    invalidateUserSessionsAction,
    cleanupExpiredSessionsAction,
    clearError,
  };
};
