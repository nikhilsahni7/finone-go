import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Build a deterministic fingerprint string for a search payload
// It mirrors backend semantics by ignoring pagination and sorting inputs
export function buildSearchFingerprint(input: {
  query: string;
  fields?: string[];
  field_queries?: Record<string, string>;
  logic?: "AND" | "OR";
  match_type?: "partial" | "full";
  enhanced_mobile?: boolean;
}): string {
  const logic = (input.logic || "OR").toUpperCase() === "AND" ? "AND" : "OR";
  const match =
    (input.match_type || "partial").toLowerCase() === "full"
      ? "full"
      : "partial";
  const enh = input.enhanced_mobile ? "1" : "0";
  const q = (input.query || "").trim();

  const fields = [...(input.fields || [])]
    .map((f) => f.trim().toLowerCase())
    .sort();

  const fqEntries = Object.entries(input.field_queries || {})
    .map(([k, v]) => [k.trim().toLowerCase(), (v || "").trim()] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const fqString = fqEntries.map(([k, v]) => `${k}=${v}`).join(",");

  // Deterministic, readable fingerprint (no crypto dependency needed)
  return [
    `logic=${logic}`,
    `match=${match}`,
    `enh=${enh}`,
    `q=${q}`,
    `fields=${fields.join(",")}`,
    `fq=${fqString}`,
  ].join(";");
}
