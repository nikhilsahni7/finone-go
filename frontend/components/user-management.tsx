"use client";

import {
  Calendar,
  Clock,
  RefreshCw,
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          <p className="text-sm text-gray-500">
            Manage user accounts, permissions, and daily limits
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <UserCheck className="h-4 w-4 mr-2" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <UserX className="h-4 w-4 mr-2" />
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inactiveUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {adminUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">
              Demo Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {demoUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {expiredUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            System Controls
          </CardTitle>
          <CardDescription>
            Manage daily search limits and system-wide settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                Next automatic reset: {nextResetTime}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleResetSearchCounts}
              disabled={loading}
            >
              Reset Daily Counts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {totalUsers > 0 &&
                  `Showing ${users.length} of ${totalUsers} users`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserTable
            users={users}
            analytics={analytics}
            onEdit={handleEditUser}
            onViewAnalytics={handleViewAnalytics}
            onDelete={handleDeleteUser}
            loading={loading}
          />

          {/* Pagination */}
          {userList && userList.total_count > 20 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-700">
                Page {userList.page} of{" "}
                {Math.ceil(userList.total_count / userList.limit)}
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
