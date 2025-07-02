import { SRM_MAIN_POOL } from '../config';
import { usePoolStats } from './usePoolStats';
import useQuote from './useQuote';

/**
 * Fetches the price of SRM based on a specified amount of SUI
 * @param suiAmount Amount of SUI in decimal format (e.g., 1.5)
 * @param refetchInterval Optional interval to refetch data (in milliseconds)
 * @returns Object containing SRM quote data, loading states and error
 */
const useSRMPrice = (suiAmount?: number, refetchInterval = 60 * 1000, isEnabled = false) => {
  const { poolStats, isLoading: poolStatsLoading } = usePoolStats(
    isEnabled ? SRM_MAIN_POOL.poolId : undefined,
    refetchInterval
  );

  // Calculate the amount in base units (applying decimals)
  const suiAmountInBaseUnits = suiAmount 
    ? (suiAmount * Math.pow(10, SRM_MAIN_POOL.coinA.decimals)).toString() 
    : undefined;
  
  // Prepare query parameters for the quote
  const queryParams = poolStats && suiAmountInBaseUnits
    ? new URLSearchParams({
        poolId: SRM_MAIN_POOL.poolId,
        amount: suiAmountInBaseUnits,
        isSell: "true", // We're selling SUI for SRM
        isAtoB: "true", // SUI (coinA) to SRM (coinB)
        outputDecimals: SRM_MAIN_POOL.coinB.decimals.toString(),
        balanceA: poolStats.balance_a.toString(),
        balanceB: poolStats.balance_b.toString(),
        lpBuilderFee: poolStats.lp_builder_fee.toString(),
        burnFee: poolStats.burn_fee.toString(),
        creatorRoyaltyFee: poolStats.creator_royalty_fee.toString(),
        rewardsFee: poolStats.rewards_fee.toString(),
      })
    : undefined;

  // Get the quote using the useQuote hook
  const { 
    data: quoteData,
    isLoading: quoteLoading,
    error,
    isPending,
    refetch
  } = useQuote(isEnabled ? queryParams : undefined, refetchInterval);

  // Convert the quoted SRM amount from base units to decimal representation
  const srmAmount = quoteData?.buyAmount
    ? Number(quoteData.buyAmount)
    : undefined;

  const price = srmAmount && suiAmount
    ? suiAmount / srmAmount
    : undefined;
    

  return {
    srmAmount,
    suiAmount,
    price,
    isLoading: poolStatsLoading || quoteLoading,
    isPending,
    error,
    refetch
  };
};

export default useSRMPrice;
