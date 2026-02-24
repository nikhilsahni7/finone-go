"use client";

import { Activity, Clock, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSessions } from "../hooks/use-sessions";
import SessionTable from "./session-table";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

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
    <div className="space-y-8">
      {/* Alerts */}
      {error && (
        <div className="bg-red-950/50 border border-red-500/30 text-red-400 font-mono text-sm px-4 py-3 rounded-xl shadow-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-mono text-sm px-4 py-3 rounded-xl shadow-lg">
          {success}
        </div>
      )}

      {/* Session Management */}
      <Card className="bg-[#0f0f0f] border-white/10 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
        <CardHeader className="border-b border-white/5 bg-black/20">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-white flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2 text-red-500" />
                Active Node Sessions
              </CardTitle>
              <CardDescription className="text-xs font-mono tracking-widest text-zinc-500 mt-1 uppercase">
                Manage live authentication tokens across the system
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadSessions}
                variant="outline"
                disabled={loading}
                size="sm"
                className="bg-transparent border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white font-mono text-[9px] uppercase tracking-widest h-8 px-3 rounded"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? "animate-spin text-white" : ""}`} />
                {loading ? "SYNCING..." : "SYNC"}
              </Button>
              <Button
                onClick={handleCleanupExpiredSessions}
                disabled={actionLoading === "cleanup"}
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white font-mono text-[9px] uppercase tracking-widest h-8 px-3 rounded shadow-[0_0_15px_rgba(239,68,68,0.2)] border-transparent"
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                {actionLoading === "cleanup" ? "PURGING..." : "PURGE EXPIRED"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <SessionTable
            sessions={sessions}
            onInvalidateUserSessions={handleInvalidateUserSessions}
            actionLoading={actionLoading}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest flex items-center">
              <Activity className="h-3.5 w-3.5 mr-2 text-indigo-400" />
              Total Sessions Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {sessions.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
          <CardHeader className="pb-2 text-zinc-400 relative z-10">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest flex items-center text-emerald-400">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-2" />
              Live Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold font-mono text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              {activeSessions.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest flex items-center">
              <Clock className="h-3.5 w-3.5 mr-2 text-red-400" />
              Expired Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {expiredSessions.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
