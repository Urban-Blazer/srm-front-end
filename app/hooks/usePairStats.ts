import { useQuery } from '@tanstack/react-query';
import { Stats } from '@/app/types';

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
    const [statsRes, rewardsRes] = await Promise.all([
        fetch(`/api/pair-stats?poolId=${poolId}&range=${range}`),
        fetch(`/api/get-rewards?poolId=${poolId}&since=${since}`)
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
        refetchInterval,
        staleTime: 10 * 1000
    });

    return { data, isLoading, isPending, error, refetch };
};

export default usePairStats;
