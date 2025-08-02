"use client";

import { useEffect, useState } from "react";
import { useSessions } from "../hooks/use-sessions";
import SessionTable from "./session-table";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function SessionManagement() {
  const {
    sessions,
    loading,
    error,
    loadSessions,
    invalidateUserSessionsAction,
    cleanupExpiredSessionsAction,
    clearError,
  } = useSessions();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const handleInvalidateUserSessions = async (
    userId: string,
    userName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to invalidate all sessions for ${userName}?`
      )
    ) {
      return;
    }

    try {
      setActionLoading(userId);
      await invalidateUserSessionsAction(userId);
      setSuccess(`All sessions for ${userName} have been invalidated`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      // Error is handled by the hook
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupExpiredSessions = async () => {
    try {
      setActionLoading("cleanup");
      const result = await cleanupExpiredSessionsAction();
      setSuccess(
        `Cleanup completed. ${result.cleaned_count} expired sessions removed.`
      );
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      // Error is handled by the hook
    } finally {
      setActionLoading(null);
    }
  };

  const activeSessions = sessions.filter(
    (s) => s.is_active && new Date(s.expires_at) > new Date()
  );
  const expiredSessions = sessions.filter(
    (s) => !s.is_active || new Date(s.expires_at) <= new Date()
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Clear error and success messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Session Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage active user sessions across the system
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadSessions}
                variant="outline"
                disabled={loading}
                size="sm"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                onClick={handleCleanupExpiredSessions}
                disabled={actionLoading === "cleanup"}
                size="sm"
              >
                {actionLoading === "cleanup"
                  ? "Cleaning..."
                  : "Cleanup Expired"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SessionTable
            sessions={sessions}
            onInvalidateUserSessions={handleInvalidateUserSessions}
            actionLoading={actionLoading}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {sessions.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeSessions.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">
              Expired Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {expiredSessions.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
