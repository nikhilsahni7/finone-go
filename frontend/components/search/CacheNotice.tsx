"use client";

import { HardDrive } from "lucide-react";

export default function CacheNotice({
  text = "Rendering local buffer data. Refresh to hit network nodes.",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl mb-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
      <HardDrive className="w-4 h-4 text-amber-500" />
      <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">{text}</p>
    </div>
  );
}
