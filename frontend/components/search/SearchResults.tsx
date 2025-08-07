"use client";

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import {
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Search as SearchIcon,
} from "lucide-react";

export interface SearchResultItem {
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

interface SearchResultsProps {
  searchResults: SearchResultItem[];
  totalResults: number;
  executionTime: number;
  hasMore: boolean;
  isLoading: boolean;
  searchId: string;
  searchMessage: string;
  onLoadMore: () => void;
  onExport: () => void;
  onCopy: (item: SearchResultItem) => void;
  highlight: (text: string, searchTerms: string[]) => string;
  getSearchTerms: () => string[];
}

export default function SearchResults({
  searchResults,
  totalResults,
  executionTime,
  hasMore,
  isLoading,
  searchId,
  searchMessage,
  onLoadMore,
  onExport,
  onCopy,
  highlight,
  getSearchTerms,
}: SearchResultsProps) {
  const searchTerms = getSearchTerms();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center text-gray-900">
              <SearchIcon className="w-5 h-5 text-blue-600 mr-2" />
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
                onClick={onExport}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* No Results Message */}
      {searchMessage && searchResults.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex flex-col items-center space-y-3">
              <SearchIcon className="w-12 h-12 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">
                No Results Found
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                {searchMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          {searchResults.map((result, index) => (
            <div
              key={result.id || index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlight(result.name, searchTerms),
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
                    onClick={() => onCopy(result)}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {result.mobile && (
                    <div className="flex items-start">
                      <span className="text-gray-500 font-medium text-sm w-24">
                        Mobile:
                      </span>
                      <span className="text-blue-600 font-medium text-sm">
                        {result.mobile}
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
                        __html: highlight(result.fname, searchTerms),
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
                          __html: highlight(result.email!, searchTerms),
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
                          __html: highlight(result.master_id!, searchTerms),
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
                        __html: highlight(result.address, searchTerms),
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
                          __html: highlight(result.alt!, searchTerms),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && searchResults.length > 0 && (
        <div className="mt-6 text-center">
          <Button
            onClick={onLoadMore}
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
    </div>
  );
}
