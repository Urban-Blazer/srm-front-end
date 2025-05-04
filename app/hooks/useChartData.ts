import { Candle, IntervalType } from '@/app/types';
import { useQuery } from '@tanstack/react-query';

const fetchChartData = async (poolId: string, interval: IntervalType) => {
    const res = await fetch(`/api/chart-data?poolId=${poolId}&interval=${interval}`);
    if (!res.ok) {
        throw new Error('❌ Failed to fetch chart data');
    }
    const data: Candle[] = await res.json();
    return data;
};

const useChartData = (poolId: string, interval: IntervalType, refetchInterval?: number) => {

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['chart-data', poolId, interval],
        queryFn: () => fetchChartData(poolId, interval),
        enabled: !!poolId,
        refetchInterval,
    });

    return { data, isLoading, error, refetch };
};

export default useChartData;
