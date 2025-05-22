"use client";
import { useQuery } from "@tanstack/react-query";
import { PoolSearchResult } from "@/app/types";

const fetchPools = async (): Promise<PoolSearchResult[]> => {
  const res = await fetch(`/api/pools`);
  if (!res.ok) throw new Error("Get pools failed");
  const { pairs } = await res.json();
  return pairs;
};

export function usePools() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: () => fetchPools(),
    staleTime: 1000 * 60, 
  });
}
