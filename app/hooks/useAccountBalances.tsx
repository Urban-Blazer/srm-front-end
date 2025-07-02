import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { CoinBalance } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { useMemo } from "react";
import { normalizeTokenId } from "../utils/token";

const useAccountBalances = () => {
  const account = useCurrentAccount();
  const { data, refetch } = useSuiClientQuery(
    "getAllBalances",
    {
      owner: account?.address as string,
    },
    {
      enabled: !!account,
      refetchInterval: 8000,
    },
  );

  const balances: CoinBalance[] | undefined = useMemo(() => {
    return data
      ?.filter((token) => new BigNumber(token.totalBalance).isGreaterThan(0))
      ?.map((token) => ({
        ...token,
        coinType: normalizeTokenId(token.coinType),
      }));
  }, [data]);

  const balancesObj = useMemo(() => {
    return balances?.reduce(
      (acc, token) => {
        acc[token.coinType] = token.totalBalance;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [balances]);

  return {
    list: balances,
    obj: balancesObj,
    refetch,
  };
};

export default useAccountBalances;
