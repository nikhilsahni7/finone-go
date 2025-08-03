"use client";

import { Clock, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteUser,
  getUserProfile,
  getUserSearchHistory,
  RecentSearch,
  User,
  UserAnalytics,
} from "../lib/admin-api";
import {
  formatCompactDateIST,
  formatDuration,
  formatRelativeTimeIST,
  formatToIST,
} from "../lib/time-utils";
import { Button } from "./ui/button";

interface UserAnalyticsModalProps {
  isOpen: boolean;
  analytics: UserAnalytics | null;
  onClose: () => void;
  onUserDeleted?: () => void;
}

export default function UserAnalyticsModal({
  isOpen,
  analytics,
  onClose,
  onUserDeleted,
}: UserAnalyticsModalProps) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && analytics) {
      loadSearchHistory();
      loadUserProfile();
    }
  }, [isOpen, analytics]);

  const loadSearchHistory = async () => {
    if (!analytics) return;

    try {
      setLoadingSearches(true);
      setSearchError("");
      const response = await getUserSearchHistory(analytics.user_id, 15);
      setRecentSearches(response.searches);
    } catch (error: any) {
      setSearchError(error.message || "Failed to load search history");
    } finally {
      setLoadingSearches(false);
    }
  };

  const loadUserProfile = async () => {
    if (!analytics) return;

    try {
      setLoadingProfile(true);
      const profile = await getUserProfile(analytics.user_id);
      setUserProfile(profile);
    } catch (error: any) {
      console.error("Failed to load user profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!analytics || deleting) return;

    try {
      setDeleting(true);
      await deleteUser(analytics.user_id);
      setShowDeleteConfirm(false);
      onUserDeleted?.();
      onClose();
    } catch (error: any) {
      alert("Failed to delete user: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatSearchQuery = (searchQuery: any): string => {
    // Debug: log the actual search query to see its structure
    console.log("Search Query Debug:", searchQuery, typeof searchQuery);

    if (!searchQuery) {
      return "Empty search";
    }

    if (typeof searchQuery === "string") {
      // Check if it's a Base64 encoded string
      try {
        // Base64 strings typically end with = and contain only Base64 characters
        if (/^[A-Za-z0-9+/]+=*$/.test(searchQuery) && searchQuery.length > 50) {
          const decoded = atob(searchQuery);
          const parsed = JSON.parse(decoded);
          return formatSearchQuery(parsed);
        }
      } catch {
        // If Base64 decoding fails, try regular JSON parsing
      }

      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(searchQuery);
        return formatSearchQuery(parsed);
      } catch {
        // If it's a simple string and not JSON, check if it looks like a hash
        if (searchQuery.length > 50 && /^[a-zA-Z0-9]{20,}$/.test(searchQuery)) {
          return "Complex search query";
        }
        return searchQuery;
      }
    }

    if (typeof searchQuery === "object" && searchQuery !== null) {
      try {
        const queryParts: string[] = [];

        // Check for field_queries first (advanced search)
        if (
          searchQuery.field_queries &&
          typeof searchQuery.field_queries === "object"
        ) {
          const fieldMappings = {
            name: "Name",
            fname: "Father Name",
            mobile: "Mobile",
            address: "Address",
            master_id: "ID",
            email: "Email",
            circle: "Circle",
            alt: "Alt",
          };

          const fieldQueries = Object.entries(searchQuery.field_queries)
            .filter(([_, value]) => value && value !== "")
            .map(([field, value]) => {
              const label =
                fieldMappings[field as keyof typeof fieldMappings] ||
                field
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());
              return `${label}: "${value}"`;
            });

          if (fieldQueries.length > 0) {
            const logic = searchQuery.logic || "AND";
            return `${fieldQueries.join(", ")} (${logic})`;
          }
        }

        // Check for simple query string
        if (
          searchQuery.query &&
          typeof searchQuery.query === "string" &&
          searchQuery.query.trim() !== ""
        ) {
          queryParts.push(`Search: "${searchQuery.query}"`);
        }

        // Check for direct field values in the root object
        const directFields = {
          name: "Name",
          fname: "Father Name",
          email: "Email",
          phone: "Phone",
          mobile: "Mobile",
          company: "Company",
          company_name: "Company",
          address: "Address",
          city: "City",
          state: "State",
          pincode: "Pincode",
          pin_code: "Pincode",
          aadhar: "Aadhar",
          aadhar_number: "Aadhar",
          pan: "PAN",
          pan_number: "PAN",
          master_id: "ID",
          circle: "Circle",
          alt: "Alt",
        };

        Object.entries(directFields).forEach(([field, label]) => {
          if (
            searchQuery[field] &&
            typeof searchQuery[field] === "string" &&
            searchQuery[field].trim() !== ""
          ) {
            queryParts.push(`${label}: "${searchQuery[field]}"`);
          }
        });

        // If we found direct field values, return them
        if (queryParts.length > 0) {
          return queryParts.join(", ");
        }

        // Try to extract any meaningful text from unknown fields
        const meaningfulFields = Object.entries(searchQuery)
          .filter(([key, value]) => {
            return (
              value &&
              typeof value === "string" &&
              value.trim() !== "" &&
              value.length > 0 &&
              value.length < 100 && // Avoid very long strings
              !key.toLowerCase().includes("limit") &&
              !key.toLowerCase().includes("offset") &&
              !key.toLowerCase().includes("match_type") &&
              !key.toLowerCase().includes("sort") &&
              !key.toLowerCase().includes("fields") &&
              !key.toLowerCase().includes("search_within") &&
              !/^[a-zA-Z0-9]{20,}$/.test(value) // Skip hash-like strings
            );
          })
          .slice(0, 3) // Limit to first 3 fields
          .map(([key, value]) => {
            const readableKey = key
              .replace(/_/g, " ")
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()
              .replace(/^\w/, (c) => c.toUpperCase());
            return `${readableKey}: "${value}"`;
          });

        if (meaningfulFields.length > 0) {
          return meaningfulFields.join(", ");
        }

        return "Advanced search query";
      } catch (error) {
        console.error("Error formatting search query:", error);
        return "Complex query";
      }
    }

    return "Unknown query format";
  };

  if (!isOpen || !analytics) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {analytics.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                User Analytics Dashboard
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {userProfile?.role !== "ADMIN" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-200 hover:bg-red-50 text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-white/50"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - User Info & Quick Stats */}
            <div className="space-y-6">
              {/* User Profile Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {analytics.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900">
                      {analytics.name}
                    </h3>
                    <p className="text-sm text-gray-600">{analytics.email}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                      {analytics.user_id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Last Login:</span>
                    <span className="font-medium">
                      {analytics.last_login
                        ? formatToIST(analytics.last_login)
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Last Search:</span>
                    <span className="font-medium">
                      {analytics.last_search_time
                        ? formatToIST(analytics.last_search_time)
                        : "Never"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-blue-700">
                    {analytics.total_searches.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                    Total Searches
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-green-700">
                    {analytics.total_exports.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 font-medium uppercase tracking-wide">
                    Total Exports
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-purple-700">
                    {userProfile?.max_searches_per_day || "..."}
                  </div>
                  <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">
                    Max Daily Searches
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-indigo-700">
                    {analytics.today_searches}
                  </div>
                  <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
                    Today's Searches
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-orange-700">
                    {analytics.today_exports}
                  </div>
                  <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">
                    Today's Exports
                  </div>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-xl font-bold text-pink-700 leading-tight">
                    {formatCompactDateIST(analytics.last_login)}
                  </div>
                  <div className="text-xs text-pink-600 font-medium uppercase tracking-wide mt-1">
                    Last Login Date
                  </div>
                </div>
              </div>
            </div>

            {/* Right Columns - Recent Searches */}
            <div className="xl:col-span-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Search Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                        <Search className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Recent Search Activity
                        </h3>
                        <p className="text-sm text-gray-600">
                          Latest search queries and results
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadSearchHistory}
                      disabled={loadingSearches}
                      className="border-purple-200 hover:bg-purple-50 text-purple-700"
                    >
                      {loadingSearches ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search Content */}
                <div className="p-6">
                  {searchError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">{searchError}</p>
                    </div>
                  )}

                  <div className="max-h-[500px] overflow-y-auto space-y-3">
                    {loadingSearches ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    ) : Array.isArray(recentSearches) &&
                      recentSearches.length > 0 ? (
                      recentSearches.map((search, index) => (
                        <div
                          key={search.id}
                          className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200 rounded-xl p-4 border border-gray-200 shadow-sm"
                        >
                          {/* Search Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-bold text-sm">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatRelativeTimeIST(search.search_time)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatToIST(search.search_time)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {search.result_count.toLocaleString()} results
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDuration(search.execution_time_ms)}
                              </div>
                            </div>
                          </div>

                          {/* Search Query */}
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              Search Query:
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {formatSearchQuery(search.search_query)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-16">
                        <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <Search className="h-10 w-10 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          No searches found
                        </h4>
                        <p className="text-gray-600 max-w-sm mx-auto">
                          This user hasn't performed any searches yet. Search
                          activity will appear here once they start using the
                          system.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              User ID: {analytics.user_id.slice(0, 8)}...
            </div>
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-sm"
            >
              <X className="h-4 w-4 mr-2" />
              Close Analytics
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
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
                  {analytics.name}
                </span>
                ? This action will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>User account and profile</li>
                <li>
                  All search history ({analytics.total_searches} searches)
                </li>
                <li>All export records ({analytics.total_exports} exports)</li>
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
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
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
