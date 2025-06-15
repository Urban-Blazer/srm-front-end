import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// Define the pool data structure
export interface PoolRankingData {
  pool_id: string;
  coinA_symbol: string;
  coinB_symbol: string;
  coinA_image: string;
  coinB_image: string;
  coinA_decimals: number;
  price: number;
  priceChange: number;
  buyVolume: string;
  sellVolume: string;
  totalVolume: string;
  [key: string]: any; // For any additional fields
}

/**
 * Fetches pool ranking data from the API
 * @param range Time range for the data (e.g., '24h', '7d')
 * @returns Pool ranking data
 */
const fetchPoolRanking = async (range: string): Promise<PoolRankingData[]> => {
  // Use fetch options that work well with server-side caching strategy
  const fetchOptions: RequestInit = {
    cache: 'default',
    next: { revalidate: 0 }
  };
  
  const response = await fetch(`/api/pool-ranking?range=${range}`, fetchOptions);
  
  if (!response.ok) {
    throw new Error('Failed to fetch pool ranking data');
  }
  
  return await response.json();
};

/**
 * Hook for fetching and managing pool ranking data
 * @param range Time range for the data (e.g., '24h', '7d')
 * @param refetchInterval How often to refetch data in milliseconds
 * @returns Object containing pools data, loading states, and error info
 */
const usePoolRanking = (range: string = '24h', refetchInterval?: number) => {
  const { data, isLoading, isPending, error, refetch } = useQuery({
    queryKey: ['pool-ranking', range],
    queryFn: () => fetchPoolRanking(range),
    enabled: !!range,
    refetchInterval: refetchInterval || 30 * 1000, // Default to 30 seconds
    staleTime: 30 * 1000,
    refetchOnWindowFocus: 'always',
    refetchOnMount: true,
  });

  const poolRankingData = useMemo<PoolRankingData[] | null>(() => {
    if (data) {
      return data;
    }
    return null;
  }, [data]);

  return { poolRankingData, isLoading, isPending, error, refetch };
};

export default usePoolRanking;
