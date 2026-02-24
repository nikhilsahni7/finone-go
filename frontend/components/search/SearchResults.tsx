"use client";

import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import {
    ChevronRight,
    Copy,
    Download,
    Search as SearchIcon
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
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl shadow-lg p-6">
      <div className="pb-6 border-b border-white/5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center text-white tracking-tight">
              <SearchIcon className="w-5 h-5 text-indigo-400 mr-3" />
              QUERY OUTPUT
            </CardTitle>
            {searchResults.length > 0 ? (
              <div className="flex items-center space-x-3 mt-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {totalResults.toLocaleString()} MATCHES
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {executionTime}ms
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Displaying {searchResults.length} of {totalResults.toLocaleString()}
                </span>
              </div>
            ) : (
              searchMessage && (
                <div className="flex items-center space-x-3 mt-3">
                  <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono tracking-widest bg-zinc-800 text-zinc-400 border border-white/10">
                    0 MATCHES
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
                className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300 font-mono text-xs tracking-widest uppercase transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                DUMP DATA
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* No Results Message */}
      {searchMessage && searchResults.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-white/5 rounded-xl p-8 border border-white/10 max-w-md mx-auto">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-zinc-900 rounded-full border border-white/5 shadow-inner">
                <SearchIcon className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-sm font-mono tracking-widest uppercase text-white">
                No Nodes Found
              </h3>
              <p className="text-xs text-zinc-500 text-center uppercase tracking-widest font-mono">
                {searchMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          {searchResults.map((result, index) => (
            <div
              key={result.id || index}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Highlight bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlight(result.name, searchTerms),
                    }}
                  />
                </h3>
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono font-medium bg-black/50 border border-white/5 text-zinc-500">
                    INDEX_{index + 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopy(result)}
                    className="text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20 bg-transparent h-7 px-3 text-[10px] font-mono uppercase tracking-widest"
                  >
                    <Copy className="w-3 h-3 mr-1.5" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-4">
                  {result.mobile && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        Mobile Uplink
                      </span>
                      <span className="text-indigo-300 font-mono text-sm">
                        {result.mobile}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                      Father Name
                    </span>
                    <span
                      className="text-zinc-300 text-sm"
                      dangerouslySetInnerHTML={{
                        __html: highlight(result.fname, searchTerms),
                      }}
                    />
                  </div>

                  {result.email && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        Network Address
                      </span>
                      <span
                        className="text-zinc-300 text-sm"
                        dangerouslySetInnerHTML={{
                          __html: highlight(result.email!, searchTerms),
                        }}
                      />
                    </div>
                  )}

                  {result.master_id && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        Master Identifier
                      </span>
                      <span
                        className="text-emerald-400/90 font-mono text-sm"
                        dangerouslySetInnerHTML={{
                          __html: highlight(result.master_id!, searchTerms),
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                      Physical Coordinates
                    </span>
                    <span
                      className="text-zinc-300 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: highlight(result.address, searchTerms),
                      }}
                    />
                  </div>

                  {result.alt && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        Alternate Uplink
                      </span>
                      <span
                        className="text-zinc-400 text-sm font-mono"
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
        <div className="mt-8 text-center pt-4 border-t border-white/5">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outline"
            className="bg-transparent border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 font-mono text-xs tracking-widest uppercase px-8 h-12 rounded-xl transition-all"
          >
            {isLoading ? (
              <div className="flex items-center">
                <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping mr-3" />
                Querying further nodes...
              </div>
            ) : (
              <>
                Extend Results Scope
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
