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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
    <div className="space-y-8">
      {/* Alert */}
      {error && (
        <div className="bg-red-950/50 border border-red-500/30 text-red-400 font-mono text-sm px-4 py-3 rounded-xl shadow-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold font-mono tracking-widest text-white uppercase">
            System Telemetry
          </h3>
          <p className="text-xs font-mono tracking-widest uppercase text-zinc-500 mt-1">
            Global Node Usage & Activity Matrix
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          disabled={loading}
          className="bg-transparent border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-mono text-[10px] tracking-widest uppercase h-8 px-3 rounded-lg"
        >
          <RefreshCw
            className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin text-white" : ""}`}
          />
          Sync Status
        </Button>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest flex items-center">
              <Search className="h-3.5 w-3.5 mr-2 text-indigo-400" />
              Global Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {totalSearches.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-indigo-400/80 mt-1 uppercase tracking-widest">
              T-0 Cycle: {todaySearches.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest flex items-center">
              <Download className="h-3.5 w-3.5 mr-2 text-emerald-400" />
              Data Extractions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {totalExports.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-emerald-400/80 mt-1 uppercase tracking-widest">
              T-0 Cycle: {todayExports.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest flex items-center">
              <Users className="h-3.5 w-3.5 mr-2 text-red-500" />
              Active Sub-Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {activeToday}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">
              Of {totalUsers} Total Configured
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 hover:bg-white/5 transition-colors">
          <CardHeader className="pb-2 text-zinc-400">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest flex items-center">
              <TrendingUp className="h-3.5 w-3.5 mr-2 text-amber-500" />
              Mean Consumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {totalUsers > 0 ? Math.round(totalSearches / totalUsers) : 0}
            </div>
            <div className="text-[10px] font-mono text-amber-500/50 mt-1 uppercase tracking-widest">
              Queries Per Node
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Analytics Table */}
      <Card className="bg-[#0f0f0f] border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-black/20">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center text-sm font-mono tracking-widest uppercase text-white">
                <BarChart3 className="h-4 w-4 mr-2 text-red-500" />
                Node Activity Matrix
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === "searches" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("searches")}
                className={`font-mono text-[9px] uppercase tracking-widest h-7 px-3 rounded ${sortBy === "searches" ? "bg-red-600 hover:bg-red-500 text-white border-transparent" : "bg-transparent border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                Sort: Queries
              </Button>
              <Button
                variant={sortBy === "exports" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("exports")}
                className={`font-mono text-[9px] uppercase tracking-widest h-7 px-3 rounded ${sortBy === "exports" ? "bg-red-600 hover:bg-red-500 text-white border-transparent" : "bg-transparent border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                Sort: Dumps
              </Button>
              <Button
                variant={sortBy === "activity" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("activity")}
                className={`font-mono text-[9px] uppercase tracking-widest h-7 px-3 rounded ${sortBy === "activity" ? "bg-red-600 hover:bg-red-500 text-white border-transparent" : "bg-transparent border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                Sort: Last Ping
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
            </div>
          ) : analytics.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-sm font-mono tracking-widest uppercase text-white mb-2">
                Empty Dataset
              </h3>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">No node telemetry available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-black/40">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Node Identity
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Query Vol
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Dump Vol
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Chronology
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-mono text-zinc-500 uppercase tracking-widest w-1/4">
                      Network Allocation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedAnalytics.map((user) => {
                    const searchPercentage =
                      totalSearches > 0
                        ? (user.total_searches / totalSearches) * 100
                        : 0;

                    return (
                      <tr key={user.user_id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono tracking-widest mt-0.5">
                              {user.email}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1 font-mono">
                            <div className="text-xs font-bold text-white">
                              TOTAL: {user.total_searches.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-indigo-400 uppercase tracking-widest">
                              T-0: {user.today_searches}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1 font-mono">
                            <div className="text-xs font-bold text-white">
                              TOTAL: {user.total_exports.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-emerald-400 uppercase tracking-widest">
                              T-0: {user.today_exports}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1 font-mono">
                            <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                              <span className="text-zinc-600">PING:</span> {formatLastActivity(user.last_login)}
                            </div>
                            <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                              <span className="text-zinc-600">QUERY:</span>{" "}
                              {formatLastActivity(user.last_search_time)}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 w-full max-w-[200px]">
                              <div className="text-[10px] font-mono text-white mb-1.5 flex justify-between">
                                <span>USAGE</span>
                                <span>{searchPercentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-white/5 rounded-full h-1 border border-white/5 overflow-hidden">
                                <div
                                  className="bg-red-500 h-full shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-500"
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
