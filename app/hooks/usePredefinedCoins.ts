"use client";
import { useQuery } from "@tanstack/react-query";
import { CoinMeta } from "@/app/types";
import { useState } from "react";

interface PaginatedCoinsResponse {
  items: CoinMeta[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    nextToken: string | null;
  };
}

interface UsePredefinedCoinsProps {
  pageSize?: number;
  list?: string;
}

const fetchPredefinedCoins = async (
  page: number = 1,
  pageSize: number = 50,
  list?: string
): Promise<PaginatedCoinsResponse> => {
  let url = `/api/coins/all?page=${page}&pageSize=${pageSize}`;
  
  if (list) {
    url += `&list=${list}`;
  }
  
  const res = await fetch(url);
  if (!res.ok) throw new Error("Get predefined coins failed");
  return await res.json();
};

export function usePredefinedCoins({ pageSize = 50, list }: UsePredefinedCoinsProps = {}) {
  const [page, setPage] = useState(1);
  const [nextToken, setNextToken] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["predefined-coins", page, pageSize, list, nextToken],
    queryFn: () => fetchPredefinedCoins(page, pageSize, list),
    staleTime: 1000 * 60, // 1 minute
  });

  const { data } = query;
  
  // Utility functions for pagination
  const goToNextPage = () => {
    if (data?.pagination.hasNextPage) {
      setPage(prev => prev + 1);
      setNextToken(data.pagination.nextToken);
    }
  };

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
      setNextToken(null); // Reset token when going back
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= (data?.pagination.totalPages || 1)) {
      setPage(pageNumber);
      setNextToken(null); // Reset token when jumping to a specific page
    }
  };

  return {
    ...query,
    coins: data?.items || [],
    pagination: data?.pagination,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    currentPage: page,
  };
}
