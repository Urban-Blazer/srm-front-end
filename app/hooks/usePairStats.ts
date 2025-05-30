import { useQuery } from '@tanstack/react-query';
import { Stats } from '@/app/types';
import { useMemo } from 'react';

function getSinceTimestamp(range: string): number {
    const now = Date.now();
    const olddest = new Date("12-31-2024").getTime();
    switch (range) {
        case "1h": return now - 1 * 60 * 60 * 1000;
        case "6h": return now - 6 * 60 * 60 * 1000;
        case "12h": return now - 12 * 60 * 60 * 1000;
        case "24h": return now - 24 * 60 * 60 * 1000;
        case "7d": return now - 7 * 24 * 60 * 60 * 1000;
        case "30d": return now - 30 * 24 * 60 * 60 * 1000;
        case "30d": return now - 30 * 24 * 60 * 60 * 1000;
        case "lifetime": return olddest;
        default: return 0;
    }
}

const fetchStats = async (poolId?: string, range?: string, since?: number) => {
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

const usePairStats = (poolId?: string, range?: string, refetchInterval?: number) => {
    const sinceMs = getSinceTimestamp(range ?? '24h');
    const sinceForDynamo = Math.floor(sinceMs / 1000);

    const { data, isLoading, isPending, error, refetch } = useQuery({
        queryKey: ['pair-stats', poolId, range, sinceForDynamo],
        queryFn: () => fetchStats(poolId, range, sinceForDynamo),
        enabled: (!!poolId && !!range && !!sinceForDynamo),
        refetchInterval: refetchInterval || 30 * 1000, // Default to 30 seconds if not specified
        staleTime: 30 * 1000, // Increased from 10s to 30s to align with server cache strategy
        // Only refetch on window focus if data is older than staleTime
        refetchOnWindowFocus: 'always',
        // Use minimal loading states to prevent UI flicker during background refreshes
        refetchOnMount: true,
    });



  const pairStats = useMemo<Stats | null>(() => {
    if (data) {
      return data;
    }
    return null; 
  }, [data]);

    return { pairStats, isLoading, isPending, error, refetch };
};

export default usePairStats;
