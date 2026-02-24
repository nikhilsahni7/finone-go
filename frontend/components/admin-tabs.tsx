"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  component: React.ReactNode;
}

interface AdminTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function AdminTabs({ tabs, defaultTab }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.component;

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-white/10 relative">
        <nav className="-mb-px flex space-x-8 overflow-x-auto custom-scrollbar" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? "border-red-500 text-red-500"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">{activeTabContent}</div>
    </div>
  );
}
