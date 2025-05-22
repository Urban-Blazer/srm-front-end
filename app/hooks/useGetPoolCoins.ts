import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useMemo } from "react";
import { PaginatedCoins } from "@mysten/sui/client";

interface CoinObject {
  coinObjectId: string;
  balance: string;
  coinType: string;
}

export function useGetPoolCoins(
  coinTypeA?: string,
  coinTypeB?: string,
  owner?: string,
  refetchInterval?: number
) {
  const account = useCurrentAccount();
  const walletAddress = owner || account?.address;

  // Query for Coin Type A
  const { 
    data: dataA, 
    isLoading: isLoadingA, 
    isPending: isPendingA, 
    error: errorA,
    refetch: refetchA 
  } = useSuiClientQuery(
    "getCoins",
    {
      owner: walletAddress!,
      coinType: coinTypeA!,
    },
    { 
      enabled: !!walletAddress && !!coinTypeA,
      refetchInterval,
      staleTime: 30 * 1000 // 30 seconds
    }
  );

  // Query for Coin Type B
  const { 
    data: dataB, 
    isLoading: isLoadingB, 
    isPending: isPendingB, 
    error: errorB,
    refetch: refetchB 
  } = useSuiClientQuery(
    "getCoins",
    {
      owner: walletAddress!,
      coinType: coinTypeB!,
    },
    { 
      enabled: !!walletAddress && !!coinTypeB,
      refetchInterval,
      staleTime: 30 * 1000 // 30 seconds
    }
  );

  // Process Coins A
  const coinsA = useMemo<CoinObject[] | undefined>(() => {
    return dataA?.data;
  }, [dataA]);

  // Process Coins B
  const coinsB = useMemo<CoinObject[] | undefined>(() => {
    return dataB?.data;
  }, [dataB]);

  // Combined loading/error states
  const isLoading = isLoadingA || isLoadingB;
  const isPending = isPendingA || isPendingB;
  const error = errorA || errorB;

  // Refetch both coin types
  const refetch = () => {
    refetchA();
    refetchB();
  };

  // Return all relevant data and states
  return {
    coinsA,
    coinsB,
    isLoading,
    isPending,
    error,
    refetch,
    // Return individual states in case they're needed
    statesA: { isLoading: isLoadingA, isPending: isPendingA, error: errorA },
    statesB: { isLoading: isLoadingB, isPending: isPendingB, error: errorB },
  };
}

export default useGetPoolCoins;
