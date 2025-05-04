import { useSuiClientQuery } from "@mysten/dapp-kit";

/**
 * Devuelve las estadísticas del pool, como los balances y las tarifas.
 */
export function useGetBalance(owner: string | null, coinType: string | undefined, refetchInterval?: number | undefined) {
  const { data, isLoading, error, refetch } = useSuiClientQuery(
    "getBalance", 
    {
      owner: owner!,
      coinType: coinType
    },
    { enabled: !!owner, refetchInterval }
  );

  return { data, isLoading, error, refetch };
}
