import { useMemo } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { PoolStats } from "../types";

/**
 * Devuelve las estadísticas del pool, como los balances y las tarifas.
 */
export function usePoolStats(poolId?: string | null, refetchInterval?: number | undefined) {
  const { data, isLoading, isPending, error, refetch } = useSuiClientQuery(
    "getObject", 
    {
      id: poolId!,
      options: { showContent: true, showType: true },
    },
    { enabled: !!poolId, refetchInterval }
  );

  const poolStats = useMemo<PoolStats | null>(() => {
    const raw = (data?.data?.content as any)?.fields as any;
    if (raw) {
      return {
        balance_a: raw?.balance_a ?? 0,
        balance_b: raw?.balance_b ?? 0,
        burn_fee: raw?.burn_fee ?? 0,
        creator_royalty_fee: raw?.creator_royalty_fee ?? 0,
        creator_royalty_wallet: raw?.creator_royalty_wallet ?? "",
        locked_lp_balance: raw?.locked_lp_balance ?? 0,
        lp_builder_fee: raw?.lp_builder_fee ?? 0,
        reward_balance_a: raw?.reward_balance_a ?? 0,
        rewards_fee: raw?.rewards_fee ?? 0,
      };
    }
    return null; 
  }, [data]);

  return { poolStats, isLoading, isPending, error, refetch };
}
