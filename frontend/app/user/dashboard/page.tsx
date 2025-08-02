"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  SearchRequest,
  SearchWithinRequest,
  UserAnalytics,
  UserProfile,
  clearAuth,
  exportSearchResults,
  getMyAnalytics,
  getProfile,
  getUser,
  logout,
  search,
  searchWithin,
} from "@/lib/api";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SearchResult {
  id: string;
  name: string;
  fname: string;
  mobile: string;
  address: string;
  circle: string;
  email?: string;
  alt?: string;
  master_id?: string;
}

export default function UserDashboard() {
  const [searchCriteria, setSearchCriteria] = useState({
    customerName: "",
    fatherName: "",
    mobileNumber: "",
    alternateNumber: "",
    emailAddress: "",
    masterId: "",
    address: "",
    circle: "",
  });

  const [searchLogic, setSearchLogic] = useState<"AND" | "OR">("OR");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [hasMore, setHasMore] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const [searchId, setSearchId] = useState("");
  const [searchWithinQuery, setSearchWithinQuery] = useState("");
  const [isSearchWithinMode, setIsSearchWithinMode] = useState(false);
  const [originalSearchResults, setOriginalSearchResults] = useState<
    SearchResult[]
  >([]);
  const router = useRouter();

  // Helper function to highlight searched terms
  const highlightSearchTerms = (text: string, searchTerms: string[]) => {
    if (!text || !searchTerms.length) return text;

    let highlightedText = text;
    searchTerms.forEach((term) => {
      if (term.trim()) {
        const regex = new RegExp(`(${term.trim()})`, "gi");
        highlightedText = highlightedText.replace(
          regex,
          '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
        );
      }
    });

    return highlightedText;
  };

  // Helper function to get search terms from current search
  const getSearchTerms = () => {
    const terms = [];

    // Add search criteria terms
    Object.values(searchCriteria).forEach((value) => {
      if (value.trim()) {
        terms.push(value.trim());
      }
    });

    // Add search within query if in search within mode
    if (isSearchWithinMode && searchWithinQuery.trim()) {
      terms.push(searchWithinQuery.trim());
    }

    return terms;
  };

  // Helper function to format field values
  const formatFieldValue = (value: string, fieldName: string) => {
    if (!value) return "-";

    switch (fieldName) {
      case "mobile":
        return value.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
      case "address":
        return value.length > 100 ? value.substring(0, 100) + "..." : value;
      case "email":
        return value.toLowerCase();
      default:
        return value;
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check if user is authenticated
        const user = getUser();
        if (!user) {
          router.push("/user/login");
          return;
        }

        // Fetch fresh user profile and analytics from backend
        const [profile, analytics] = await Promise.all([
          getProfile(),
          getMyAnalytics(),
        ]);
        setCurrentUser(profile);
        setUserAnalytics(analytics);
      } catch (err) {
        console.error("Dashboard initialization error:", err);
        if (err instanceof ApiError && err.status === 401) {
          clearAuth();
          router.push("/user/login");
          return;
        }
        setError("Failed to load dashboard data");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDashboard();
  }, [router]);

  const handleInputChange = (field: string, value: string) => {
    setSearchCriteria((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getOptimalPageSize = (totalResults: number) => {
    if (totalResults <= 1000) return 100;
    if (totalResults <= 5000) return 200;
    if (totalResults <= 20000) return 500;
    return 1000;
  };

  const handleSearch = async (e: React.FormEvent, isSearchWithin = false) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isSearchWithin) {
        // Search within previous results
        if (!searchId || !searchWithinQuery.trim()) {
          setError("Please enter a search term to search within results");
          return;
        }

        const searchWithinRequest: SearchWithinRequest = {
          search_id: searchId,
          query: searchWithinQuery.trim(),
          fields: ["name", "fname", "mobile", "address", "circle", "email"],
          match_type: "partial",
          limit: pageSize,
          offset: 0,
        };

        const data = await searchWithin(searchWithinRequest);
        setSearchResults(data.results || []);
        setTotalResults(data.total_count || 0);
        setHasMore(data.has_more || false);
        setExecutionTime(data.execution_time_ms || 0);
        setCurrentPage(1);
      } else {
        // Regular search
        const filledFields = Object.entries(searchCriteria)
          .filter(([_, value]) => value.trim())
          .map(([key, value]) => value.trim())
          .join(" ");

        if (!filledFields) {
          setError("Please fill at least one search field");
          return;
        }

        const optimalPageSize = getOptimalPageSize(1000); // Estimate
        setPageSize(optimalPageSize);

        const searchRequest: SearchRequest = {
          query: filledFields,
          fields: [
            "name",
            "fname",
            "mobile",
            "alt",
            "email",
            "master_id",
            "address",
            "circle",
          ],
          logic: searchLogic,
          match_type: "partial",
          limit: optimalPageSize,
          offset: 0,
        };

        const data = await search(searchRequest);
        setSearchResults(data.results || []);
        setTotalResults(data.total_count || 0);
        setHasMore(data.has_more || false);
        setExecutionTime(data.execution_time_ms || 0);
        setSearchId(data.search_id || "");
        setOriginalSearchResults(data.results || []);
        setCurrentPage(1);
        setIsSearchWithinMode(false);
        setSearchWithinQuery("");

        // Refresh user analytics to get updated daily usage
        try {
          const updatedAnalytics = await getMyAnalytics();
          setUserAnalytics(updatedAnalytics);
        } catch (err) {
          console.error("Failed to refresh user analytics:", err);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Search failed. Please try again.");
      }
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const offset = currentPage * pageSize;

      if (isSearchWithinMode) {
        const searchWithinRequest: SearchWithinRequest = {
          search_id: searchId,
          query: searchWithinQuery,
          fields: ["name", "fname", "mobile", "address", "circle", "email"],
          match_type: "partial",
          limit: pageSize,
          offset: offset,
        };

        const data = await searchWithin(searchWithinRequest);
        setSearchResults((prev) => [...prev, ...(data.results || [])]);
        setHasMore(data.has_more || false);
      } else {
        const filledFields = Object.entries(searchCriteria)
          .filter(([_, value]) => value.trim())
          .map(([key, value]) => value.trim())
          .join(" ");

        const searchRequest: SearchRequest = {
          query: filledFields,
          fields: [
            "name",
            "fname",
            "mobile",
            "alt",
            "email",
            "master_id",
            "address",
            "circle",
          ],
          logic: searchLogic,
          match_type: "partial",
          limit: pageSize,
          offset: offset,
        };

        const data = await search(searchRequest);
        setSearchResults((prev) => [...prev, ...(data.results || [])]);
        setHasMore(data.has_more || false);
      }

      setCurrentPage((prev) => prev + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load more results");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!searchId) {
      setError("No search results to export");
      return;
    }

    try {
      const exportData = await exportSearchResults(searchId, "csv");
      // Create download link
      const link = document.createElement("a");
      link.href = `${
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8082"
      }${exportData.download_url}`;
      link.download = exportData.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Export failed. Please try again.");
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuth();
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/user/login");
    }
  };

  const resetSearch = () => {
    setSearchResults([]);
    setTotalResults(0);
    setCurrentPage(1);
    setHasMore(false);
    setExecutionTime(0);
    setSearchId("");
    setIsSearchWithinMode(false);
    setSearchWithinQuery("");
    setOriginalSearchResults([]);
    setError("");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Loading Dashboard
          </h2>
          <p className="text-gray-500">
            Please wait while we fetch your data...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const remainingSearches =
    currentUser.max_searches_per_day - (userAnalytics?.today_searches || 0);
  const usagePercentage = userAnalytics
    ? (userAnalytics.today_searches / currentUser.max_searches_per_day) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1">
          {/* Top Header */}
          <div className="bg-gray-800 text-white px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Image
                  src="/logo-final.png"
                  alt="FinnOne"
                  width={100}
                  height={30}
                />
                <div>
                  <h1 className="text-xl font-semibold">Customer Search</h1>
                  <p className="text-sm text-gray-300">
                    Welcome back, {currentUser.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-300">Daily Usage</p>
                  <p className="text-lg font-semibold">
                    {userAnalytics?.today_searches || 0}/
                    {currentUser.max_searches_per_day}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-white border-white hover:bg-white hover:text-gray-800"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Main Content Area */}
            <div className="flex-1 p-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Search Results Summary */}
              {searchResults.length > 0 && (
                <Card className="mb-6 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          <Search className="w-5 h-5 text-blue-600 mr-2" />
                          Search Results
                        </CardTitle>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {totalResults.toLocaleString()} results
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {executionTime}ms
                          </span>
                          <span className="text-sm text-gray-600">
                            Showing {searchResults.length} of{" "}
                            {totalResults.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {searchId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetSearch}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          New Search
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Search Within */}
                    {searchResults.length > 0 && !isSearchWithinMode && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Search className="w-4 h-4 text-blue-600" />
                          <h3 className="font-medium text-blue-900">
                            Search Within Results
                          </h3>
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Search within these results..."
                            value={searchWithinQuery}
                            onChange={(e) =>
                              setSearchWithinQuery(e.target.value)
                            }
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              setIsSearchWithinMode(true);
                              handleSearch(e, true);
                            }}
                            disabled={!searchWithinQuery.trim() || isLoading}
                          >
                            {isLoading ? (
                              <div className="flex items-center">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Searching...
                              </div>
                            ) : (
                              "Search"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Search Within Loading State */}
                    {isSearchWithinMode && isLoading && (
                      <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                          <span className="text-yellow-800 font-medium">
                            Searching within results for "{searchWithinQuery}
                            "...
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    <div className="space-y-3">
                      {searchResults.map(
                        (result: SearchResult, index: number) => {
                          const searchTerms = getSearchTerms();
                          return (
                            <div
                              key={result.id || index}
                              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200"
                            >
                              {/* Header with Name and Result Number */}
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-gray-900 text-lg">
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: highlightSearchTerms(
                                        result.name,
                                        searchTerms
                                      ),
                                    }}
                                  />
                                </h3>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  #{index + 1}
                                </span>
                              </div>

                              {/* Contact Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div className="space-y-2">
                                  {result.mobile && (
                                    <div className="flex items-center text-sm">
                                      <span className="text-gray-500 w-16">
                                        📱
                                      </span>
                                      <span className="text-blue-600 font-medium">
                                        {formatFieldValue(
                                          result.mobile,
                                          "mobile"
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-start text-sm">
                                    <span className="text-gray-500 w-16">
                                      👨
                                    </span>
                                    <span
                                      className="text-gray-700"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerms(
                                          result.fname,
                                          searchTerms
                                        ),
                                      }}
                                    />
                                  </div>

                                  {result.email && (
                                    <div className="flex items-center text-sm">
                                      <span className="text-gray-500 w-16">
                                        📧
                                      </span>
                                      <span
                                        className="text-gray-700"
                                        dangerouslySetInnerHTML={{
                                          __html: highlightSearchTerms(
                                            formatFieldValue(
                                              result.email,
                                              "email"
                                            ),
                                            searchTerms
                                          ),
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-start text-sm">
                                    <span className="text-gray-500 w-16">
                                      📍
                                    </span>
                                    <span
                                      className="text-gray-700"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerms(
                                          formatFieldValue(
                                            result.address,
                                            "address"
                                          ),
                                          searchTerms
                                        ),
                                      }}
                                    />
                                  </div>

                                  <div className="flex items-center text-sm">
                                    <span className="text-gray-500 w-16">
                                      🏢
                                    </span>
                                    <span
                                      className="text-gray-700"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerms(
                                          result.circle,
                                          searchTerms
                                        ),
                                      }}
                                    />
                                  </div>

                                  {result.alt && (
                                    <div className="flex items-center text-sm">
                                      <span className="text-gray-500 w-16">
                                        📞
                                      </span>
                                      <span
                                        className="text-gray-700"
                                        dangerouslySetInnerHTML={{
                                          __html: highlightSearchTerms(
                                            result.alt,
                                            searchTerms
                                          ),
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex space-x-3 pt-2 border-t border-gray-100">
                                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                  📋 Copy
                                </button>
                                <button className="text-xs text-green-600 hover:text-green-800 font-medium">
                                  📞 Call
                                </button>
                                <button className="text-xs text-purple-600 hover:text-purple-800 font-medium">
                                  📧 Email
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                      <div className="mt-6 text-center">
                        <Button
                          onClick={handleLoadMore}
                          disabled={isLoading}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isLoading ? (
                            <div className="flex items-center">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </div>
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Load More Results
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Advanced Search Section */}
              <Card className="mb-6 shadow-sm">
                <CardHeader>
                  <div className="flex items-center">
                    <Search className="w-5 h-5 text-blue-600 mr-2" />
                    <CardTitle className="text-lg">Advanced Search</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Search for customer information using multiple criteria with
                    precise control. Optimized for large datasets with high
                    accuracy.
                  </p>

                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-sm font-medium">Search Logic:</span>
                    <select
                      value={searchLogic}
                      onChange={(e) =>
                        setSearchLogic(e.target.value as "AND" | "OR")
                      }
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="OR">OR</option>
                      <option value="AND">AND</option>
                    </select>
                    <span className="text-sm text-gray-600">
                      {searchLogic === "OR"
                        ? "Any field can match (broader search)."
                        : "All filled fields must match (precise search)."}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Search Criteria Section */}
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center">
                    <Filter className="w-5 h-5 text-blue-600 mr-2" />
                    <CardTitle className="text-lg">Search Criteria</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => handleSearch(e, false)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="customerName"
                          className="text-sm font-medium"
                        >
                          Customer Name
                        </Label>
                        <Input
                          id="customerName"
                          placeholder="Enter customer name"
                          value={searchCriteria.customerName}
                          onChange={(e) =>
                            handleInputChange("customerName", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="fatherName"
                          className="text-sm font-medium"
                        >
                          Father Name
                        </Label>
                        <Input
                          id="fatherName"
                          placeholder="Enter father's name"
                          value={searchCriteria.fatherName}
                          onChange={(e) =>
                            handleInputChange("fatherName", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="mobileNumber"
                          className="text-sm font-medium"
                        >
                          Mobile Number
                        </Label>
                        <Input
                          id="mobileNumber"
                          placeholder="Enter mobile number"
                          value={searchCriteria.mobileNumber}
                          onChange={(e) =>
                            handleInputChange("mobileNumber", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="alternateNumber"
                          className="text-sm font-medium"
                        >
                          Alternate Number
                        </Label>
                        <Input
                          id="alternateNumber"
                          placeholder="Enter alternate number"
                          value={searchCriteria.alternateNumber}
                          onChange={(e) =>
                            handleInputChange("alternateNumber", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="emailAddress"
                          className="text-sm font-medium"
                        >
                          Email Address
                        </Label>
                        <Input
                          id="emailAddress"
                          placeholder="Enter email address"
                          value={searchCriteria.emailAddress}
                          onChange={(e) =>
                            handleInputChange("emailAddress", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="masterId"
                          className="text-sm font-medium"
                        >
                          Master ID
                        </Label>
                        <Input
                          id="masterId"
                          placeholder="Enter Master ID"
                          value={searchCriteria.masterId}
                          onChange={(e) =>
                            handleInputChange("masterId", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="address"
                          className="text-sm font-medium"
                        >
                          Address
                        </Label>
                        <Input
                          id="address"
                          placeholder="Enter address or location"
                          value={searchCriteria.address}
                          onChange={(e) =>
                            handleInputChange("address", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="circle" className="text-sm font-medium">
                          Circle
                        </Label>
                        <Input
                          id="circle"
                          placeholder="Enter circle (e.g., AIRTEL DELHI)"
                          value={searchCriteria.circle}
                          onChange={(e) =>
                            handleInputChange("circle", e.target.value)
                          }
                          className="focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Search Tip */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Search Tip:</strong> Fill any combination of
                        fields above. Use OR logic for broader searches or AND
                        logic for precise matches. Circle field helps filter by
                        telecom circle (e.g., AIRTEL DELHI).
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-medium transition-colors"
                      disabled={isLoading || remainingSearches <= 0}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Searching...
                        </div>
                      ) : remainingSearches <= 0 ? (
                        <>
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Daily Limit Reached
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5 mr-2" />
                          Search ({remainingSearches} remaining)
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Daily Usage */}
            <div className="w-80 bg-gray-50 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Daily Usage
                </h3>
              </div>

              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-blue-600 mr-2" />
                    <CardTitle className="text-base">
                      Daily Search Limit
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Searches used today: {userAnalytics?.today_searches || 0} of{" "}
                    {currentUser.max_searches_per_day} remaining.
                  </p>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        usagePercentage > 80
                          ? "bg-red-600"
                          : usagePercentage > 60
                          ? "bg-yellow-600"
                          : "bg-green-600"
                      }`}
                      style={{
                        width: `${Math.min(usagePercentage, 100)}%`,
                      }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-2xl font-bold text-gray-900">
                        {userAnalytics?.today_searches || 0}
                      </p>
                      <p className="text-sm text-gray-600">Searches Today</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-2xl font-bold text-gray-900">
                        {remainingSearches}
                      </p>
                      <p className="text-sm text-gray-600">Remaining</p>
                    </div>
                  </div>

                  {remainingSearches <= 0 && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm text-red-800 text-center">
                        Daily search limit reached. Please try again tomorrow.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
