"use client";

import PasswordChangeModal from "@/components/password-change-modal";
import ProtectedRoute from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  SearchRequest,
  SearchWithinRequest,
  UserAnalytics,
  exportSearchResults,
  getMyAnalytics,
  search,
  searchWithin,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Key,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
} from "lucide-react";
import Image from "next/image";
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
  const { user: currentUser, logout: authLogout, refreshUser } = useAuth();
  const [searchCriteria, setSearchCriteria] = useState({
    customerName: "",
    fatherName: "",
    mobileNumber: "",
    alternateNumber: "",
    emailAddress: "",
    masterId: "",
    address: "",
  });

  const [searchLogic, setSearchLogic] = useState<"AND" | "OR">("AND");
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
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [isEnhancedMobileSearch, setIsEnhancedMobileSearch] = useState(false);
  const [searchMessage, setSearchMessage] = useState(""); // For "No results found" message

  // Helper function to detect if search will use enhanced mobile search
  const isLikelyMobileNumber = (value: string) => {
    if (!value) return false;
    const cleaned = value.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 12;
  };

  // Helper function to detect if current search criteria will trigger enhanced mobile search
  const willUseEnhancedMobileSearch = () => {
    // Check if mobile number field has a mobile-like value
    if (
      searchCriteria.mobileNumber &&
      isLikelyMobileNumber(searchCriteria.mobileNumber)
    ) {
      return true;
    }
    // Check if alternate number field has a mobile-like value
    if (
      searchCriteria.alternateNumber &&
      isLikelyMobileNumber(searchCriteria.alternateNumber)
    ) {
      return true;
    }
    return false;
  };

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

  // Copy function to copy result data to clipboard
  const copyToClipboard = (result: SearchResult) => {
    const data = `Name: ${result.name}
Father Name: ${result.fname}
Mobile: ${result.mobile}
Address: ${result.address}
Circle: ${result.circle}${result.email ? `\nEmail: ${result.email}` : ""}${
      result.alt ? `\nAlternate: ${result.alt}` : ""
    }${result.master_id ? `\nMaster ID: ${result.master_id}` : ""}`;

    navigator.clipboard
      .writeText(data)
      .then(() => {
        // You could add a toast notification here
        console.log("Copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check if user is authenticated is handled by ProtectedRoute
        if (!currentUser) {
          return;
        }

        // Fetch user analytics from backend
        const analytics = await getMyAnalytics();
        setUserAnalytics(analytics);
      } catch (err) {
        console.error("Dashboard initialization error:", err);
        if (err instanceof ApiError && err.status === 401) {
          // Auth context will handle this automatically
          return;
        }
        setError("Failed to load dashboard data");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDashboard();
  }, [currentUser]);

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

    // Prevent multiple simultaneous searches
    if (isLoading) {
      return;
    }

    // Debounce rapid searches (prevent searches within 500ms of each other)
    const now = Date.now();
    if (now - lastSearchTime < 500) {
      return;
    }
    setLastSearchTime(now);

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
          fields: ["name", "fname", "mobile", "address", "email", "master_id"],
          match_type: "partial",
          limit: pageSize,
          offset: 0,
        };

        const data = await searchWithin(searchWithinRequest);
        setSearchResults(data.results || []);
        setTotalResults(data.total_count || 0);
        setHasMore(data.has_more || false);
        setExecutionTime(data.execution_time_ms || 0);
        setSearchMessage(data.message || ""); // Capture message from searchWithin
        setCurrentPage(1);
      } else {
        // Regular search - build field-specific search request
        const fieldQueries: { [key: string]: string } = {};

        // Map frontend form fields to backend field names
        if (searchCriteria.customerName.trim()) {
          fieldQueries.name = searchCriteria.customerName.trim();
        }
        if (searchCriteria.fatherName.trim()) {
          fieldQueries.fname = searchCriteria.fatherName.trim();
        }
        if (searchCriteria.mobileNumber.trim()) {
          fieldQueries.mobile = searchCriteria.mobileNumber.trim();
        }
        if (searchCriteria.alternateNumber.trim()) {
          fieldQueries.alt = searchCriteria.alternateNumber.trim();
        }
        if (searchCriteria.emailAddress.trim()) {
          fieldQueries.email = searchCriteria.emailAddress.trim();
        }
        if (searchCriteria.masterId.trim()) {
          fieldQueries.master_id = searchCriteria.masterId.trim();
        }
        if (searchCriteria.address.trim()) {
          fieldQueries.address = searchCriteria.address.trim();
        }

        if (Object.keys(fieldQueries).length === 0) {
          setError("Please fill at least one search field");
          return;
        }

        const optimalPageSize = getOptimalPageSize(1000);
        setPageSize(optimalPageSize);

        // Detect if enhanced mobile search will be used
        const willUseEnhanced = willUseEnhancedMobileSearch();
        setIsEnhancedMobileSearch(willUseEnhanced);

        // Create search request with field-specific queries
        const searchRequest: SearchRequest = {
          query: Object.values(fieldQueries).join(" "), // Fallback for compatibility
          field_queries: fieldQueries, // Field-specific queries (preferred)
          fields: Object.keys(fieldQueries), // List of fields being searched
          logic: searchLogic,
          match_type: "partial",
          limit: optimalPageSize,
          offset: 0,
        };

        console.log("Sending search request:", searchRequest);
        const data = await search(searchRequest);

        // Only update state if search was successful
        if (data) {
          setSearchResults(data.results || []);
          setTotalResults(data.total_count || 0);
          setHasMore(data.has_more || false);
          setExecutionTime(data.execution_time_ms || 0);
          setSearchId(data.search_id || "");
          setOriginalSearchResults(data.results || []);
          setCurrentPage(1);
          setIsSearchWithinMode(false);
          setSearchWithinQuery("");
          setSearchMessage(data.message || ""); // Capture message from API

          // Refresh user analytics to get updated daily usage ONLY after successful search with results
          if (data.total_count > 0) {
            try {
              const updatedAnalytics = await getMyAnalytics();
              setUserAnalytics(updatedAnalytics);
            } catch (err) {
              console.error("Failed to refresh user analytics:", err);
            }
          }
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
          fields: ["name", "fname", "mobile", "address", "email", "master_id"],
          match_type: "partial",
          limit: pageSize,
          offset: offset,
        };

        const data = await searchWithin(searchWithinRequest);
        if (data && data.results) {
          setSearchResults((prev) => [...prev, ...(data.results || [])]);
          setHasMore(data.has_more || false);
          setCurrentPage((prev) => prev + 1);
        }
      } else {
        // Build field-specific search request for load more (same as handleSearch)
        const fieldQueries: { [key: string]: string } = {};

        // Map frontend form fields to backend field names
        if (searchCriteria.customerName.trim()) {
          fieldQueries.name = searchCriteria.customerName.trim();
        }
        if (searchCriteria.fatherName.trim()) {
          fieldQueries.fname = searchCriteria.fatherName.trim();
        }
        if (searchCriteria.mobileNumber.trim()) {
          fieldQueries.mobile = searchCriteria.mobileNumber.trim();
        }
        if (searchCriteria.alternateNumber.trim()) {
          fieldQueries.alt = searchCriteria.alternateNumber.trim();
        }
        if (searchCriteria.emailAddress.trim()) {
          fieldQueries.email = searchCriteria.emailAddress.trim();
        }
        if (searchCriteria.masterId.trim()) {
          fieldQueries.master_id = searchCriteria.masterId.trim();
        }
        if (searchCriteria.address.trim()) {
          fieldQueries.address = searchCriteria.address.trim();
        }

        const searchRequest: SearchRequest = {
          query: Object.values(fieldQueries).join(" "), // Fallback for compatibility
          field_queries: fieldQueries, // Field-specific queries (preferred)
          fields: Object.keys(fieldQueries), // List of fields being searched
          logic: searchLogic,
          match_type: "partial",
          limit: pageSize,
          offset: offset,
        };

        const data = await search(searchRequest);
        if (data && data.results) {
          setSearchResults((prev) => [...prev, ...(data.results || [])]);
          setHasMore(data.has_more || false);
          setCurrentPage((prev) => prev + 1);
        }
      }
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
    await authLogout();
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
    setIsEnhancedMobileSearch(false); // Reset enhanced mobile search flag
    setSearchMessage(""); // Clear search message

    // Clear all search criteria
    setSearchCriteria({
      customerName: "",
      fatherName: "",
      mobileNumber: "",
      alternateNumber: "",
      emailAddress: "",
      masterId: "",
      address: "",
    });

    // Reset search logic to AND
    setSearchLogic("AND");

    // Only refresh analytics if we're not already loading
    if (!isLoading) {
      getMyAnalytics()
        .then((updatedAnalytics) => {
          setUserAnalytics(updatedAnalytics);
        })
        .catch((err) => {
          console.error("Failed to refresh analytics after reset:", err);
        });
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo-final.png"
                alt="FinnOne"
                width={120}
                height={35}
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Customer Search
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {currentUser.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Daily Usage</p>
                <p className="text-lg font-semibold text-gray-900">
                  {userAnalytics?.today_searches || 0}/
                  {currentUser.max_searches_per_day}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordChangeModal(true)}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Search Form - Fixed Position */}
            <Card className="shadow-sm mb-6">
              <CardHeader>
                <div className="flex items-center">
                  <Search className="w-5 h-5 text-blue-600 mr-2" />
                  <CardTitle className="text-lg text-gray-900">
                    Customer Search
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => handleSearch(e, false)}
                  className="space-y-6"
                >
                  {/* Search Logic */}
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Search Logic:
                    </span>
                    <select
                      value={searchLogic}
                      onChange={(e) =>
                        setSearchLogic(e.target.value as "AND" | "OR")
                      }
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                    <span className="text-sm text-gray-600">
                      {searchLogic === "AND"
                        ? "All filled fields must match (precise search)"
                        : "Any field can match (broader search)"}
                    </span>
                  </div>

                  {/* Search Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="masterId"
                        className="text-sm font-medium text-gray-700"
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
                        htmlFor="customerName"
                        className="text-sm font-medium text-gray-700"
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
                        className="text-sm font-medium text-gray-700"
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
                        className="text-sm font-medium text-gray-700"
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
                        className="text-sm font-medium text-gray-700"
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
                        className="text-sm font-medium text-gray-700"
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
                        htmlFor="address"
                        className="text-sm font-medium text-gray-700"
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

            {/* Search Results - Appears Below Search Form */}
            {(searchResults.length > 0 || searchMessage) && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center text-gray-900">
                        <Search className="w-5 h-5 text-blue-600 mr-2" />
                        Search Results
                      </CardTitle>
                      {searchResults.length > 0 ? (
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
                      ) : (
                        searchMessage && (
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              0 results
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {executionTime}ms
                            </span>
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {searchId && searchResults.length > 0 && (
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
                      <Button variant="outline" size="sm" onClick={resetSearch}>
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
                          onChange={(e) => setSearchWithinQuery(e.target.value)}
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
                          Searching within results for "{searchWithinQuery}"...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* No Results Message */}
                  {searchMessage && searchResults.length === 0 && (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex flex-col items-center space-y-3">
                          <Search className="w-12 h-12 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-900">
                            No Results Found
                          </h3>
                          <p className="text-gray-600 text-center max-w-md">
                            {searchMessage}
                          </p>
                          <div className="flex space-x-3 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetSearch}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Try Different Search
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      {searchResults.map(
                        (result: SearchResult, index: number) => {
                          const searchTerms = getSearchTerms();
                          return (
                            <div
                              key={result.id || index}
                              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
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
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    #{index + 1}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(result)}
                                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                              </div>

                              {/* Contact Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  {result.mobile && (
                                    <div className="flex items-start">
                                      <span className="text-gray-500 font-medium text-sm w-24">
                                        Mobile:
                                      </span>
                                      <span className="text-blue-600 font-medium text-sm">
                                        {formatFieldValue(
                                          result.mobile,
                                          "mobile"
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-start">
                                    <span className="text-gray-500 font-medium text-sm w-24">
                                      Father Name:
                                    </span>
                                    <span
                                      className="text-gray-700 text-sm"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerms(
                                          result.fname,
                                          searchTerms
                                        ),
                                      }}
                                    />
                                  </div>

                                  {result.email && (
                                    <div className="flex items-start">
                                      <span className="text-gray-500 font-medium text-sm w-24">
                                        Email:
                                      </span>
                                      <span
                                        className="text-gray-700 text-sm"
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

                                  {result.master_id && (
                                    <div className="flex items-start">
                                      <span className="text-gray-500 font-medium text-sm w-24">
                                        Master ID:
                                      </span>
                                      <span
                                        className="text-gray-700 text-sm"
                                        dangerouslySetInnerHTML={{
                                          __html: highlightSearchTerms(
                                            result.master_id,
                                            searchTerms
                                          ),
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-start">
                                    <span className="text-gray-500 font-medium text-sm w-24">
                                      Address:
                                    </span>
                                    <span
                                      className="text-gray-700 text-sm"
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

                                  <div className="flex items-start">
                                    <span className="text-gray-500 font-medium text-sm w-24">
                                      Circle:
                                    </span>
                                    <span
                                      className="text-gray-700 text-sm"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSearchTerms(
                                          result.circle,
                                          searchTerms
                                        ),
                                      }}
                                    />
                                  </div>

                                  {result.alt && (
                                    <div className="flex items-start">
                                      <span className="text-gray-500 font-medium text-sm w-24">
                                        Alternate:
                                      </span>
                                      <span
                                        className="text-gray-700 text-sm"
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
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* Load More Button */}
                  {hasMore && searchResults.length > 0 && (
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
          </div>

          {/* Right Panel - Daily Usage */}
          <div className="w-80 bg-white border-l border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Daily Usage
              </h3>
            </div>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                  <CardTitle className="text-base text-gray-900">
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
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-2xl font-bold text-gray-900">
                      {userAnalytics?.today_searches || 0}
                    </p>
                    <p className="text-sm text-gray-600">Searches Today</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border">
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

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordChangeModal}
        onClose={() => setShowPasswordChangeModal(false)}
        onSuccess={() => {
          // Optional: Show success message or refresh data
        }}
      />
    </ProtectedRoute>
  );
}
