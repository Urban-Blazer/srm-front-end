import { useState } from "react";
import TransactionModal from "./TransactionModal";
import Button from "./UI/Button";
import { SuiClient } from "@mysten/sui/client";
import { DEX_MODULE_NAME, GETTER_RPC, PACKAGE_ID } from "../config";
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

const provider = new SuiClient({ url: GETTER_RPC });

export const BurnLPPositionCard = ({
  lp,
}: {
  lp: any;
}) => {
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
    const [burnAmount, setBurnAmount] = useState<{ [key: string]: string }>({});
    const [burnAgreement, setBurnAgreement] = useState<{
      [key: string]: boolean;
    }>({});

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
  };


  
    // ✅ Handle Percentage Click
    const handlePercentageClick = (lp: any, percentage: number) => {
      const calculatedAmount = (
        (Number(lp.balance) / 1e9) *
        (percentage / 100)
      ).toFixed(4); // Convert from MIST
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
      alert("⚠️ Please connect your wallet first.");
      return;
    }

    try {
      const inputAmount = burnAmount[lp.objectId];

      // ✅ Validate input
      if (
        !inputAmount ||
        isNaN(Number(inputAmount)) ||
        Number(inputAmount) <= 0
      ) {
        alert("⚠️ Please enter a valid LP amount.");
        return;
      }

      setLoading(true);

      const userAddress =
        typeof account?.address === "string"
          ? account?.address
          : account?.address;

      if (!userAddress) {
        alert("⚠️ No accounts found. Please reconnect your wallet.");
        setLoading(false);
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
              alert("⚠️ Transaction failed. See console for details.");
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
        alert("Transaction failed. Please check the console.");
        setLoading(false);
        return;
      }

      // ✅ Wait for transaction confirmation
      addLog("🕒 Waiting for confirmation...");
      console.log("🕒 Waiting for confirmation...");
      let txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        alert("Transaction not successful. Please retry.");
        setLoading(false);
        return;
      }

      addLog("✅ Transaction Confirmed!");
      console.log("✅ Transaction Confirmed!");

      alert(
        `✅ Successfully deposited ${inputAmount} LP tokens into ${lp.poolData?.poolId}`
      );
      setIsProcessing(false); // ✅ Ensure modal does not close early
    } catch (error: any) {
      addLog(`❌ Deposit LP Transaction failed: ${error}`);
      console.error("❌ Deposit LP Transaction failed:", error);
      alert("Transaction failed. Check the console.");
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
        <div className="mt-4 w-full p-3 md:p-4 text-sm md:text-base">
          <h2 className="text-lg font-semibold pb-4">
            <span className="text-slate-400">
              Burning LP will PERMANENTLY LOCK the Liquidity Coins in the pool.{" "}
              <br></br>THIS CAN NOT BE REVERSED!
            </span>
          </h2>

          {/* Percentage Quick Select Buttons */}
          <div className="flex space-x-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => handlePercentageClick(lp, percent)}
                className="button-secondary px-3 py-1 text-sm transition"
              >
                {percent}%
              </button>
            ))}
          </div>

          {/* Input for LP Amount */}
          <input
            type="number"
            className="w-full p-1 md:p-2 border text-black mt-2 text-sm md:text-base"
            placeholder="Enter LP amount"
            value={burnAmount[lp.objectId] || ""}
            onChange={(e) =>
              setBurnAmount((prev: any) => ({
                ...prev,
                [lp.objectId]: e.target.value,
              }))
            }
          />

          {/* ✅ Checkbox for Agreement */}
          <div className="flex items-center mt-3">
            <input
              type="checkbox"
              id={`burn-agreement-${lp.objectId}`} // Unique ID for each LP
              className="mr-2 cursor-pointer"
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
          />
        </div>
      )}
    </>
  );
};
