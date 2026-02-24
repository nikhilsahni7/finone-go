"use client";

import AdminProtectedRoute from "@/components/admin-protected-route";
import AdminTabs from "@/components/admin-tabs";
import PasswordChangeRequests from "@/components/password-change-requests";
import RegistrationRequests from "@/components/registration-requests";
import SessionManagement from "@/components/session-management";
import SystemAnalytics from "@/components/system-analytics";
import { Button } from "@/components/ui/button";
import UserManagement from "@/components/user-management";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { LogOut, ShieldAlert, TerminalSquare } from "lucide-react";

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
    {
      id: "registration-requests",
      label: "Registration Requests",
      component: <RegistrationRequests />,
    },
    {
      id: "password-requests",
      label: "Password Change Requests",
      component: <PasswordChangeRequests />,
    },
    {
      id: "analytics",
      label: "System Analytics",
      component: <SystemAnalytics />,
    },
  ];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#030303] text-zinc-200 selection:bg-red-500/30 font-sans">
        {/* Header */}
        <div className="bg-[#0a0a0a] border-b border-red-500/20 px-6 py-4 sticky top-0 z-40 shadow-[0_4px_30px_rgba(239,68,68,0.05)]">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-mono text-white tracking-widest uppercase">
                  Root Control Matrix
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[10px] text-red-400 font-mono tracking-widest uppercase">
                    SYSADMIN: {admin?.name || admin?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/20">
                <TerminalSquare className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Active State</span>
              </div>

              <Button
                onClick={logout}
                variant="outline"
                className="bg-transparent border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-mono text-xs uppercase tracking-widest h-9 px-4 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Terminate Sec-Session
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
            <AdminTabs tabs={tabs} defaultTab="users" />
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
