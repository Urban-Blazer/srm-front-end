import { useState } from "react";
import TransactionModal from "./TransactionModal";
import Button from "./UI/Button";
import { SuiClient } from "@mysten/sui/client";
import { DEX_MODULE_NAME, GETTER_RPC, PACKAGE_ID } from "../config";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

const provider = new SuiClient({ url: GETTER_RPC });

export const BurnLPPositionCard = ({ lp }: { lp: any }) => {
  const wallet = useCurrentWallet()?.currentWallet;
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Transaction modal state
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [removeOptions, setRemoveOptions] = useState<{
    [key: string]: boolean;
  }>({});
  const [removePercentage, setRemovePercentage] = useState<{
    [key: string]: number;
  }>({});
  const [burnAmount, setBurnAmount] = useState<{ [key: string]: string }>({});
  const [burnAgreement, setBurnAgreement] = useState<{
    [key: string]: boolean;
  }>({});
  const [transactionProgress, setTransactionProgress] = useState<{
    image: string;
    text: string;
  } | null>(null);

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
  };

  // ✅ Handle Percentage Click
  const handlePercentageClick = (lp: any, percentage: number) => {
    if (!lp.balance) return;
    if (percentage < 0 || percentage > 100) return;
    setRemovePercentage((prev) => ({
      ...prev,
      [lp.objectId]: percentage,
    }));
    const calculatedAmount = (
      (Number(lp.balance) / 1e9) *
      (percentage / 100)
    ).toFixed(percentage === 100 ? 9 : 4); // Convert from MIST
    setBurnAmount((prev) => ({
      ...prev,
      [lp.objectId]: calculatedAmount,
    }));
  };

  // ✅ Toggle Remove Liquidity UI for a specific LP
  const handleRemoveLiquidity = (lp: any) => {
    setRemoveOptions((prev) => ({
      ...prev,
      [lp.objectId]: !prev[lp.objectId], // Toggle state
    }));

    // Reset Withdraw Amount
    setBurnAmount((prev) => ({
      ...prev,
      [lp.objectId]: "", // Clear previous input when toggling
    }));
  };
  // ✅ Add this function before calling it in handleRemoveLiquidityConfirm
  const fetchTransactionWithRetry = async (
    txnDigest: string,
    retries = 20,
    delay = 5000
  ) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `🔍 Attempt ${attempt}: Fetching transaction details for digest: ${txnDigest}`
        );
        const txnDetails = await provider.getTransactionBlock({
          digest: txnDigest,
          options: { showEffects: true, showEvents: true },
        });

        if (txnDetails) {
          console.log("✅ Full Transaction Details:", txnDetails);

          if (txnDetails.effects && txnDetails.effects.status) {
            console.log("📡 Transaction Status:", txnDetails.effects.status);

            if (txnDetails.effects.status.status === "success") {
              return txnDetails; // ✅ Transaction confirmed
            } else {
              console.error(
                "❌ Transaction Failed!",
                txnDetails.effects.status.error
              );
              return null; // ❌ Stop if transaction failed
            }
          }
        }
      } catch (error) {
        console.warn(
          `⚠️ Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`,
          error
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    console.error(
      "❌ All retry attempts failed. Transaction might not be indexed yet."
    );
    return null;
  };

  const handleBurnLiquidityConfirm = async (lp: any) => {
    setLogs([]); // Clear previous logs
    setIsProcessing(true); // 🔥 Set processing state
    setIsModalOpen(true); // Open modal

    if (!wallet || !account) {
      setTransactionProgress({
        image: "/images/txn_failed.png",
        text: "",
      });
      setLoading(false);
      setIsProcessing(false);
      console.error("❌ No accounts found. Please reconnect your wallet.");
      return;
    }
    setTransactionProgress({
      image: "/images/txn_loading.png",
      text: "",
    });

    try {
      const inputAmount = burnAmount[lp.objectId];

      // ✅ Validate input
      if (
        !inputAmount ||
        isNaN(Number(inputAmount)) ||
        Number(inputAmount) <= 0
      ) {
        setTransactionProgress({
          image: "/images/txn_failed.png",
          text: "",
        });
        return;
      }

      setLoading(true);

      const userAddress =
        typeof account?.address === "string"
          ? account?.address
          : account?.address;

      if (!userAddress) {
        setTransactionProgress({
          image: "/images/txn_failed.png",
          text: "",
        });
        setLoading(false);
        setIsProcessing(false);
        console.error("❌ No accounts found. Please reconnect your wallet.");
        return;
      }

      addLog(
        `✅ Depositing ${inputAmount} LP tokens into pool: ${lp.poolData?.poolId}`
      );
      console.log(
        `✅ Depositing ${inputAmount} LP tokens into pool: ${lp.poolData?.poolId}`
      );

      // ✅ Convert LP amount to MIST (SUI smallest unit)
      const lpDepositAmount = BigInt(
        Math.floor(Number(inputAmount) * 1_000_000_000)
      );

      // ✅ Create a new transaction block
      const txb = new Transaction();

      // ✅ Call `deposit_lp_tokens` function
      txb.moveCall({
        target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::deposit_lp_tokens`,
        typeArguments: [
          lp.poolData?.coinA_metadata?.typeName,
          lp.poolData?.coinB_metadata?.typeName,
        ],
        arguments: [
          txb.object(lp.poolData?.poolId), // ✅ Pool ID
          txb.object(lp.objectId), // ✅ LP Object ID
          txb.pure.u64(lpDepositAmount), // ✅ LP Amount in MIST
        ],
      });

      let executeResponse: any;

      await new Promise<void>((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb.serialize(),
            chain: "sui:mainnet",
          },
          {
            onSuccess: (result) => {
              executeResponse = result;
              resolve();
            },
            onError: (error) => {
              console.error("❌ Burn transaction failed:", error);
              addLog(`❌ Transaction failed: ${error.message}`);
              setTransactionProgress({
                image: "/images/txn_failed.png",
                text: "",
              });
              setLoading(false);
              setIsProcessing(false);
              console.error("❌ Transaction failed:", error);
              reject(error);
            },
          }
        );
      });

      addLog("✅ Transaction Submitted!");
      console.log("✅ Transaction Submitted!");

      // ✅ Track transaction digest
      const txnDigest = executeResponse?.digest;
      addLog(`🔍 Transaction Digest: ${txnDigest}`);
      console.log(`🔍 Transaction Digest: ${txnDigest}`);

      if (!txnDigest) {
        setTransactionProgress({
          image: "/images/txn_failed.png",
          text: "",
        });
        setLoading(false);
        setIsProcessing(false);
        console.error("❌ No transaction digest found.");
        return;
      }

      // ✅ Wait for transaction confirmation
      addLog("🕒 Waiting for confirmation...");
      console.log("🕒 Waiting for confirmation...");
      let txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        setTransactionProgress({
          image: "/images/txn_failed.png",
          text: "",
        });
        setLoading(false);
        setIsProcessing(false);
        console.error("❌ No transaction details found.");
        return;
      }

      addLog("✅ Transaction Confirmed!");
      console.log("✅ Transaction Confirmed!");
      setTransactionProgress({
        image: "/images/txn_successful.png",
        text: "",
      });

      setIsProcessing(false); // ✅ Ensure modal does not close early
    } catch (error: any) {
      addLog(`❌ Deposit LP Transaction failed: ${error}`);
      console.error("❌ Deposit LP Transaction failed:", error);
      setTransactionProgress({
        image: "/images/txn_failed.png",
        text: "",
      });
      setLoading(false);
      setIsProcessing(false);
    } finally {
      setLoading(false);
      setIsProcessing(false); // ✅ Ensure modal does not close early
    }
  };
  return (
    <>
      {/* 🚀 Action Buttons */}
      <div className="flex space-x-4 mt-3 w-full">
        {/* Burn Liquidity Button */}
        <Button
          variant="secondary"
          size="full"
          rounded={false}
          className="mt-6 transition"
          processing={isProcessing}
          disabled={isProcessing}
          onClick={() => handleRemoveLiquidity(lp)}
        >
          🔥 BURN LP
        </Button>
      </div>

      {/* 🔽 Burn Liquidity UI (if enabled) */}
      {removeOptions[lp.objectId] && (
        <div className="mt-4 w-full bg-[#1a1712] p-4 border border-slate-700 rounded-none text-sm md:text-base">
          <h2 className="text-lg font-semibold pb-4">
            BURN LP - Select Burn Amount
          </h2>
          <span className="text-slate-400">
            Burning LP will PERMANENTLY LOCK the Liquidity Coins in the pool.{" "}
            <br></br>THIS CAN NOT BE REVERSED!
          </span>

          {/* Percentage Quick Select Buttons */}
          <div className="flex justify-between mt-2 mb-4 gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                variant="secondary"
                size="full"
                onClick={() => handlePercentageClick(lp, percent)}
                className={`flex-1 text-xs sm:text-md bg-[#130e18] hover:bg-slate-600 rounded-none px-3 py-1  ${
                  removePercentage[lp.objectId] === percent
                    ? "bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:opacity-75"
                    : "text-slate-300"
                }`}
              >
                {percent}%
              </Button>
            ))}
          </div>

          {/* Input for LP Amount */}
          <div className="space-y-1 mb-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            </div>
            <div className="flex justify-between items-center bg-[#130e18] px-3 py-2">
              <input
                type="number"
                className={`flex-1 p-2 outline-none bg-transparent text-sm sm:text-md overflow-hidden grow`}
                placeholder="Enter LP amount to burn"
                value={burnAmount[lp.objectId] || ""}
                onChange={(e) =>
                  setBurnAmount((prev: any) => ({
                    ...prev,
                    [lp.objectId]: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* ✅ Checkbox for Agreement */}
          <div className="flex items-center mt-3 bg-[#130e18] px-3 py-2">
            <input
              type="checkbox"
              id={`burn-agreement-${lp.objectId}`} // Unique ID for each LP
              className="mr-2 cursor-pointer bg-transparent"
              checked={burnAgreement[lp.objectId] || false}
              onChange={(e) =>
                setBurnAgreement((prev: any) => ({
                  ...prev,
                  [lp.objectId]: e.target.checked,
                }))
              }
            />
            <label
              htmlFor={`burn-agreement-${lp.objectId}`}
              className="text-base"
            >
              <span className="text-slate-400">
                I confirm that I understand that this action is irreversible and
                wish to proceed with permanently locking my Liquidity Coins.
              </span>
            </label>
          </div>

          {/* Confirm Button (Disabled Until Checkbox is Checked) */}
          <div className="flex space-x-4 mt-3 w-full">
            <Button
              variant="secondary"
              size="full"
              rounded={false}
              onClick={() => handleBurnLiquidityConfirm(lp)}
              disabled={!burnAgreement[lp.objectId]} // ✅ Disable when unchecked
            >
              🔥 CONFIRM BURN LP
            </Button>
          </div>
          <TransactionModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            logs={logs}
            isProcessing={isProcessing}
            transactionProgress={transactionProgress || { image: "", text: "" }}
          />
        </div>
      )}
    </>
  );
};
