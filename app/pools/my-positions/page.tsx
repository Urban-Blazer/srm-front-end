"use client";
import { useEffect, useState, useCallback } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import {
  useCurrentWallet,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME } from "../../config";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import TransactionModal from "@components/TransactionModal";
import Image from "next/image";
import ExplorerObjectLink from "@components/ExplorerLink/ExplorerObjectLink";
import { MIST_PER_SUI } from "@mysten/sui/utils";

// Define proper interfaces for better type safety
interface CoinMetadata {
  symbol: string;
  image: string;
  typeName: string;
  decimals: number;
}

interface PoolMetadata {
  poolId: string;
  coinA_metadata: CoinMetadata;
  coinB_metadata: CoinMetadata;
}

interface PoolStats {
  balance_a: bigint;
  balance_b: bigint;
  total_lp_supply: bigint;
}

interface LPToken {
  objectId: string;
  type: string;
  balance: bigint;
  poolData: PoolMetadata;
  userCoinA: number;
  userCoinB: number;
}

// Create a logger utility for better logging
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(message, ...args);
  },
};

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
  const wallet = useCurrentWallet()?.currentWallet;
  const account = useCurrentAccount();
  const walletConnected = !!wallet && !!account;
  const [lpTokens, setLpTokens] = useState<LPToken[]>([]);
  const [loading, setLoading] = useState(false);

  // State for managing LP removal UI
  const [removeOptions, setRemoveOptions] = useState<{
    [key: string]: boolean;
  }>({});
  const [removePercentage, setRemovePercentage] = useState<{
    [key: string]: number;
  }>({});
  const [withdrawAmount, setWithdrawAmount] = useState<{
    [key: string]: string;
  }>({});
  const [slippageTolerance, setSlippageTolerance] = useState<{
    [key: string]: string;
  }>({});
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState<{
    [key: string]: boolean;
  }>({});

  // Transaction modal state
  const [logs, setLogs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Improved log handling for transaction feedback
  const addLog = (message: string) => {
    logger.info(message);
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  // Open modal when processing state changes
  useEffect(() => {
    if (isProcessing) {
      setIsModalOpen(true);
    }
  }, [isProcessing]);

  // Fetch pool metadata from API
  const fetchPoolMetadata = async (
    tokenPair: string
  ): Promise<PoolMetadata | null> => {
    try {
      const poolResponse = await fetch(
        `/api/get-pool-id?tokenPair=${tokenPair}`
      );
      if (!poolResponse.ok) {
        logger.error(`Failed to fetch pool data: ${poolResponse.status}`);
        return null;
      }
      return await poolResponse.json();
    } catch (error) {
      logger.error("Error fetching pool metadata:", error);
      return null;
    }
  };

  // Filter objects by LP type
  const filterLPObjects = (objects: any[]) => {
    return objects.filter((obj) => {
      const type = obj.data?.type;
      return type && type.includes(`${PACKAGE_ID}::${DEX_MODULE_NAME}::LP<`);
    });
  };

  // Fetch all LP tokens for the connected wallet
  const fetchLPTokens = useCallback(async () => {
    if (!walletConnected || !account?.address) {
      logger.error("Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      logger.info("Fetching LP tokens for wallet:", account?.address);
      let cursor: string | null | undefined = undefined;
      let ownedObjects: any[] = [];

      // Get all owned objects
      while (true) {
        logger.info("Fetching owned objects...");
        await new Promise((resolve) => setTimeout(resolve, 350));
        const {
          data: ownedObjectsPage,
          hasNextPage,
          nextCursor,
        } = await provider.getOwnedObjects({
          owner: account?.address,
          options: { showType: true, showContent: true },
          cursor,
        });

        ownedObjects = [...ownedObjects, ...ownedObjectsPage];
        if (!hasNextPage) break;
        cursor = nextCursor;
      }

      logger.info(`Found ${ownedObjects.length} owned objects`);

      // Filter LP objects first for efficiency
      const lpObjects = filterLPObjects(ownedObjects);
      logger.info(`Found ${lpObjects.length} LP objects`);

      if (lpObjects.length === 0) {
        setLpTokens([]);
        setLoading(false);
        return;
      }

      // Extract LP tokens with detailed metadata
      const lpTokens = await Promise.all(
        lpObjects.map(async (obj) => {
          const rawType = obj.data?.type;

          // Extract CoinA and CoinB from LP type
          const lpMatch = rawType.match(/LP<([^,]+),\s?([^>]+)>/);
          if (!lpMatch) return null;

          const coinA = lpMatch[1].trim();
          const coinB = lpMatch[2].trim();
          const tokenPair = `${coinA}-${coinB}`;

          logger.info(`Processing LP token: ${tokenPair}`);

          try {
            // Fetch Pool Metadata
            const poolData = await fetchPoolMetadata(tokenPair);
            if (!poolData?.poolId) return null;

            // Fetch Pool Stats
            const poolStats = await fetchPoolStats(poolData.poolId);
            if (!poolStats) return null;

            // Calculate user's ownership share
            const userLpBalance = obj.data?.content?.fields?.balance
              ? BigInt(obj.data?.content?.fields?.balance)
              : BigInt(0);

            const totalLpSupply = BigInt(poolStats.total_lp_supply || 0);
            const balanceA = BigInt(poolStats.balance_a || 0);
            const balanceB = BigInt(poolStats.balance_b || 0);

            const ownershipPercentage =
              totalLpSupply > 0
                ? Number(userLpBalance) / Number(totalLpSupply)
                : 0;

            const coinADecimals = poolData.coinA_metadata?.decimals ?? 9;
            const coinBDecimals = poolData.coinB_metadata?.decimals ?? 9;

            const userCoinA =
              (ownershipPercentage * Number(balanceA)) /
              Math.pow(10, coinADecimals);
            const userCoinB =
              (ownershipPercentage * Number(balanceB)) /
              Math.pow(10, coinBDecimals);

            return {
              objectId: obj.data?.objectId,
              type: rawType,
              balance: userLpBalance,
              poolData: poolData,
              userCoinA: userCoinA,
              userCoinB: userCoinB,
            };
          } catch (apiError) {
            logger.error("Error processing LP token:", apiError);
            return null;
          }
        })
      );

      // Filter out null values
      const validLpTokens = lpTokens.filter(Boolean) as LPToken[];
      logger.info(`Found ${validLpTokens.length} valid LP tokens`);

      setLpTokens(validLpTokens);
    } catch (error: any) {
      logger.error("Error fetching LP tokens:", error);
      // Replace alert with better error handling
      setLogs((prev) => [
        ...prev,
        `Error fetching LP tokens: ${error.message}`,
      ]);
    } finally {
      setLoading(false);
    }
  }, [walletConnected, account?.address]);

  // Fetch pool statistics including balances and LP supply
  const fetchPoolStats = async (
    poolObjectId: string
  ): Promise<PoolStats | null> => {
    if (!poolObjectId) {
      logger.error("Invalid pool object ID");
      return null;
    }

    logger.info("Fetching pool stats for:", poolObjectId);

    try {
      const poolObject = await provider.getObject({
        id: poolObjectId,
        options: { showContent: true },
      });

      if (!poolObject?.data?.content) {
        logger.error("Pool object data is missing or invalid");
        return null;
      }

      const fields = (poolObject.data.content as any).fields;
      if (!fields) {
        logger.warn("Missing pool fields in response");
        return null;
      }

      return {
        balance_a: BigInt(fields.balance_a || 0),
        balance_b: BigInt(fields.balance_b || 0),
        total_lp_supply: BigInt(fields.lp_supply?.fields?.value || 0),
      };
    } catch (error) {
      logger.error("Error fetching pool stats:", error);
      return null;
    }
  };

  // Handle percentage-based quick selection for LP withdrawal
  const handlePercentageClick = (lp: LPToken, percentage: number) => {
    if (!lp.balance) return;
    if (percentage < 0 || percentage > 100) return;
    setRemovePercentage((prev) => ({
      ...prev,
      [lp.objectId]: percentage,
    }));
    if (percentage === 100) {
      setWithdrawAmount((prev) => ({
        ...prev,
        [lp.objectId]: (Number(lp.balance) / 1e9).toFixed(9),
      }));
      return;
    }
    const calculatedAmount = (
      (Number(lp.balance) / 1e9) *
      (percentage / 100)
    ).toFixed(9);
    setWithdrawAmount((prev) => ({
      ...prev,
      [lp.objectId]: calculatedAmount,
    }));
  };

  // Toggle Remove Liquidity UI for a specific LP
  const handleRemoveLiquidity = (lp: LPToken) => {
    setRemoveOptions((prev) => ({
      ...prev,
      [lp.objectId]: !prev[lp.objectId],
    }));

    // Reset related state values when toggling
    setWithdrawAmount((prev) => ({
      ...prev,
      [lp.objectId]: "",
    }));

    setSlippageTolerance((prev) => ({
      ...prev,
      [lp.objectId]: "1.0", // Set default slippage
    }));
  };

  /**
   * Handles the confirmation of liquidity removal
   * @param lp LP token to remove liquidity from
   */
  const handleRemoveLiquidityConfirm = async (lp: LPToken) => {
    // Reset and prepare UI state
    setLogs([]);
    setIsProcessing(true);
    setIsModalOpen(true);
    setIsRemovingLiquidity((prev) => ({ ...prev, [lp.objectId]: true }));

    if (!walletConnected || !account?.address) {
      addLog("Please connect your wallet first");
      setIsProcessing(false);
      return;
    }

    try {
      const inputAmount = withdrawAmount[lp.objectId];

      // Input validation
      if (
        !inputAmount ||
        isNaN(Number(inputAmount)) ||
        Number(inputAmount) <= 0
      ) {
        addLog("Please enter a valid LP amount");
        setIsProcessing(false);
        return;
      }

      addLog(
        `Preparing to remove ${inputAmount} LP tokens from pool ${lp.poolData?.poolId.slice(
          0,
          8
        )}...`
      );

      // Convert LP amount to on-chain representation (MIST)
      const lpWithdraw_MIST =
        removePercentage[lp.objectId] === 100
          ? BigInt(lp.balance)
          : BigInt(
              Math.floor(
                Number(inputAmount) *
                  removePercentage[lp.objectId] *
                  Number(MIST_PER_SUI)
              )
            );

      // Calculate expected output amounts based on ownership percentage
      const coinADecimals = lp.poolData?.coinA_metadata?.decimals ?? 9;
      const coinBDecimals = lp.poolData?.coinB_metadata?.decimals ?? 9;

      const withdrawFraction =
        (lpWithdraw_MIST * BigInt(1_000_000)) / lp.balance;

      // Calculate expected output amounts with proper decimal scaling
      const estimatedAOut =
        (BigInt(Math.floor(lp.userCoinA * Math.pow(10, coinADecimals))) *
          withdrawFraction) /
        BigInt(1_000_000);

      const estimatedBOut =
        (BigInt(Math.floor(lp.userCoinB * Math.pow(10, coinBDecimals))) *
          withdrawFraction) /
        BigInt(1_000_000);

      // Apply slippage tolerance to minimum output amounts
      const userSlippage = parseFloat(slippageTolerance[lp.objectId]) || 1.0;
      const slippageMultiplier = (100 - userSlippage) / 100;

      const minAOut =
        (estimatedAOut * BigInt(Math.floor(slippageMultiplier * 1_000_000))) /
        BigInt(1_000_000);
      const minBOut =
        (estimatedBOut * BigInt(Math.floor(slippageMultiplier * 1_000_000))) /
        BigInt(1_000_000);

      addLog(
        `Expected output: ~${lp.userCoinA.toFixed(4)} ${
          lp.poolData?.coinA_metadata?.symbol
        } and ~${lp.userCoinB.toFixed(4)} ${
          lp.poolData?.coinB_metadata?.symbol
        }`
      );
      addLog(
        `Minimum output (with ${userSlippage}% slippage): ${
          Number(minAOut) / Math.pow(10, coinADecimals)
        } ${lp.poolData?.coinA_metadata?.symbol} and ${
          Number(minBOut) / Math.pow(10, coinBDecimals)
        } ${lp.poolData?.coinB_metadata?.symbol}`
      );

      // Build transaction block
      const txb = new TransactionBlock();

      console.log(withdrawAmount[lp.objectId], lpWithdraw_MIST, lp.balance);

      txb.moveCall({
        target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::remove_liquidity_with_coins_and_transfer_to_sender`,
        typeArguments: [
          lp.poolData?.coinA_metadata?.typeName,
          lp.poolData?.coinB_metadata?.typeName,
        ],
        arguments: [
          txb.object(lp.poolData?.poolId),
          txb.object(lp.objectId),
          txb.pure.u64(lpWithdraw_MIST),
          txb.pure.u64(minAOut),
          txb.pure.u64(minBOut),
          txb.object("0x6"), // Clock object
        ],
      });

      // Execute transaction using our utility function
      addLog("Sending transaction to remove liquidity...");
      const executeResponse = await executeTransaction(txb);

      if (!executeResponse?.digest) {
        addLog("Transaction submission failed");
        return;
      }

      const txnDigest = executeResponse.digest;
      addLog(`Transaction submitted with digest: ${txnDigest}`);

      // Wait for transaction confirmation
      const txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        addLog("Could not confirm transaction success. Please check Explorer.");
        return;
      }

      // Success handling
      addLog(`Successfully removed ${inputAmount} LP tokens!`);
      addLog(
        `You received ${lp.poolData?.coinA_metadata?.symbol} and ${lp.poolData?.coinB_metadata?.symbol} tokens in your wallet.`
      );

      // Refresh token list after successful removal
      await fetchLPTokens();

      // Close the removal UI
      setRemoveOptions((prev) => ({
        ...prev,
        [lp.objectId]: false,
      }));
    } catch (error: any) {
      logger.error("Remove liquidity transaction failed:", error);
      addLog(`Failed to remove liquidity: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setIsProcessing(false);
      setIsRemovingLiquidity((prev) => ({ ...prev, [lp.objectId]: false }));
    }
  };

  /**
   * Executes a transaction and handles success/error callbacks
   * @param txb Transaction block to execute
   * @returns Transaction response or null if failed
   */
  const executeTransaction = async (
    txb: TransactionBlock
  ): Promise<{ digest: string } | null> => {
    try {
      return await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: txb.serialize(), chain: "sui:mainnet" },
          {
            onSuccess: (result) => resolve(result),
            onError: (error) => reject(error),
          }
        );
      });
    } catch (error: any) {
      addLog(`❌ Transaction failed: ${error.message}`);
      logger.error("Transaction execution failed:", error);
      return null;
    }
  };

  /**
   * Fetches transaction status with automatic retries
   * @param txnDigest Transaction digest to check
   * @param retries Maximum number of retry attempts
   * @param delay Delay between retries in milliseconds
   * @returns Transaction details or null if failed/timeout
   */
  const fetchTransactionWithRetry = async (
    txnDigest: string,
    retries = 20,
    delay = 5000
  ) => {
    addLog(`🔍 Monitoring transaction: ${txnDigest}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        addLog(`🔄 Attempt ${attempt}: Checking transaction status...`);

        const txnDetails = await provider.getTransactionBlock({
          digest: txnDigest,
          options: { showEffects: true, showEvents: true },
        });

        if (!txnDetails) {
          logger.warn(`No transaction details found on attempt ${attempt}`);
          continue;
        }

        if (!txnDetails.effects || !txnDetails.effects.status) {
          logger.warn(
            `Transaction effects not available on attempt ${attempt}`
          );
          continue;
        }

        const status = txnDetails.effects.status.status;
        addLog(`📊 Transaction status: ${status}`);

        if (status === "success") {
          addLog("✅ Transaction confirmed successfully!");
          return txnDetails;
        } else if (status === "failure") {
          const errorMsg = txnDetails.effects.status.error || "Unknown error";
          addLog(`❌ Transaction failed: ${errorMsg}`);
          logger.error("Transaction failed with status:", errorMsg);
          return null;
        }

        // If status is not success or failure, continue retrying
        logger.info(`Transaction in progress (status: ${status}), retrying...`);
      } catch (error: any) {
        if (
          error.message?.includes("Could not find the referenced transaction")
        ) {
          logger.warn(`Transaction not indexed yet on attempt ${attempt}`);
        } else {
          logger.error(
            `Error checking transaction on attempt ${attempt}:`,
            error
          );
        }
      }

      // Wait before next retry
      await new Promise((res) => setTimeout(res, delay));
    }

    addLog("❌ Transaction confirmation timed out after multiple attempts");
    logger.error("All retry attempts failed for transaction:", txnDigest);
    return null;
  };

  useEffect(() => {
    if (walletConnected && account?.address) {
      fetchLPTokens();
    }
  }, [fetchLPTokens, walletConnected, account?.address]);

  // Loading spinner component for better UX
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#61F98A]"></div>
    </div>
  );

  // LP Position Card component to improve readability
  const LPPositionCard = ({ lp }: { lp: LPToken }) => {
    const isRemoving = isRemovingLiquidity[lp.objectId];

    return (
      <div
        className="p-5 border border-slate-700 bg-[#14110c] mb-6 flex flex-col items-center text-center space-y-4 rounded-none"
        key={lp.objectId}
      >
        {/* Coin Images & Symbols */}
        <div className="flex items-center justify-center space-x-1 md:space-x-2 flex-wrap">
          <Image
            src={lp.poolData?.coinA_metadata?.image || ""}
            alt="Coin A"
            width={20}
            height={20}
            className="w-8 md:w-10 h-8 md:h-10 rounded-full"
            unoptimized
          />
          <span className="text-lg md:text-xl font-semibold text-slate-100">
            {lp.poolData?.coinA_metadata?.symbol}
          </span>
          <span className="text-lg text-slate-400">/</span>
          <Image
            src={lp.poolData?.coinB_metadata?.image || ""}
            alt="Coin B"
            width={20}
            height={20}
            className="w-8 md:w-10 h-8 md:h-10 rounded-full"
            unoptimized
          />
          <span className="text-lg md:text-xl font-semibold text-slate-100">
            {lp.poolData?.coinB_metadata?.symbol}
          </span>
        </div>

        {/* Pool Information */}
        <div className="w-full">
          <p className="text-sm text-slate-300 mb-1">
            <span className="text-slate-400">Pool ID:</span>
            <ExplorerObjectLink
              objectId={lp.poolData?.poolId}
              className="text-slate-300 break-all ml-1"
            >
              {lp.poolData?.poolId.slice(0, 6) +
                "..." +
                lp.poolData?.poolId.slice(-6) || "N/A"}
            </ExplorerObjectLink>
          </p>
          <p className="text-sm text-slate-300 mb-1">
            <span className="text-slate-400">LP Object ID:</span>
            <ExplorerObjectLink
              objectId={lp.objectId}
              className="text-slate-300 break-all ml-1"
            >
              {lp.objectId.slice(0, 6) + "..." + lp.objectId.slice(-6) || "N/A"}
            </ExplorerObjectLink>
          </p>
          <p className="text-sm text-slate-300 mb-1">
            <span className="text-slate-400">Balance:</span>
            <span className="text-slate-300 ml-1">
              {(Number(lp.balance) / 1e9).toFixed(4)} LP
            </span>
          </p>
          <p className="text-sm text-slate-300">
            <span className="text-slate-400">Your Share:</span>
            <span className="text-slate-300 ml-1">
              {lp.userCoinA.toFixed(4)} {lp.poolData?.coinA_metadata?.symbol} /{" "}
              {lp.userCoinB.toFixed(4)} {lp.poolData?.coinB_metadata?.symbol}
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-3">
          {/* Add Liquidity Button */}
          <a
            href={`/pools/add-liquidity?coinA=${encodeURIComponent(
              lp.poolData?.coinA_metadata?.typeName
            )}&coinB=${encodeURIComponent(
              lp.poolData?.coinB_metadata?.typeName
            )}`}
            className={`px-4 py-2 rounded-none text-sm font-semibold ${
              isRemoving
                ? "opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
            }`}
            onClick={(e) => isRemoving && e.preventDefault()}
          >
            ADD LIQUIDITY
          </a>

          {/* Remove Liquidity Button */}
          <button
            onClick={() => handleRemoveLiquidity(lp)}
            disabled={isRemoving}
            className={`px-4 py-2 rounded-none text-sm font-semibold ${
              isRemoving
                ? "opacity-50 cursor-not-allowed bg-slate-700 text-slate-300"
                : "bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:text-[#61F98A] hover:opacity-75"
            }`}
          >
            {isRemoving ? "PROCESSING..." : "REMOVE LIQUIDITY"}
          </button>
        </div>

        {/* Remove Liquidity UI (if enabled) */}
        {removeOptions[lp.objectId] && (
          <div className="mt-4 w-full bg-[#1a1712] p-4 border border-slate-700 rounded-none text-sm md:text-base">
            <h2 className="text-lg font-semibold text-slate-100 mb-3">
              Select Withdrawal Amount
            </h2>

            {/* Percentage Quick Select Buttons */}
            <div className="flex justify-between mt-2 mb-4">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handlePercentageClick(lp, percent)}
                  disabled={isRemoving}
                  className={`flex-1 text-md mx-1 rounded-none px-3 py-1 ${
                    isRemoving
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-[#14110c] hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>

            {/* Input for LP Amount */}
            <div className="space-y-1 mb-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>LP Amount to Withdraw:</span>
              </div>
              <div className="flex justify-between items-center bg-[#14110c] px-3 py-2">
                <input
                  type="number"
                  className={`max-w-[240px] flex-1 p-2 outline-none bg-transparent text-xl sm:text-lg overflow-hidden grow ${
                    isRemoving ? "text-slate-400" : "text-slate-100"
                  }`}
                  placeholder="Enter LP amount"
                  value={withdrawAmount[lp.objectId] || ""}
                  onChange={(e) =>
                    setWithdrawAmount((prev) => ({
                      ...prev,
                      [lp.objectId]: e.target.value,
                    }))
                  }
                  disabled={isRemoving}
                />
              </div>
            </div>

            {/* Slippage Tolerance Input */}
            <div className="space-y-1 mb-6">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Slippage Tolerance (%):</span>
              </div>
              <div className="flex justify-between items-center bg-[#14110c] px-3 py-2">
                <input
                  type="number"
                  className={`max-w-[240px] flex-1 p-2 outline-none bg-transparent text-xl sm:text-lg overflow-hidden grow ${
                    isRemoving ? "text-slate-400" : "text-slate-100"
                  }`}
                  placeholder="Enter slippage (e.g., 1.0)"
                  value={slippageTolerance[lp.objectId] || ""}
                  onChange={(e) =>
                    setSlippageTolerance((prev) => ({
                      ...prev,
                      [lp.objectId]: e.target.value,
                    }))
                  }
                  disabled={isRemoving}
                />
              </div>
            </div>

            {/* Confirm Button */}
            <button
              onClick={() => handleRemoveLiquidityConfirm(lp)}
              disabled={isRemoving}
              className={`w-full px-4 py-2 rounded-none text-sm font-semibold transition mt-2 ${
                isRemoving
                  ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:text-[#61F98A] hover:opacity-75"
              }`}
            >
              {isRemoving ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#61F98A]"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                "Confirm Withdraw LP"
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center min-h-[80vh] p-4 md:p-6 pt-20 pb-20 text-slate-100 bg-[#000306]">
      <h1 className="pt-10 text-2xl md:text-3xl font-bold mb-6 text-center">
        My Liquidity Positions
      </h1>

      {/* Transaction Modal - Moved outside conditional rendering to avoid issues */}
      <TransactionModal
        open={isModalOpen}
        onClose={() => {
          if (!isProcessing) setIsModalOpen(false);
        }}
        logs={logs}
        isProcessing={isProcessing}
      />

      {!walletConnected ? (
        <div className="text-center max-w-md mx-auto bg-[#14110c] p-6 border border-slate-700 rounded-none">
          <p className="text-slate-300 mb-4">
            <strong>Connect your wallet to view your LP positions.</strong>
          </p>
          <p className="text-slate-400 text-sm">
            Your active liquidity positions will appear here after connecting.
          </p>
        </div>
      ) : (
        <>
          <button
            className={`px-4 py-2 rounded-none text-sm font-semibold ${
              loading
                ? "bg-[#14110c] text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
            }`}
            onClick={fetchLPTokens}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                <span>Loading Positions...</span>
              </div>
            ) : (
              "View My Positions"
            )}
          </button>

          {/* Display LP Positions */}
          <div className="w-full max-w-3xl mt-8 px-2 md:px-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#14110c] border border-slate-700 rounded-none">
                <LoadingSpinner />
                <p className="text-slate-300 mt-4">
                  Loading your liquidity positions...
                </p>
              </div>
            ) : lpTokens.length > 0 ? (
              lpTokens.map((lp) => <LPPositionCard key={lp.objectId} lp={lp} />)
            ) : (
              <div className="text-center p-8 bg-[#14110c] border border-slate-700 rounded-none">
                <p className="text-slate-300 mb-3">
                  <strong>No LP positions found</strong>
                </p>
                <p className="text-slate-400 text-sm">
                  You don&apos;t have any active liquidity positions yet.
                </p>
                <a
                  href="/pools"
                  className="inline-block mt-4 px-4 py-2 rounded-none text-sm font-semibold bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                >
                  Browse Pools
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
