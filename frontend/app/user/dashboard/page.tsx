"use client";

import PasswordChangeModal from "@/components/password-change-modal";
import ProtectedRoute from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApiError,
  SearchRequest,
  UserAnalytics,
  exportSearchResults,
  getMyAnalytics,
  search,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { buildSearchFingerprint } from "@/lib/utils";

import CacheNotice from "@/components/search/CacheNotice";
import SearchForm from "@/components/search/SearchForm";
import SearchResults from "@/components/search/SearchResults";
import SearchWithin from "@/components/search/SearchWithin";
import {
  AlertCircle,
  Clock,
  Key,
  LogOut,
  RefreshCw,
  TrendingUp,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

const defaultCriteria = {
  customerName: "",
  fatherName: "",
  mobileNumber: "",
  alternateNumber: "",
  emailAddress: "",
  masterId: "",
  address: "",
  pincode: "",
};

export default function UserDashboard() {
  const { user: currentUser, logout: authLogout, refreshUser } = useAuth();
  const [searchCriteria, setSearchCriteria] = useState({ ...defaultCriteria });

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
  const [originalSearchResults, setOriginalSearchResults] = useState<
    SearchResult[]
  >([]);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [isEnhancedMobileSearch, setIsEnhancedMobileSearch] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [restoredFromCache, setRestoredFromCache] = useState(false);

  // Refs for scrolling behavior
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const searchCardRef = useRef<HTMLDivElement | null>(null);

  const CACHE_KEY_PREFIX = "finone:last_search:";
  const getCacheKey = () =>
    `${CACHE_KEY_PREFIX}${currentUser?.id || "anonymous"}`;

  // Helper function to detect if search will use enhanced mobile search
  const isLikelyMobileNumber = (value: string) => {
    if (!value) return false;
    const cleaned = value.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 12;
  };

  // Helper function to detect if current search criteria will trigger enhanced mobile search
  const willUseEnhancedMobileSearch = () => {
    // Only trigger if exactly one of mobileNumber or alternateNumber is non-empty
    // and looks like a mobile number, and all other fields are empty
    const otherFieldsEmpty =
      !searchCriteria.customerName.trim() &&
      !searchCriteria.fatherName.trim() &&
      !searchCriteria.emailAddress.trim() &&
      !searchCriteria.masterId.trim() &&
      !searchCriteria.address.trim() &&
      !(searchCriteria.pincode || "").trim();

    const mobileSet = searchCriteria.mobileNumber?.trim() || "";
    const altSet = searchCriteria.alternateNumber?.trim() || "";

    const mobileLooks = isLikelyMobileNumber(mobileSet);
    const altLooks = isLikelyMobileNumber(altSet);

    const countMobileFields = (mobileSet ? 1 : 0) + (altSet ? 1 : 0);

    if (!otherFieldsEmpty) return false;
    if (countMobileFields !== 1) return false;
    return mobileLooks || altLooks;
  };

  // Smoothly scroll viewport to the results section
  const scrollToResults = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
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
    const terms = [] as string[];

    // Add search criteria terms
    Object.values(searchCriteria).forEach((value) => {
      const v =
        typeof value === "string" ? value : value == null ? "" : String(value);
      if (v.trim()) {
        terms.push(v.trim());
      }
    });

    // Add search within query if present
    if (searchWithinQuery.trim()) {
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
        console.log("Copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // Cache helpers
  const buildRequestAndFingerprint = () => {
    const fieldQueries: { [key: string]: string } = {};
    if (searchCriteria.customerName.trim())
      fieldQueries.name = searchCriteria.customerName.trim();
    if (searchCriteria.fatherName.trim())
      fieldQueries.fname = searchCriteria.fatherName.trim();
    if (searchCriteria.mobileNumber.trim())
      fieldQueries.mobile = searchCriteria.mobileNumber.trim();
    if (searchCriteria.alternateNumber.trim())
      fieldQueries.alt = searchCriteria.alternateNumber.trim();
    if (searchCriteria.emailAddress.trim())
      fieldQueries.email = searchCriteria.emailAddress.trim();
    if (searchCriteria.masterId.trim())
      fieldQueries.master_id = searchCriteria.masterId.trim();
    if (searchCriteria.address.trim())
      fieldQueries.address = searchCriteria.address.trim();
    if ((searchCriteria.pincode || "").trim())
      fieldQueries.pincode = (searchCriteria.pincode || "").trim();

    const request: SearchRequest = {
      query: Object.values(fieldQueries).join(" "),
      field_queries: fieldQueries,
      fields: Object.keys(fieldQueries),
      logic: searchLogic,
      match_type: "partial",
      limit: pageSize,
      offset: 0,
      search_within: false,
    } as any;

    const fingerprint = buildSearchFingerprint({
      query: request.query,
      fields: request.fields,
      field_queries: request.field_queries,
      logic: request.logic,
      match_type: request.match_type,
      enhanced_mobile: willUseEnhancedMobileSearch(),
    });

    return { request, fingerprint };
  };

  const saveCache = (payload: {
    fingerprint: string;
    request: any;
    response: any;
    criteria: typeof searchCriteria;
    logic: typeof searchLogic;
  }) => {
    try {
      localStorage.setItem(
        getCacheKey(),
        JSON.stringify({
          ...payload,
          saved_at: Date.now(),
        })
      );
    } catch {}
  };

  const loadCache = () => {
    try {
      const raw = localStorage.getItem(getCacheKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // Initialize dashboard and restore cache
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (!currentUser) {
          return;
        }

        const analytics = await getMyAnalytics();
        setUserAnalytics(analytics);

        // Restore cache
        const cached = loadCache();
        if (cached?.response) {
          setSearchResults(cached.response.results || []);
          setTotalResults(cached.response.total_count || 0);
          setHasMore(cached.response.has_more || false);
          setExecutionTime(cached.response.execution_time_ms || 0);
          setSearchId(cached.response.search_id || "");
          setOriginalSearchResults(cached.response.results || []);
          // Merge with defaults to ensure new fields (like pincode) are defined
          setSearchCriteria({ ...defaultCriteria, ...(cached.criteria || {}) });
          setSearchLogic(cached.logic || "AND");
          setRestoredFromCache(true);
        }
      } catch (err) {
        console.error("Dashboard initialization error:", err);
        if (err instanceof ApiError && err.status === 401) {
          return;
        }
        setError("Failed to load dashboard data");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSearch = async (e: React.FormEvent) => {
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
      // Regular search - build field-specific search request
      const { request: baseRequest, fingerprint } =
        buildRequestAndFingerprint();

      // If we have cached response with same fingerprint, reuse it and skip network
      const cached = loadCache();
      if (cached && cached.fingerprint === fingerprint && cached.response) {
        const data = cached.response;
        setSearchResults(data.results || []);
        setTotalResults(data.total_count || 0);
        setHasMore(data.has_more || false);
        setExecutionTime(data.execution_time_ms || 0);
        setSearchId(data.search_id || "");
        setOriginalSearchResults(data.results || []);
        setCurrentPage(1);
        setSearchWithinQuery("");
        setSearchMessage(data.message || "");
        setRestoredFromCache(true);
        scrollToResults();
        return;
      }

      const optimalPageSize = getOptimalPageSize(1000);
      setPageSize(optimalPageSize);

      // Detect if enhanced mobile search will be used
      const willUseEnhanced = willUseEnhancedMobileSearch();
      setIsEnhancedMobileSearch(willUseEnhanced);

      const searchRequest: SearchRequest = {
        ...baseRequest,
        limit: optimalPageSize,
        offset: 0,
      };

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
        setSearchWithinQuery("");
        setSearchMessage(data.message || "");
        setRestoredFromCache(false);
        scrollToResults();

        // Save to cache
        saveCache({
          fingerprint,
          request: searchRequest,
          response: data,
          criteria: searchCriteria,
          logic: searchLogic,
        });

        // Refresh user analytics after successful search with results
        if (data.total_count > 0) {
          try {
            const updatedAnalytics = await getMyAnalytics();
            setUserAnalytics(updatedAnalytics);
          } catch (err) {
            console.error("Failed to refresh user analytics:", err);
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
      if ((searchCriteria.pincode || "").trim()) {
        fieldQueries.pincode = (searchCriteria.pincode || "").trim();
      }

      const searchRequest: SearchRequest = {
        query: Object.values(fieldQueries).join(" "),
        field_queries: fieldQueries,
        fields: Object.keys(fieldQueries),
        logic: searchLogic,
        match_type: "partial",
        limit: pageSize,
        offset: offset,
      };

      const data = await search(searchRequest);
      if (data && data.results) {
        // Update base results and displayed results
        setOriginalSearchResults((prev) => [...prev, ...(data.results || [])]);

        if (searchWithinQuery.trim()) {
          // If filtering is active, recompute filtered view after appending
          const start = performance.now();
          const filtered = filterResults(
            [...originalSearchResults, ...(data.results || [])],
            searchWithinQuery
          );
          const elapsed = Math.round(performance.now() - start);
          setSearchResults(filtered);
          setTotalResults(filtered.length);
          setExecutionTime(elapsed);
          setHasMore(false);
        } else {
          // No filter, simply append
          setSearchResults((prev) => [...prev, ...(data.results || [])]);
          setHasMore(data.has_more || false);
          setCurrentPage((prev) => prev + 1);
        }

        // Update cache to append page results
        const cached = loadCache();
        if (
          cached &&
          cached.response &&
          cached.response.search_id === data.search_id
        ) {
          const merged = {
            ...cached.response,
            results: [
              ...(cached.response.results || []),
              ...(data.results || []),
            ],
            has_more: data.has_more,
          };
          saveCache({
            fingerprint: cached.fingerprint,
            request: cached.request,
            response: merged,
            criteria: cached.criteria,
            logic: cached.logic,
          });
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
    setSearchWithinQuery("");
    setOriginalSearchResults([]);
    setError("");
    setIsEnhancedMobileSearch(false);
    setSearchMessage("");
    setRestoredFromCache(false);

    // Clear all search criteria
    setSearchCriteria({ ...defaultCriteria });

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

  // Client-side filter: filter within originalSearchResults when query changes
  const filterResults = (base: SearchResult[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return base;

    const fields: (keyof SearchResult)[] = [
      "name",
      "fname",
      "mobile",
      "address",
      "email",
      "master_id",
      "alt",
      "circle",
    ];

    return base.filter((item) =>
      fields.some((f) =>
        String((item as any)[f] || "")
          .toLowerCase()
          .includes(q)
      )
    );
  };

  useEffect(() => {
    // Recompute filtered results whenever query or base results change
    const start = performance.now();
    const filtered = filterResults(originalSearchResults, searchWithinQuery);
    const elapsed = Math.round(performance.now() - start);
    setSearchResults(filtered);
    if (searchWithinQuery.trim()) {
      setTotalResults(filtered.length);
      setHasMore(false);
      setExecutionTime(elapsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchWithinQuery, originalSearchResults]);

  // Moved metrics below the currentUser guard

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

  const user = currentUser as NonNullable<typeof currentUser>;
  const remainingSearches =
    user.max_searches_per_day - (userAnalytics?.today_searches || 0);
  const safeTodaySearches = userAnalytics?.today_searches || 0;
  const usagePercentage = (safeTodaySearches / user.max_searches_per_day) * 100;
  const initials = (user.name || "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
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
                  Welcome back, {user.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                <span className="text-xs text-gray-600">Daily Usage</span>
                <span className="text-sm font-semibold text-gray-900">
                  {userAnalytics?.today_searches || 0}/
                  {user.max_searches_per_day}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetSearch}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordChangeModal(true)}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <div className="hidden md:flex items-center">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3 text-sm font-semibold">
                  {initials || "U"}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={authLogout}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto flex">
          {/* Main Content */}
          <div className="flex-1 p-8">
            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Cache Notice */}
            {restoredFromCache && <CacheNotice />}

            {/* Search Form (single card) */}
            <div className="flex justify-end mb-2">
              {willUseEnhancedMobileSearch() && (
                <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                  Enhanced mobile matching
                </span>
              )}
            </div>
            <SearchForm
              searchCriteria={searchCriteria as any}
              onChange={handleInputChange as any}
              searchLogic={searchLogic}
              onChangeLogic={setSearchLogic}
              isLoading={isLoading}
              remainingSearches={remainingSearches}
              onSubmit={handleSearch}
            />

            {/* Stats Bar */}
            {(totalResults > 0 || searchMessage) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
                <Card className="shadow-sm">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Total Results</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {totalResults}
                      </p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Execution Time</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {executionTime} ms
                      </p>
                    </div>
                    <Clock className="w-5 h-5 text-gray-400" />
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Source</p>
                      <p
                        className={`text-sm font-semibold ${
                          restoredFromCache
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {restoredFromCache ? "From Cache" : "Live"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Client-side Search Within */}
            {originalSearchResults.length > 0 && (
              <SearchWithin
                query={searchWithinQuery}
                onQueryChange={(v) => {
                  setSearchWithinQuery(v);
                  // Scroll into view on first filter activation
                  if (v && !searchWithinQuery) {
                    scrollToResults();
                  }
                }}
                disabled={isLoading}
              />
            )}

            {/* Search Results */}
            {(searchResults.length > 0 || searchMessage) && (
              <div ref={resultsRef} id="results" className="scroll-mt-[120px]">
                <SearchResults
                  searchResults={searchResults}
                  totalResults={totalResults}
                  executionTime={executionTime}
                  hasMore={hasMore && !searchWithinQuery.trim()}
                  isLoading={isLoading}
                  searchId={searchId}
                  searchMessage={searchMessage}
                  onLoadMore={handleLoadMore}
                  onExport={handleExport}
                  onCopy={copyToClipboard}
                  highlight={(text, terms) => highlightSearchTerms(text, terms)}
                  getSearchTerms={getSearchTerms}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Profile + Daily Usage */}
          <div className="w-80 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-l border-gray-200 p-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <Card className="shadow-sm mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3 text-sm font-semibold">
                    {initials || "U"}
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-900">
                      {user.name}
                    </CardTitle>
                    <p className="text-xs text-gray-600">Signed in</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center text-xs text-gray-600">
                  <UserIcon className="w-4 h-4 mr-1" />
                  User Dashboard
                </div>
              </CardContent>
            </Card>

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
                  {user.max_searches_per_day} remaining.
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
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
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
