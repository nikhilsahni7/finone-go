"use client";

import {
  Activity,
  BarChart3,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useUsers } from "../hooks/use-users";
import { formatRelativeTimeIST, formatToIST } from "../lib/time-utils";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function SystemAnalytics() {
  const { analytics, loading, error, loadAnalytics, clearError } = useUsers();

  const [sortBy, setSortBy] = useState<"searches" | "exports" | "activity">(
    "searches"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Load analytics on mount
  useEffect(() => {
    loadAnalytics();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSort = (field: "searches" | "exports" | "activity") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortedAnalytics = [...analytics].sort((a, b) => {
    let valueA: number, valueB: number;

    switch (sortBy) {
      case "searches":
        valueA = a.total_searches;
        valueB = b.total_searches;
        break;
      case "exports":
        valueA = a.total_exports;
        valueB = b.total_exports;
        break;
      case "activity":
        valueA = a.last_login ? new Date(a.last_login).getTime() : 0;
        valueB = b.last_login ? new Date(b.last_login).getTime() : 0;
        break;
      default:
        return 0;
    }

    return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
  });

  // Calculate system-wide stats
  const totalSearches = analytics.reduce(
    (sum, user) => sum + user.total_searches,
    0
  );
  const todaySearches = analytics.reduce(
    (sum, user) => sum + user.today_searches,
    0
  );
  const totalExports = analytics.reduce(
    (sum, user) => sum + user.total_exports,
    0
  );
  const todayExports = analytics.reduce(
    (sum, user) => sum + user.today_exports,
    0
  );
  const activeToday = analytics.filter(
    (user) => user.today_searches > 0
  ).length;
  const totalUsers = analytics.length;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Never";
    return formatToIST(dateString);
  };

  const formatLastActivity = (dateString: string | undefined) => {
    if (!dateString) return "Never";
    return formatRelativeTimeIST(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            System Analytics
          </h3>
          <p className="text-sm text-gray-500">
            Overview of system usage and user activity
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Total Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalSearches.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              Today: {todaySearches.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Total Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalExports.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              Today: {todayExports.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {activeToday}
            </div>
            <div className="text-sm text-gray-500">of {totalUsers} total</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Avg. Per User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalUsers > 0 ? Math.round(totalSearches / totalUsers) : 0}
            </div>
            <div className="text-sm text-gray-500">searches total</div>
          </CardContent>
        </Card>
      </div>

      {/* User Analytics Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                User Analytics
              </CardTitle>
              <CardDescription>
                Detailed breakdown of user activity and usage patterns
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={sortBy === "searches" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("searches")}
              >
                Sort by Searches
              </Button>
              <Button
                variant={sortBy === "exports" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("exports")}
              >
                Sort by Exports
              </Button>
              <Button
                variant={sortBy === "activity" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("activity")}
              >
                Sort by Activity
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : analytics.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No analytics data
              </h3>
              <p className="text-gray-600">No user activity data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Search Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Export Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAnalytics.map((user) => {
                    const searchPercentage =
                      totalSearches > 0
                        ? (user.total_searches / totalSearches) * 100
                        : 0;

                    return (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              Total: {user.total_searches.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Today: {user.today_searches}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              Total: {user.total_exports.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Today: {user.today_exports}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">
                              Login: {formatLastActivity(user.last_login)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Search:{" "}
                              {formatLastActivity(user.last_search_time)}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {searchPercentage.toFixed(1)}%
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      searchPercentage,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
