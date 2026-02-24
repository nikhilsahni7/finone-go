"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Search as SearchIcon } from "lucide-react";
import React from "react";

export interface SearchCriteria {
  customerName: string;
  fatherName: string;
  mobileNumber: string;
  alternateNumber: string;
  emailAddress: string;
  masterId: string;
  address: string;
  pincode: string;
}

interface SearchFormProps {
  searchCriteria: SearchCriteria;
  onChange: (field: keyof SearchCriteria, value: string) => void;
  searchLogic: "AND" | "OR";
  onChangeLogic: (logic: "AND" | "OR") => void;
  isLoading: boolean;
  remainingSearches: number;
  onSubmit: (e: React.FormEvent) => void;
}

export default function SearchForm({
  searchCriteria,
  onChange,
  searchLogic,
  onChangeLogic,
  isLoading,
  remainingSearches,
  onSubmit,
}: SearchFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !(e as React.KeyboardEvent).shiftKey) {
          // Let native form submit handle it
        }
      }}
      className="space-y-6 mb-8"
    >
      {/* Search Logic */}
      <div className="flex items-center space-x-4 p-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Search Logic:</span>
        <select
          value={searchLogic}
          onChange={(e) => onChangeLogic(e.target.value as "AND" | "OR")}
          className="border border-white/10 bg-black/60 text-white rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="AND">AND (PRECISE)</option>
          <option value="OR">OR (BROAD)</option>
        </select>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:inline-block border-l border-white/10 pl-4">
          {searchLogic === "AND"
            ? "ALL FILLED FIELDS MUST MATCH"
            : "ANY SINGLE FIELD ALLOWED TO MATCH"}
        </span>
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="space-y-2">
          <Label htmlFor="masterId" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Master ID
          </Label>
          <Input
            id="masterId"
            placeholder="UUID / MASTER ID"
            value={searchCriteria.masterId}
            onChange={(e) => onChange("masterId", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerName" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Customer Name
          </Label>
          <Input
            id="customerName"
            placeholder="FULL NAME"
            value={searchCriteria.customerName}
            onChange={(e) => onChange("customerName", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fatherName" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Father Name
          </Label>
          <Input
            id="fatherName"
            placeholder="FATHER'S NAME"
            value={searchCriteria.fatherName}
            onChange={(e) => onChange("fatherName", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobileNumber" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Mobile Number
          </Label>
          <Input
            id="mobileNumber"
            placeholder="+91 NUMBER"
            value={searchCriteria.mobileNumber}
            onChange={(e) => onChange("mobileNumber", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alternateNumber" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Alternate Number
          </Label>
          <Input
            id="alternateNumber"
            placeholder="SECONDARY NUMBER"
            value={searchCriteria.alternateNumber}
            onChange={(e) => onChange("alternateNumber", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailAddress" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Email Address
          </Label>
          <Input
            id="emailAddress"
            placeholder="EMAIL@DOMAIN.COM"
            value={searchCriteria.emailAddress}
            onChange={(e) => onChange("emailAddress", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Address
          </Label>
          <Input
            id="address"
            placeholder="STREET/CITY/STATE"
            value={searchCriteria.address}
            onChange={(e) => onChange("address", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pincode" className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 ml-1">
            Pincode
          </Label>
          <Input
            id="pincode"
            placeholder="6-DIGIT CODE"
            value={searchCriteria.pincode}
            onChange={(e) => onChange("pincode", e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs rounded-lg h-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-2">
        <span>&gt; ENTER_TO_EXECUTE_QUERY</span>
        <span className="hidden sm:inline-block">&gt; SHIFT+ENTER_TO_FILTER_RESULTS</span>
      </div>

      <Button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-14 mt-4 text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-500/50 rounded-xl"
        disabled={isLoading || remainingSearches <= 0}
      >
        {isLoading ? (
          <div className="flex items-center space-x-3">
            <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
            <span>Processing Query...</span>
          </div>
        ) : remainingSearches <= 0 ? (
          <>
            <AlertCircle className="w-5 h-5 mr-3" />
            Quota Exceeded
          </>
        ) : (
          <>
            <SearchIcon className="w-5 h-5 mr-3" />
            Execute Search [{remainingSearches} REMAINING]
          </>
        )}
      </Button>
    </form>
  );
}
