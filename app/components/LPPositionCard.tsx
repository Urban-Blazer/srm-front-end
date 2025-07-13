import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import {
  ChevronsDown,
  ChevronsUp,
  ExternalLinkIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PACKAGE_ID, DEX_MODULE_NAME, GETTER_RPC } from "../config";
import useCoinPrice from "../hooks/useCoinPrice";
import { LPToken } from "../types";
import ExplorerObjectLink from "./ExplorerLink/ExplorerObjectLink";
import { logger } from "../utils/logger";
import { SuiClient } from "@mysten/sui/client";
import Avatar from "./Avatar";
import Button from "./UI/Button";
import TransactionModal from "./TransactionModal";

const provider = new SuiClient({ url: GETTER_RPC });

export const LPPositionCard = ({
  lp,
  fetchLPTokens,
  setLoading,
  children,
}: {
  lp: LPToken;
  fetchLPTokens: any;
  setLoading: any;
  children?: React.ReactNode;
}) => {
  const wallet = useCurrentWallet()?.currentWallet;
  const account = useCurrentAccount();
  const walletConnected = !!wallet && !!account;
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
  const [logs, setLogs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionProgress, setTransactionProgress] = useState<{
    image: string;
    text: string;
  } | null>(null);

  const [slippageConfig, setSlippageConfig] = useState<boolean>(false);

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const isRemoving = isRemovingLiquidity[lp.objectId];

  const { data: coinAPriceUSD, isPending: isCoinPricePending } = useCoinPrice(
    lp.poolData?.coinA_metadata?.symbol
  );
  const estimatedValue = coinAPriceUSD ? coinAPriceUSD * lp.userCoinA : 0;

  // Improved log handling for transaction feedback
  const addLog = (message: string) => {
    logger.info(message);
    setLogs((prevLogs: any) => [...prevLogs, message]);
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
    setTransactionProgress({
      image: "/images/txn_loading.png",
      text: "",
    });
    setIsModalOpen(true);
    setIsRemovingLiquidity((prev) => ({ ...prev, [lp.objectId]: true }));

    if (!walletConnected || !account?.address) {
      addLog("Please connect your wallet first");
      setIsProcessing(false);
      setTransactionProgress({
        image: "/images/txn_failed.png",
        text: "",
      });
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
        setTransactionProgress({
          image: "/images/txn_failed.png",
          text: "",
        });
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
                (Number(inputAmount) * Number(MIST_PER_SUI)) *
                  (removePercentage[lp.objectId] / 100)
              )
            );

      // Calculate expected output amounts based on ownership percentage
      const coinADecimals = lp.poolData?.coinA_metadata?.decimals ?? 9;
      const coinBDecimals = lp.poolData?.coinB_metadata?.decimals ?? 9;

      const withdrawFraction =
        (lpWithdraw_MIST * BigInt(1_000)) / lp.balance;
      // Calculate expected output amounts with proper decimal scaling
      const estimatedAOut =
        (BigInt(Math.floor(lp.userCoinA * Math.pow(10, coinADecimals))) *
          withdrawFraction) /
        BigInt(1_000);

      const estimatedBOut =
        (BigInt(Math.floor(lp.userCoinB * Math.pow(10, coinBDecimals))) *
          withdrawFraction) /
        BigInt(1_000);

      // Apply slippage tolerance to minimum output amounts
      const userSlippage = parseFloat(slippageTolerance[lp.objectId]) || 1.0;
      const slippageMultiplier = (100 - userSlippage) / 100;

      const minAOut =
        (estimatedAOut * BigInt(Math.floor(slippageMultiplier * 1_000))) /
        BigInt(1_000);
      const minBOut =
        (estimatedBOut * BigInt(Math.floor(slippageMultiplier * 1_000))) /
        BigInt(1_000);
      
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
        } ${lp.poolData?.coinB_metadata?.symbol}
        ${slippageMultiplier} ${Math.floor(slippageMultiplier * 1_000)} ${userSlippage}`
      );

      // Build transaction block
      const txb = new TransactionBlock();


      txb.setGasBudget(50_000_000);
      // split LP first
      const [lpToken] = txb.splitCoins(txb.object(lp.objectId), [
        txb.pure.u64(lpWithdraw_MIST),
      ]);


      txb.moveCall({
        target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::remove_liquidity_with_coins_and_transfer_to_sender`,
        typeArguments: [
          lp.poolData?.coinA_metadata?.typeName,
          lp.poolData?.coinB_metadata?.typeName,
        ],
        arguments: [
          txb.object(lp.poolData?.poolId),
          lpToken,
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
        setTransactionProgress({
          image: "/images/txn_failed.png",
          text: "",
        });
        return;
      }

      const txnDigest = executeResponse.digest;
      addLog(`Transaction submitted with digest: ${txnDigest}`);

      // Wait for transaction confirmation
      const txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        addLog("Could not confirm transaction success. Please check Explorer.");
        setTransactionProgress({
          image: "/images/txn_failed.png",
          text: "",
        });
        return;
      }

      setTransactionProgress({
        image: "/images/txn_successful.png",
        text: "",
      });
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
      setTransactionProgress({
        image: "/images/txn_failed.png",
        text: "",
      });
    } finally {
      setLoading(false);
      setIsProcessing(false);
      setIsRemovingLiquidity((prev) => ({ ...prev, [lp.objectId]: false }));
    }
  };

  // Open modal when processing state changes
  useEffect(() => {
    if (isProcessing) {
      setIsModalOpen(true);
    }
  }, [isProcessing]);

  return (
    <div
      className="p-5 border border-slate-700 bg-[#130e18] mb-6 flex flex-col items-center text-center space-y-4 rounded-none"
      key={lp.objectId}
    >
      {/* Transaction Modal - Moved outside conditional rendering to avoid issues */}
      <TransactionModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        logs={logs}
        isProcessing={isProcessing}
        transactionProgress={transactionProgress ?? undefined}
      />
      {/* Coin Images & Symbols */}
      <div className="flex items-center justify-center space-x-1 md:space-x-2 flex-wrap">
        <Avatar
          src={lp.poolData?.coinA_metadata?.image || ""}
          alt="Coin A"
          className="w-8 md:w-10 h-8 md:h-10 rounded-full"
        />
        <span className="text-lg md:text-xl font-semibold text-slate-100">
          {lp.poolData?.coinA_metadata?.symbol}
        </span>
        <span className="text-lg text-slate-400">/</span>
        <Avatar
          src={lp.poolData?.coinB_metadata?.image || ""}
          alt="Coin B"
          className="w-8 md:w-10 h-8 md:h-10 rounded-full"
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
              lp.poolData?.poolId.slice(-6) || "N/A"}{" "}
            <ExternalLinkIcon className="w-4 h-4 ml-1 inline" />
          </ExplorerObjectLink>
        </p>
        <p className="text-sm text-slate-300 mb-1">
          <span className="text-slate-400">LP Object ID:</span>
          <ExplorerObjectLink
            objectId={lp.objectId}
            className="text-slate-300 break-all ml-1"
          >
            {lp.objectId.slice(0, 6) + "..." + lp.objectId.slice(-6) || "N/A"}{" "}
            <ExternalLinkIcon className="w-4 h-4 ml-1 inline" />
          </ExplorerObjectLink>
        </p>
        <p className="text-sm text-slate-300 mb-1">
          <span className="text-slate-400">Balance:</span>
          <span className="text-slate-300 ml-1">
            {(Number(lp.balance) / 1e9).toFixed(4)} LP
          </span>
        </p>
        <p className="text-sm text-slate-300 mb-1">
          <span className="text-slate-400">Estimated Value:</span>
          <span className="text-slate-300 ml-1">
            {(estimatedValue * 2).toFixed(4)} USD
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
      <div className="w-full flex flex-col md:flex-row gap-4">
        {/* Add Liquidity Button */}
        <a
          href={`/pools/add-liquidity?coinA=${encodeURIComponent(
            lp.poolData?.coinA_metadata?.typeName
          )}&coinB=${encodeURIComponent(
            lp.poolData?.coinB_metadata?.typeName
          )}`}
          className={`w-full px-4 py-4 rounded-none text-lg text-center content-center font-semibold ${
            isRemoving
              ? "opacity-50 cursor-not-allowed"
              : "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
          }`}
          onClick={(e) => isRemoving && e.preventDefault()}
        >
          ADD LIQUIDITY
        </a>

        {/* Remove Liquidity Button */}
        <Button
          onClick={() => handleRemoveLiquidity(lp)}
          disabled={isRemoving}
          variant="secondary"
          size="full"
          processing={isRemoving}
        >
          {isRemoving ? "PROCESSING..." : "REMOVE LIQUIDITY"}
        </Button>
      </div>

      {/* Remove Liquidity UI (if enabled) */}
      {removeOptions[lp.objectId] && (
        <div className="mt-4 w-full bg-[#1a1712] p-4 border border-slate-700 rounded-none text-sm md:text-base">
          <h2 className="text-lg font-semibold text-slate-100 mb-3">
            Remove LP - Select Withdrawal Amount
          </h2>

          {/* Percentage Quick Select Buttons */}
          <div className="flex justify-between mt-2 mb-4 gap-1 sm:gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                onClick={() => handlePercentageClick(lp, percent)}
                disabled={isRemoving}
                variant="primary"
                size="full"
                processing={isRemoving}
                className={`flex-1 text-xs sm:text-md bg-[#130e18] hover:bg-slate-600 rounded-none px-3 py-1  ${
                  removePercentage[lp.objectId] === percent
                    ? "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                    : "text-slate-300"
                }`}
              >
                {percent}%
              </Button>
            ))}
          </div>

          {/* Input for LP Amount */}
          <div className="space-y-1 mb-4">
            <div className="flex justify-between items-center bg-[#130e18] px-3 py-2">
              <input
                type="number"
                className={`flex-1 p-2 outline-none bg-transparent text-sm sm:text-md overflow-hidden grow ${
                  isRemoving ? "text-slate-400" : "text-slate-100"
                }`}
                placeholder="Enter LP amount"
                value={withdrawAmount[lp.objectId] || ""}
                onChange={(e) => {
                  setRemovePercentage((prev) => ({
                    ...prev,
                    [lp.objectId]: 0,
                  }));
                  setWithdrawAmount((prev) => ({
                    ...prev,
                    [lp.objectId]: e.target.value,
                  }));
                }}
                disabled={isRemoving}
              />
            </div>
          </div>

          {/* Slippage Tolerance Input */}
          <div className="space-y-1 mb-6">
            <div className="flex items-center justify-end text-slate-400 text-xs mt-4 gap-1 sm:gap-2">
              <span>Slippage</span>
              {[".5", "1", "2", "3"].map((s) => (
                <Button
                  key={s}
                  variant="standard"
                  size="sm"
                  onClick={() =>
                    setSlippageTolerance((prev) => ({
                      ...prev,
                      [lp.objectId]: s,
                    }))
                  }
                  className={`bg-[#130e18] hover:bg-slate-600 rounded-none px-2 py-1 ${
                    Number(s) === Number(slippageTolerance[lp.objectId])
                      ? "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                      : "text-slate-300"
                  }`}
                >
                  {s}
                </Button>
              ))}
              <span>%</span>
              <Button
                variant="standard"
                size="sm"
                className="bg-[#130e18] hover:bg-slate-600"
                onClick={() => setSlippageConfig(!slippageConfig)}
              >
                {slippageConfig ? (
                  <ChevronsDown className="w-4 h-4 cursor-pointer text-slate-300" />
                ) : (
                  <ChevronsUp className="w-4 h-4 cursor-pointer text-slate-300" />
                )}
              </Button>
            </div>
            {slippageConfig && (
              <div className="flex items-center gap-2 w-full justify-end pt-4">
                <Button
                  variant="standard"
                  size="sm"
                  className="bg-[#130e18] hover:bg-slate-600"
                  onClick={() => setSlippageTolerance((prev) => ({
                    ...prev,
                    [lp.objectId]:`${Number(prev[lp.objectId]) - 0.1}`,
                  }))}
                >
                  <MinusIcon className="w-4 h-4 cursor-pointer text-slate-300" />
                </Button>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={slippageTolerance[lp.objectId]}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setSlippageTolerance((prev) => ({
                        ...prev,
                        [lp.objectId]: "1.0",
                      }));
                    } else {
                      const parsed = parseFloat(value);
                      if (!isNaN(parsed)) {
                        setSlippageTolerance((prev) => ({
                          ...prev,
                          [lp.objectId]: `${parsed}`,
                        }));
                      }
                    }
                  }}
                  className="bg-[#130e18] w-16 text-center text-slate-100 outline-none border border-slate-600 py-1
                        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span>%</span>
                <Button
                  variant="standard"
                  size="sm"
                  className="bg-[#130e18] hover:bg-slate-600"
                  onClick={() => setSlippageTolerance((prev) => ({
                    ...prev,
                    [lp.objectId]:`${Number(prev[lp.objectId]) + 0.1}`,
                  }))}
                >
                  <PlusIcon className="w-4 h-4 cursor-pointer text-slate-300" />
                </Button>
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <Button
            onClick={() => handleRemoveLiquidityConfirm(lp)}
            disabled={isRemoving}
            variant="secondary"
            size="full"
            processing={isRemoving}
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
              "CONFIRM WITHDRAW LP"
            )}
          </Button>
        </div>
      )}
      {children}
    </div>
  );
};
