/**
 * Hook for converting string amounts to BigInt with proper decimals
 * Used in all transaction handlers (createPool, addLiquidity, swap)
 */
export function useConvertToU64() {
  /**
   * Converts a string amount with decimals to a BigInt (MIST/atomic units)
   * @param amount - String amount (e.g., "1.5")
   * @param decimals - Number of decimals for the token (e.g., 9 for SUI)
   * @returns BigInt value in atomic units
   */
  return (amount: string, decimals: number): bigint => {
    // Handle empty or invalid inputs
    if (!amount || isNaN(parseFloat(amount))) {
      return BigInt(0);
    }
    
    // Convert to atomic units (MIST) with proper decimal handling
    const val = Math.floor(parseFloat(amount) * Math.pow(10, decimals));
    return BigInt(val);
  };
}

export default useConvertToU64;
