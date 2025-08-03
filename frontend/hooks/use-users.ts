/**
 * Hook for managing user operations in admin panel
 */

import { useCallback, useState } from "react";
import {
  AdminAnalyticsResponse,
  createUser,
  CreateUserRequest,
  deleteUser,
  getNextResetTime,
  getUser,
  getUserAnalytics,
  getUsers,
  resetDailySearchCounts,
  updateUser,
  UpdateUserRequest,
  User,
  UserAnalytics,
  UserListResponse,
} from "../lib/admin-api";

export interface UseUsersReturn {
  // State
  users: User[];
  userList: UserListResponse | null;
  selectedUser: User | null;
  analytics: UserAnalytics[];
  loading: boolean;
  error: string | null;
  success: string | null;

  // Actions
  loadUsers: (page?: number, limit?: number) => Promise<void>;
  loadUser: (userId: string) => Promise<void>;
  createUserAction: (userData: CreateUserRequest) => Promise<User>;
  updateUserAction: (
    userId: string,
    updateData: UpdateUserRequest
  ) => Promise<User>;
  deleteUserAction: (userId: string) => Promise<void>;
  loadAnalytics: () => Promise<void>;
  resetSearchCounts: () => Promise<void>;
  getNextReset: () => Promise<{
    next_reset_time: string;
    next_reset_unix: number;
    time_until_reset: string;
  }>;
  clearError: () => void;
  clearSuccess: () => void;
  clearSelectedUser: () => void;
}

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [userList, setUserList] = useState<UserListResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);
  const clearSelectedUser = useCallback(() => setSelectedUser(null), []);

  const loadUsers = useCallback(
    async (page: number = 1, limit: number = 20) => {
      try {
        setLoading(true);
        setError(null);
        const response = await getUsers(page, limit);
        setUserList(response);
        setUsers(response.users);
      } catch (err: any) {
        setError(err.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadUser = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const user = await getUser(userId);
      setSelectedUser(user);
    } catch (err: any) {
      setError(err.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, []);

  const createUserAction = useCallback(
    async (userData: CreateUserRequest): Promise<User> => {
      try {
        setLoading(true);
        setError(null);
        const newUser = await createUser(userData);
        setSuccess("User created successfully");

        // Refresh the users list
        await loadUsers(userList?.page || 1, userList?.limit || 20);

        return newUser;
      } catch (err: any) {
        setError(err.message || "Failed to create user");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadUsers, userList]
  );

  const updateUserAction = useCallback(
    async (userId: string, updateData: UpdateUserRequest): Promise<User> => {
      try {
        setLoading(true);
        setError(null);
        const updatedUser = await updateUser(userId, updateData);
        setSuccess("User updated successfully");

        // Update the users list
        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.id === userId ? updatedUser : user))
        );

        // Update selected user if it's the same
        if (selectedUser?.id === userId) {
          setSelectedUser(updatedUser);
        }

        // Update userList if available
        if (userList) {
          setUserList((prev) =>
            prev
              ? {
                  ...prev,
                  users: prev.users.map((user) =>
                    user.id === userId ? updatedUser : user
                  ),
                }
              : null
          );
        }

        return updatedUser;
      } catch (err: any) {
        setError(err.message || "Failed to update user");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedUser, userList]
  );

  const deleteUserAction = useCallback(
    async (userId: string): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        await deleteUser(userId);
        setSuccess("User deleted successfully");

        // Remove the user from the local state
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));

        // Update userList if available
        if (userList) {
          setUserList((prev) =>
            prev
              ? {
                  ...prev,
                  users: prev.users.filter((user) => user.id !== userId),
                  total_count: prev.total_count - 1,
                }
              : null
          );
        }

        // Clear selected user if it's the deleted one
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }

        // Remove from analytics
        setAnalytics((prevAnalytics) =>
          prevAnalytics.filter((analytics) => analytics.user_id !== userId)
        );
      } catch (err: any) {
        setError(err.message || "Failed to delete user");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedUser, userList]
  );

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: AdminAnalyticsResponse = await getUserAnalytics();
      setAnalytics(response.analytics);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetSearchCounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await resetDailySearchCounts();
      setSuccess("Daily search counts reset successfully");

      // Refresh analytics to show updated counts
      await loadAnalytics();
    } catch (err: any) {
      setError(err.message || "Failed to reset search counts");
    } finally {
      setLoading(false);
    }
  }, [loadAnalytics]);

  const getNextReset = useCallback(async () => {
    try {
      setError(null);
      return await getNextResetTime();
    } catch (err: any) {
      setError(err.message || "Failed to get next reset time");
      throw err;
    }
  }, []);

  return {
    // State
    users,
    userList,
    selectedUser,
    analytics,
    loading,
    error,
    success,

    // Actions
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
  };
};
