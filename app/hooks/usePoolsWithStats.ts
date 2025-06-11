"use client";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { Stats, PoolSearchResult } from '@/app/types';

import { getSinceTimestamp } from "../utils/pool-stats";
import { usePools } from "./usePools";

interface PoolWithStats extends PoolSearchResult {
  rewardsDistributed: number;
}

interface UsePoolsWithStatsOptions {
  featuredCoinBSymbol?: string;
  limit?: number;
  refetchInterval?: number;
  range?: string;
}

/**
 * Fetches and processes pool data with their stats, providing sorting functionality.
 * Pools are sorted with the following rules:
 * 1. SRM pool (coinB.symbol === "SRM") is always first
 * 2. Other pools are sorted by rewardsDistributed in descending order
 * 3. If featuredCoinBSymbol is provided, that pool will be placed at the 4th position
 * 4. By default, returns a maximum of 4 pools
 */
export function usePoolsWithStats({
  featuredCoinBSymbol,
  limit = 4,
  refetchInterval = 30 * 1000,
  range = "24h"
}: UsePoolsWithStatsOptions = {}) {
  // Fetch all pools first
  const { 
    data: poolsData, 
    isPending: isPoolsPending, 
    error: poolsError 
  } = usePools();

  const sinceMs = getSinceTimestamp(range);
  const sinceForDynamo = Math.floor(sinceMs / 1000);

  // Use react-query for fetching 24h stats for each pool
  const pairStatsQueries = useQueries({
    queries: (poolsData ?? []).map(pool => ({
      queryKey: ["pairStats", pool.poolId, range],
      queryFn: () => fetchPairStatsWithRewards(pool.poolId, range, sinceForDynamo),
      enabled: !!poolsData && !isPoolsPending,
      staleTime: 1000 * 60 * 120,
      refetchInterval
    })),
    combine: (results) => {
      return {
        data: results.map(result => result.data),
        isPending: results.some(result => result.isPending),
        isError: results.some(result => result.isError),
        errors: results.map(result => result.error).filter(Boolean)
      };
    }
  });

  // Process and sort pools once all data is available
  const processedPools = useMemo(() => {
    if (
      !poolsData || 
      isPoolsPending || 
      pairStatsQueries.isPending || 
      pairStatsQueries.isError || 
      !pairStatsQueries.data
    ) {
      return null;
    }

    // Merge pool data with their stats
    const poolsWithStats: PoolWithStats[] = poolsData.map((pool, index) => {
      const stats = pairStatsQueries.data[index];
      return {
        ...pool,
        rewardsDistributed: stats?.rewardsDistributed ? Number(stats.rewardsDistributed) : 0
      };
    });

    // Apply sorting rules
    let srmPool: PoolWithStats | undefined;
    let featuredPool: PoolWithStats | undefined;
    let otherPools: PoolWithStats[] = [];

    // Find SRM and featured pools
    poolsWithStats.forEach(pool => {
      if (pool.coinB.symbol === "SRM") {
        srmPool = pool;
      } else if (featuredCoinBSymbol && pool.coinB.symbol === featuredCoinBSymbol) {
        featuredPool = pool;
      } else if (pool.poolId === "0xf6f85ac36b35edac1016beb9c67ec7051126fc24677b55c2892cea1585726a76") {
        // do nothing    
      } else {
        otherPools.push(pool);
      }
    });

    // Sort other pools by rewards distributed
    otherPools.sort((a, b) => b.rewardsDistributed - a.rewardsDistributed);

    // Build the result array
    const result: PoolWithStats[] = [];

    // Always add SRM pool first if exists
    if (srmPool) {
      result.push(srmPool);
    }

    // Calculate remaining slots based on whether we have SRM pool and featured pool
    const hasSRM = !!srmPool;
    const hasFeatured = !!featuredPool && featuredPool !== srmPool;
    
    // If we have a featured pool, we need to reserve the 4th slot for it
    const slotsForOtherPools = hasFeatured 
      ? limit - 1 - (hasSRM ? 1 : 0) 
      : limit - (hasSRM ? 1 : 0);
    
    // Add top N other pools based on available slots
    result.push(...otherPools.slice(0, slotsForOtherPools));
    
    // If we have a featured pool and it's not already included (as SRM),
    // and we have room for 4 pools total, add it as the 4th
    if (hasFeatured && result.length < limit) {
      result.push(featuredPool!);
    }

    // Ensure we don't exceed the limit
    return result.slice(0, limit);
  }, [poolsData, isPoolsPending, pairStatsQueries.data, pairStatsQueries.isPending, pairStatsQueries.isError, featuredCoinBSymbol, limit]);

  return {
    pools: processedPools,
    isPending: isPoolsPending || pairStatsQueries.isPending,
    error: poolsError || (pairStatsQueries.isError ? pairStatsQueries.errors[0] : null)
  };
}

const fetchPairStatsWithRewards = async (poolId?: string, range?: string, since?: number) => {
    if(!poolId || !range || !since) return;
    
    // Use fetch options that work well with our server-side caching strategy
    const fetchOptions: RequestInit = {
        // Use cache: 'default' to allow the browser to use its HTTP cache
        // This works with our server's Cache-Control headers
        cache: 'default',
        // We don't need to revalidate on every request because our server
        // already handles that with stale-while-revalidate
        next: { revalidate: 0 }
    };
    
    const [statsRes, rewardsRes] = await Promise.all([
        fetch(`/api/pair-stats?poolId=${poolId}&range=${range}`, fetchOptions),
        fetch(`/api/get-rewards?poolId=${poolId}&since=${since}`, fetchOptions)
    ]);
    
    if (!statsRes.ok || !rewardsRes.ok) {
        throw new Error('❌ Failed to fetch pair stats');
    }

    const statsData = await statsRes.json();
    const rewardsData = await rewardsRes.json();

    const finalStats: Stats = {
        ...statsData,
        rewardsDistributed: rewardsData.rewardsDistributed ?? 0
    };

    return finalStats;
};