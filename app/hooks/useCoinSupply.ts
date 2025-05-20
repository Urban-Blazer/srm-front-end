import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useMemo } from "react";
import { CoinSupply } from "@mysten/sui/client";
import { SRM_COIN_SUPPLY, SRM_COINTYPE } from "../config";

export function useCoinSupply(coinType?: string | undefined, refetchInterval?: number | undefined) {
  const { data, isLoading, isPending, error, refetch, ...rest } = useSuiClientQuery(
    "getTotalSupply", 
    {
      coinType: coinType!,
    },
    { enabled: !!coinType, refetchInterval, staleTime: 60 * 60 * 1000 }

  );

    const coinSupply = useMemo<CoinSupply | undefined>(() => {
      const raw = data;
      if(!raw && coinType === SRM_COINTYPE){  
        return { value: SRM_COIN_SUPPLY.toString() } as CoinSupply;
      } else if(!raw){
        return undefined;
      }
      return raw;
    }, [data, coinType]);

  return { coinSupply, isLoading, isPending, error, refetch, ...rest };
}
