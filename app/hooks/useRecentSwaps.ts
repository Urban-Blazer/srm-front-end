import { useQuery } from '@tanstack/react-query';
import { RecentSwap } from '../types';

const fetchRecentSwaps = async (poolId: string) => {
    const res = await fetch(`/api/recent-transactions?poolId=${poolId}`);
    if (!res.ok) {
        throw new Error('❌ Failed to fetch recent swaps');
    }
    const data: RecentSwap[] = await res.json();
    return data;
};

const useRecentSwaps = (poolId: string, refetchInterval?: number) => {

    const { data, isLoading, error, refetch,  } = useQuery({
        queryKey: ['recent-transactions', poolId],
        queryFn: () => fetchRecentSwaps(poolId),
        enabled: !!poolId,
        refetchInterval,
    });

    return { data, isLoading, error, refetch };
};

export default useRecentSwaps;
