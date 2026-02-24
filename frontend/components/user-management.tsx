"use client";

import {
    Calendar,
    Clock,
    RefreshCw,
    ShieldAlert,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useUsers } from "../hooks/use-users";
import {
    CreateUserRequest,
    UpdateUserRequest,
    User,
    UserAnalytics,
} from "../lib/admin-api";
import CreateUserModal from "./create-user-modal";
import EditUserModal from "./edit-user-modal";
import { Button } from "./ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import UserAnalyticsModal from "./user-analytics-modal";
import UserTable from "./user-table";

export default function UserManagement() {
  const {
    users,
    userList,
    selectedUser,
    analytics,
    loading,
    error,
    success,
    loadUsers,
    loadUser,
    createUserAction,
    updateUserAction,
    deleteUserAction,
    loadAnalytics,
    resetSearchCounts,
    resetUserSearchCount,
    getNextReset,
    clearError,
    clearSuccess,
    clearSelectedUser,
  } = useUsers();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingAnalytics, setViewingAnalytics] =
    useState<UserAnalytics | null>(null);
  const [nextResetTime, setNextResetTime] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Load initial data
  useEffect(() => {
    loadUsers(1, 20);
    loadAnalytics();

    // Load next reset time
    getNextReset()
      .then((data) => {
        setNextResetTime(data.next_reset_time);
      })
      .catch(() => {
        // Ignore error
      });
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(clearSuccess, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, clearSuccess]);

  const handleCreateUser = async (userData: CreateUserRequest) => {
    await createUserAction(userData);
    setShowCreateModal(false);
    loadAnalytics(); // Refresh analytics
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (
    userId: string,
    updateData: UpdateUserRequest
  ) => {
    await updateUserAction(userId, updateData);
    setShowEditModal(false);
    setEditingUser(null);
    loadAnalytics(); // Refresh analytics
  };

  const handleViewAnalytics = (userAnalytics: UserAnalytics) => {
    setViewingAnalytics(userAnalytics);
    setShowAnalyticsModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await deleteUserAction(deletingUser.id);
      setShowDeleteConfirm(false);
      setDeletingUser(null);
      loadAnalytics(); // Refresh analytics
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleResetSearchCounts = async () => {
    if (
      confirm(
        "Are you sure you want to reset daily search counts for all users?"
      )
    ) {
      await resetSearchCounts();
    }
  };

  const handleResetUserSearchCount = async (user: User) => {
    if (
      confirm(
        `Are you sure you want to reset daily search count for ${user.name} (${user.email})?`
      )
    ) {
      await resetUserSearchCount(user.id);
    }
  };

  const handleRefresh = () => {
    loadUsers(currentPage, 20);
    loadAnalytics();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadUsers(page, 20);
  };

  // Calculate stats
  const totalUsers = userList?.total_count || 0;
  const activeUsers = users.filter((u) => u.is_active).length;
  const inactiveUsers = users.filter((u) => !u.is_active).length;
  const adminUsers = users.filter((u) => u.role === "ADMIN").length;
  const demoUsers = users.filter((u) => u.user_type === "DEMO").length;
  const expiredUsers = users.filter(
    (u) => u.expires_at && new Date(u.expires_at) <= new Date()
  ).length;

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold font-mono tracking-widest text-white uppercase">
            Node Operations
          </h3>
          <p className="text-xs font-mono tracking-widest uppercase text-zinc-500 mt-1">
            Manage Identities, Permissions, and Quotas
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-mono text-[10px] tracking-widest uppercase h-8 px-3 rounded-lg"
          >
            <RefreshCw
              className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin text-white" : ""}`}
            />
            Sync Matrix
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="bg-white text-black hover:bg-zinc-200 font-mono text-[10px] tracking-widest uppercase h-8 px-4 rounded-lg">
            <UserPlus className="h-3 w-3 mr-1.5" />
            Provision Node
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[9px] font-mono uppercase tracking-widest flex items-center text-indigo-400">
              <Users className="h-3 w-3 mr-1.5" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-white">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[9px] font-mono uppercase tracking-widest flex items-center text-emerald-400">
              <UserCheck className="h-3 w-3 mr-1.5" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-white">
              {activeUsers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[9px] font-mono uppercase tracking-widest flex items-center text-red-500">
              <UserX className="h-3 w-3 mr-1.5" />
              Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-zinc-500">
              {inactiveUsers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[9px] font-mono uppercase tracking-widest flex items-center text-purple-400">
              <ShieldAlert className="h-3 w-3 mr-1.5" />
              Root
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-white">
              {adminUsers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[9px] font-mono uppercase tracking-widest flex items-center text-amber-400">
              <Clock className="h-3 w-3 mr-1.5" />
              Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-white">
              {demoUsers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[9px] font-mono uppercase tracking-widest flex items-center text-orange-500">
              <Trash2 className="h-3 w-3 mr-1.5" />
              Lapsed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-zinc-500">
              {expiredUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Controls */}
      <Card className="bg-[#0f0f0f] border-white/10">
        <CardHeader className="border-b border-white/5 bg-black/20">
          <CardTitle className="flex items-center text-sm font-mono tracking-widest uppercase text-white">
            <Calendar className="h-4 w-4 mr-2 text-cyan-500" />
            Global Overrides
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center text-xs font-mono tracking-widest uppercase text-zinc-400">
                <Clock className="h-3.5 w-3.5 mr-2 text-cyan-500" />
                Network Quota Reset T-Minus: <span className="ml-2 text-white font-bold">{nextResetTime || "PENDING"}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleResetSearchCounts}
              disabled={loading}
              className="bg-red-600/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-mono text-[10px] uppercase tracking-widest h-8 px-4 rounded"
            >
              Force Quota Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="bg-[#0f0f0f] border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-white flex items-center">
                <Users className="w-4 h-4 mr-2 text-indigo-400" />
                Identity Directory
              </CardTitle>
              <CardDescription className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 mt-1.5">
                {totalUsers > 0 &&
                  `PAGINATION: ${users.length} OF ${totalUsers} NODES`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <UserTable
            users={users}
            analytics={analytics}
            onEdit={handleEditUser}
            onViewAnalytics={handleViewAnalytics}
            onDelete={handleDeleteUser}
            onResetSearchCount={handleResetUserSearchCount}
            loading={loading}
          />

          {/* Pagination */}
          {userList && userList.total_count > 20 && (
            <div className="flex justify-between items-center p-6 border-t border-white/5 bg-black/20">
              <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
                Page <span className="text-white">{userList.page}</span> of{" "}
                <span className="text-white">{Math.ceil(userList.total_count / userList.limit)}</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(userList.page - 1)}
                  disabled={userList.page <= 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(userList.page + 1)}
                  disabled={
                    userList.page >=
                      Math.ceil(userList.total_count / userList.limit) ||
                    loading
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        loading={loading}
      />

      <EditUserModal
        isOpen={showEditModal}
        user={editingUser}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        onSubmit={handleUpdateUser}
        loading={loading}
      />

      <UserAnalyticsModal
        isOpen={showAnalyticsModal}
        analytics={viewingAnalytics}
        onClose={() => {
          setShowAnalyticsModal(false);
          setViewingAnalytics(null);
        }}
        onUserDeleted={() => {
          loadUsers();
          setShowAnalyticsModal(false);
          setViewingAnalytics(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete User
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">
                  {deletingUser.name}
                </span>
                ? This action will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>User account and profile</li>
                <li>All search history and analytics</li>
                <li>All export records</li>
                <li>All login sessions and usage data</li>
              </ul>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ This action cannot be undone!
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingUser(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteUser}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
