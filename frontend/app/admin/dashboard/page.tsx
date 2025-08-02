"use client";

import AdminProtectedRoute from "../../../components/admin-protected-route";
import AdminTabs from "../../../components/admin-tabs";
import SessionManagement from "../../../components/session-management";
import { Button } from "../../../components/ui/button";
import UserManagement from "../../../components/user-management";
import { useAdminAuth } from "../../../lib/admin-auth-context";

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();

  const tabs = [
    {
      id: "sessions",
      label: "Session Management",
      component: <SessionManagement />,
    },
    {
      id: "users",
      label: "User Management",
      component: <UserManagement />,
    },
  ];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {admin?.name || admin?.email}
                </p>
              </div>
              <Button onClick={logout} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <AdminTabs tabs={tabs} defaultTab="sessions" />
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
