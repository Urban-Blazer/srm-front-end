import { useQuery } from '@tanstack/react-query';
import { Stats } from '@/app/types';
import { useMemo } from 'react';
import { getSinceTimestamp } from '../utils/pool-stats';


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
