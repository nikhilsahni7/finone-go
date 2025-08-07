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
      className="space-y-6 mb-6"
    >
      {/* Search Logic */}
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Search Logic:</span>
        <select
          value={searchLogic}
          onChange={(e) => onChangeLogic(e.target.value as "AND" | "OR")}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <span className="text-sm text-gray-600">
          {searchLogic === "AND"
            ? "All filled fields must match (precise search)"
            : "Any field can match (broader search)"}
        </span>
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="masterId"
            className="text-sm font-medium text-gray-700"
          >
            Master ID
          </Label>
          <Input
            id="masterId"
            placeholder="Enter Master ID"
            value={searchCriteria.masterId}
            onChange={(e) => onChange("masterId", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="customerName"
            className="text-sm font-medium text-gray-700"
          >
            Customer Name
          </Label>
          <Input
            id="customerName"
            placeholder="Enter customer name"
            value={searchCriteria.customerName}
            onChange={(e) => onChange("customerName", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="fatherName"
            className="text-sm font-medium text-gray-700"
          >
            Father Name
          </Label>
          <Input
            id="fatherName"
            placeholder="Enter father's name"
            value={searchCriteria.fatherName}
            onChange={(e) => onChange("fatherName", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="mobileNumber"
            className="text-sm font-medium text-gray-700"
          >
            Mobile Number
          </Label>
          <Input
            id="mobileNumber"
            placeholder="Enter mobile number"
            value={searchCriteria.mobileNumber}
            onChange={(e) => onChange("mobileNumber", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="alternateNumber"
            className="text-sm font-medium text-gray-700"
          >
            Alternate Number
          </Label>
          <Input
            id="alternateNumber"
            placeholder="Enter alternate number"
            value={searchCriteria.alternateNumber}
            onChange={(e) => onChange("alternateNumber", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="emailAddress"
            className="text-sm font-medium text-gray-700"
          >
            Email Address
          </Label>
          <Input
            id="emailAddress"
            placeholder="Enter email address"
            value={searchCriteria.emailAddress}
            onChange={(e) => onChange("emailAddress", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="address"
            className="text-sm font-medium text-gray-700"
          >
            Address
          </Label>
          <Input
            id="address"
            placeholder="Enter address or location"
            value={searchCriteria.address}
            onChange={(e) => onChange("address", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="pincode"
            className="text-sm font-medium text-gray-700"
          >
            Pincode
          </Label>
          <Input
            id="pincode"
            placeholder="Enter 6-digit pincode"
            value={searchCriteria.pincode}
            onChange={(e) => onChange("pincode", e.target.value)}
            className="focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Tip: Press Enter to search</span>
        <span>Shift+Enter searches within current results</span>
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-medium transition-colors"
        disabled={isLoading || remainingSearches <= 0}
      >
        {isLoading ? (
          <div className="flex items-center">
            <svg
              className="animate-spin h-5 w-5 mr-2 inline-block"
              viewBox="0 0 24 24"
            />
            Searching...
          </div>
        ) : remainingSearches <= 0 ? (
          <>
            <AlertCircle className="w-5 h-5 mr-2" />
            Daily Limit Reached
          </>
        ) : (
          <>
            <SearchIcon className="w-5 h-5 mr-2" />
            Search ({remainingSearches} remaining)
          </>
        )}
      </Button>
    </form>
  );
}
