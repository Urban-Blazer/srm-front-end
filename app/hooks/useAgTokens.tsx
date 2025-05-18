import { useQuery } from "@tanstack/react-query";
import { PoolSearchResult } from "../types";

const useAgTokens = () => {
  const { data } = useQuery<PoolSearchResult[]>({
    queryKey: ["agTokens"],
    queryFn: async () => {
      const response = await fetch(`/api/pools`);
      if (!response.ok) {
        throw new Error("Failed to fetch aggregator tokens");
      }
      const { pairs } = await response.json();
      return pairs;
    },
  });

  const agTokenASet = new Set(data?.map((token) => token.coinA.typeName));
  const agTokenBSet = new Set(data?.map((token) => token.coinB.typeName));
  const agTokenSet = new Set([...agTokenASet, ...agTokenBSet]);
  return {
    list: data,
    set: agTokenSet,
  };
};

export default useAgTokens;
