"use client";
import { useQuery } from "@tanstack/react-query";
import { PoolSearchResult } from "@/app/types";
import { useState, useEffect } from "react";

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

const fetchPoolPairs = async (q: string): Promise<PoolSearchResult[]> => {
  const res = await fetch(`/api/search-pairs?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Search failed");
  const { pairs } = await res.json();
  return pairs;
};

export function usePoolSearch(query: string, debounceMs = 300) {
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  return useQuery({
    queryKey: ["search-pairs", debouncedQuery],
    queryFn: () => fetchPoolPairs(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 60, 
  });
}
