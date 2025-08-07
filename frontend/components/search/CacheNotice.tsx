"use client";

import { Clock } from "lucide-react";

export default function CacheNotice({
  text = "Showing your last search results. Run a new search to refresh.",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
      <Clock className="w-4 h-4 text-blue-600" />
      <p className="text-sm text-blue-800">{text}</p>
    </div>
  );
}
