import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useCallback } from 'react';

/**
 * Interface representing a Sui coin object
 */
export interface CoinObject {
  coinObjectId: string;
  balance: string;
  coinType: string;
}

/**
 * Hook for preparing coin inputs for transactions
 * Handles both SUI and non-SUI coins, with proper merging when multiple coins are needed
 */
export function useGetCoinInput() {
  /**
   * Prepares a coin input for a transaction
   * Handles SUI gas coins specially, and merges multiple coins when needed
   * 
   * @param txb - Transaction block to add operations to
   * @param coins - Available coins to use
   * @param coinType - Type of coin being used
   * @param amount - Amount needed (in atomic units / MIST)
   * @returns The prepared coin input
   */
  return useCallback(async (
    txb: TransactionBlock,
    coins: CoinObject[],
    coinType: string,
    amount: bigint
  ) => {
    const SUI_TYPE = '0x2::sui::SUI';
    
    // Special case for SUI coins which can use the gas coin
    if (coinType === SUI_TYPE) {
      return txb.splitCoins(txb.gas, [txb.pure.u64(amount)]);
    }
    
    // For non-SUI coins, filter matching coins
    const matchingCoins = coins.filter((c) => c.coinType === coinType);
    if (matchingCoins.length === 0) {
      throw new Error(`No ${coinType} coins found in wallet`);
    }

    // Find coins needed to satisfy the amount
    let accumulated = 0n;
    const coinsToUse: CoinObject[] = [];
    
    for (const coin of matchingCoins) {
      accumulated += BigInt(coin.balance);
      coinsToUse.push(coin);
      if (accumulated >= amount) break;
    }

    if (accumulated < amount) {
      throw new Error(`Insufficient balance for ${coinType}`);
    }

    // If only one coin is needed, just split it
    if (coinsToUse.length === 1) {
      return txb.splitCoins(
        txb.object(coinsToUse[0].coinObjectId),
        [txb.pure.u64(amount)]
      );
    }
    
    // If multiple coins are needed, merge them first
    const baseCoin = coinsToUse[0];
    const rest = coinsToUse.slice(1).map(c => txb.object(c.coinObjectId));
    
    txb.mergeCoins(txb.object(baseCoin.coinObjectId), rest);
    
    return txb.splitCoins(
      txb.object(baseCoin.coinObjectId),
      [txb.pure.u64(amount)]
    );
  }, []);
}

export default useGetCoinInput;
