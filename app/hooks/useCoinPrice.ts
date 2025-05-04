import { useQuery } from '@tanstack/react-query';

const fetchCoinPrice = async (symbol: string) => {
    if (symbol === 'SUI') {
        const res = await fetch(`/api/get-coina-price?symbol=SUIUSD`);
        if (!res.ok) {
            throw new Error('❌ Failed to fetch coin price data');
        }
        const { price } = await res.json();
        return price as number;
    } else if(symbol === 'USDC') {
        return 1;
    }
};

const useCoinPrice = (symbol: string, refetchInterval?: number) => {

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['get-coina-price', symbol],
        queryFn: () => fetchCoinPrice(symbol),
        enabled: !!symbol,
        refetchInterval,
    });

    return { data, isLoading, error, refetch };
};

export default useCoinPrice;
