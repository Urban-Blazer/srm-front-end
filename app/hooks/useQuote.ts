import { useQuery } from '@tanstack/react-query';

const getQuote = async (queryParams: URLSearchParams) => {

    const res = await fetch(`/api/get-quote?${queryParams}`);
    if (!res.ok) {
        throw new Error('❌ Failed to fetch chart data');
    }
    const data: { buyAmount?: string; sellAmount?: string; } = await res.json();
    return data;
};

const useQuote = (queryParams?: URLSearchParams, amountIn?: string, refetchInterval?: number) => {
    const poolId = queryParams?.get('poolId');
    const amount = queryParams?.get('amount');

    return useQuery({
        queryKey: ['get-quote', amountIn, amount],
        queryFn: () => getQuote(queryParams!),
        enabled: !!queryParams && !!amountIn && !!amount && poolId !== 'null',
        refetchInterval,
    });
};

export default useQuote;
