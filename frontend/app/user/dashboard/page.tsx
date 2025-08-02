"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  clearAuth,
  getProfile,
  getUser,
  logout,
  search,
} from "@/lib/api";
import {
  AlertCircle,
  Clock,
  Filter,
  Loader2,
  LogOut,
  Search,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
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

  const [searchLogic, setSearchLogic] = useState("AND");
  const [dailyUsage, setDailyUsage] = useState({ used: 0, limit: 30 });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check if user is authenticated
        const user = getUser();
        if (!user) {
          router.push("/user/login");
          return;
        }

        // Fetch fresh user profile from backend
        const profile = await getProfile();
        setCurrentUser(profile);

        // TODO: Fetch daily usage from backend
        // const usage = await getDailyUsage()
        // setDailyUsage(usage)
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Build search query from form data
      const filledFields = Object.entries(searchCriteria)
        .filter(([_, value]) => value.trim())
        .map(([key, value]) => value.trim())
        .join(" ");

      if (!filledFields) {
        setError("Please fill at least one search field");
        return;
      }

      const query = {
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
        limit: 100,
        offset: 0,
      };

      const data = await search(query);
      setSearchResults(data.results || []);
      setTotalResults(data.total_count || 0);
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

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuth();
      // Clear the authentication cookie
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/user/login");
    }
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
                    {dailyUsage.used}/{dailyUsage.limit}
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
                      onChange={(e) => setSearchLogic(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                    <span className="text-sm text-gray-600">
                      All filled fields must match (precise search).
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
                  <form onSubmit={handleSearch} className="space-y-6">
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
                        fields above. Use AND logic to combine criteria. All
                        filled fields must match for results. Circle field helps
                        filter by telecom circle (e.g., AIRTEL DELHI).
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-medium transition-colors"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Searching...
                        </div>
                      ) : (
                        <>
                          <Search className="w-5 h-5 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Card className="mt-6 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Search Results</span>
                      <span className="text-sm font-normal text-gray-500">
                        {totalResults.toLocaleString()} total results
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {searchResults.map((result: any, index: number) => (
                        <div
                          key={result.id || index}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-lg mb-2">
                                {result.name}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <p className="text-gray-600">
                                  <span className="font-medium">Father:</span>{" "}
                                  {result.fname}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Mobile:</span>{" "}
                                  {result.mobile}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Address:</span>{" "}
                                  {result.address}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Circle:</span>{" "}
                                  {result.circle}
                                </p>
                                {result.email && (
                                  <p className="text-gray-600">
                                    <span className="font-medium">Email:</span>{" "}
                                    {result.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
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
                    Searches used today: {dailyUsage.used} of {dailyUsage.limit}{" "}
                    remaining.
                  </p>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${(dailyUsage.used / dailyUsage.limit) * 100}%`,
                      }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-2xl font-bold text-gray-900">
                        {dailyUsage.used}
                      </p>
                      <p className="text-sm text-gray-600">Searches Today</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-2xl font-bold text-gray-900">
                        {dailyUsage.limit - dailyUsage.used}
                      </p>
                      <p className="text-sm text-gray-600">Remaining</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
