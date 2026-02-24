"use client";

import { Input } from "@/components/ui/input";
import { Filter, Search as SearchIcon } from "lucide-react";

interface SearchWithinProps {
  query: string;
  onQueryChange: (value: string) => void;
  disabled?: boolean;
}

export default function SearchWithin({
  query,
  onQueryChange,
  disabled,
}: SearchWithinProps) {
  return (
    <div className="mb-6 p-5 bg-indigo-950/20 rounded-xl border border-indigo-500/20 backdrop-blur-sm relative overflow-hidden group">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-3">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-indigo-300">
            Local Buffer Filter
          </h3>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Type to filter within loaded nodes..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            disabled={disabled}
            className="w-full pl-10 h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg transition-all font-mono text-sm"
          />
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-3 pt-3 border-t border-indigo-500/10">
          Filters memory locally. No uplink requests consumed.
        </div>
      </div>
    </div>
  );
}
