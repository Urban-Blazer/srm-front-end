// src/hooks/useHolders.ts
import { useQuery } from '@tanstack/react-query';

export interface Holder {
    account: string;
    balance: string;
    percentage: number;  // e.g. 0.0123 === 1.23%
}

interface HoldersResponse {
    code: number;
    message: string;
    result: {
        data: Holder[];
        nextPageIndex: number;
        total: number;
    }
}

const fetchHolders = async (coinType: string): Promise<Holder[]> => {
    const url = `/api/holders?coinType=${encodeURIComponent(coinType)}&pageIndex=1&pageSize=50`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('❌ Failed to fetch holders');
    }
    const json: HoldersResponse = await res.json();
    return json.result.data;
};

const useHolders = (coinType: string) => {
    const query = useQuery({
        queryKey: ['holders', coinType],
        queryFn: () => fetchHolders(coinType),
        enabled: !!coinType,
    });

    return {
        holders: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};

export default useHolders;
