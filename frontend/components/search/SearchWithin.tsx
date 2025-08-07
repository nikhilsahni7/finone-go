"use client";

import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";

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
    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center space-x-2 mb-2">
        <SearchIcon className="w-4 h-4 text-blue-600" />
        <h3 className="font-medium text-blue-900">Search Within Results</h3>
      </div>
      <Input
        placeholder="Type to filter within these results..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        disabled={disabled}
        className="flex-1"
      />
      <div className="text-xs text-gray-600 mt-2">
        Filters locally without extra requests
      </div>
    </div>
  );
}
