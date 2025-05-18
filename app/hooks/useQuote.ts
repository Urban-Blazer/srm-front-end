import { useQuery } from '@tanstack/react-query';

const getQuote = async (queryParams: URLSearchParams) => {

    const res = await fetch(`/api/get-quote?${queryParams}`);
    if (!res.ok) {
        throw new Error('❌ Failed to fetch chart data');
    }
    const data: { buyAmount?: string; sellAmount?: string; } = await res.json();
    return data;
};

const useQuote = (queryParams?: URLSearchParams, refetchInterval?: number) => {
    const poolId = queryParams?.get('poolId');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['get-quote', queryParams],
        queryFn: () => getQuote(queryParams!),
        enabled: !!poolId && poolId !== 'null',
        refetchInterval,
    });

    return { data, isLoading, error, refetch };
};

export default useQuote;
