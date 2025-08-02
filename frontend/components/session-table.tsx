"use client";

import { SessionInfo } from "../lib/admin-auth";
import { Button } from "./ui/button";

interface SessionTableProps {
  sessions: SessionInfo[];
  onInvalidateUserSessions: (userId: string, userName: string) => Promise<void>;
  actionLoading: string | null;
  loading: boolean;
}

export default function SessionTable({
  sessions,
  onInvalidateUserSessions,
  actionLoading,
  loading,
}: SessionTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSessionStatus = (session: SessionInfo) => {
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (!session.is_active) return { text: "Inactive", color: "text-gray-500" };
    if (expiresAt <= now) return { text: "Expired", color: "text-red-500" };
    return { text: "Active", color: "text-green-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No active sessions found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Activity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expires
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sessions.map((session) => {
            const status = getSessionStatus(session);
            return (
              <tr key={session.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {session.user_name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {session.user_email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(session.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(session.last_activity)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(session.expires_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    onClick={() =>
                      onInvalidateUserSessions(
                        session.user_id,
                        session.user_name || session.user_email
                      )
                    }
                    variant="destructive"
                    size="sm"
                    disabled={actionLoading === session.user_id}
                  >
                    {actionLoading === session.user_id
                      ? "Invalidating..."
                      : "Invalidate"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
