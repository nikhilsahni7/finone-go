"use client";

import {
  Activity,
  Edit,
  RotateCcw,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { User, UserAnalytics } from "../lib/admin-api";
import { formatDateOnlyIST } from "../lib/time-utils";
import { Button } from "./ui/button";

interface UserTableProps {
  users: User[];
  analytics: UserAnalytics[];
  onEdit: (user: User) => void;
  onViewAnalytics: (analytics: UserAnalytics) => void;
  onDelete: (user: User) => void;
  onResetSearchCount: (user: User) => void;
  loading: boolean;
}

export default function UserTable({
  users,
  analytics,
  onEdit,
  onViewAnalytics,
  onDelete,
  onResetSearchCount,
  loading,
}: UserTableProps) {
  const getUserAnalytics = (userId: string): UserAnalytics | undefined => {
    return analytics.find((a) => a.user_id === userId);
  };

  const formatDate = (dateString: string) => {
    return formatDateOnlyIST(dateString);
  };

  const getStatusBadge = (user: User) => {
    const isExpired =
      user.expires_at && new Date(user.expires_at) <= new Date();

    if (!user.is_active) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <UserX className="h-3 w-3 mr-1" />
          Inactive
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <UserX className="h-3 w-3 mr-1" />
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <UserCheck className="h-3 w-3 mr-1" />
        Active
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    if (role === "ADMIN") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Shield className="h-3 w-3 mr-1" />
        User
      </span>
    );
  };

  const getTypeBadge = (userType: string) => {
    if (userType === "DEMO") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Demo
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Permanent
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No users found
        </h3>
        <p className="text-gray-600">
          Get started by creating your first user.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type & Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Limits
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Today's Usage
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => {
            const userAnalytics = getUserAnalytics(user.id);

            return (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">
                        Created: {formatDate(user.created_at)}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {getStatusBadge(user)}
                    {user.expires_at && (
                      <div className="text-xs text-gray-500">
                        Expires: {formatDate(user.expires_at)}
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {getTypeBadge(user.user_type)}
                    {getRoleBadge(user.role)}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="space-y-1">
                    <div>Searches: {user.max_searches_per_day}/day</div>
                    <div>Exports: {user.max_exports_per_day}/day</div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {userAnalytics ? (
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <span>Searches: {userAnalytics.today_searches}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span>Exports: {userAnalytics.today_exports}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">No data</span>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {userAnalytics && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewAnalytics(userAnalytics)}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResetSearchCount(user)}
                      title="Reset Daily Search Count"
                      className="hover:bg-blue-50 hover:border-blue-200 text-blue-600"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>

                    {user.role !== "ADMIN" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(user)}
                        className="hover:bg-red-50 hover:border-red-200 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
