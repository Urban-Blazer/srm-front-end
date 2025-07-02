import { useQuery } from "@tanstack/react-query";

export const getQuote = async (queryParams: URLSearchParams) => {
  const res = await fetch(`/api/get-quote?${queryParams}`);
  if (!res.ok) {
    throw new Error("❌ Failed to fetch chart data");
  }
  const data: { buyAmount?: string; sellAmount?: string } = await res.json();
  return data;
};

const useQuote = (
  queryParams?: URLSearchParams,
  refetchInterval?: number
) => {
  const poolId = queryParams?.get("poolId");
  const amount = queryParams?.get("amount");
  const balanceA = queryParams?.get("balanceA");
  const balanceB = queryParams?.get("balanceB");
  const lpBuilderFee = queryParams?.get("lpBuilderFee");
  const burnFee = queryParams?.get("burnFee");
  const creatorRoyaltyFee = queryParams?.get("creatorRoyaltyFee");
  const rewardsFee = queryParams?.get("rewardsFee");
  const conditions = [
    queryParams,
    amount,
    poolId,
    balanceA,
    balanceB,
    lpBuilderFee,
    burnFee,
    creatorRoyaltyFee,
    rewardsFee,
  ];
  const isEnabled =
    !conditions.includes("null") &&
    !conditions.includes("undefined") &&
    !conditions.includes(null) &&
    !conditions.includes(undefined);

  return useQuery({
    queryKey: ["get-quote", poolId, amount],
    queryFn: () => getQuote(queryParams!),
    enabled: isEnabled,
    refetchInterval,
    staleTime: refetchInterval ? refetchInterval / 2 : 0,
  });
};

export default useQuote;
