"use client";
import Avatar from "@components/Avatar";
import ExplorerObjectLink from "@components/ExplorerLink/ExplorerObjectLink";
import TransactionModal from "@components/TransactionModal";
import Button from "@components/UI/Button";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { useCallback, useEffect, useState } from "react";
import { DEX_MODULE_NAME, GETTER_RPC, PACKAGE_ID } from "../../config";
import useCoinPrice from "@/app/hooks/useCoinPrice";

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
  const [lpTokens, setLpTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [removeOptions, setRemoveOptions] = useState<{
    [key: string]: boolean;
  }>({});
  const [burnAmount, setBurnAmount] = useState<{ [key: string]: string }>({});
  const [burnAgreement, setBurnAgreement] = useState<{
    [key: string]: boolean;
  }>({});

  const [logs, setLogs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Track processing state

  const account = useCurrentAccount();
  const wallet = useCurrentWallet()?.currentWallet;
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
  };

  useEffect(() => {
    if (isProcessing) {
      setIsModalOpen(true); // ✅ Ensures modal opens when processing starts
    }
  }, [isProcessing]); // ✅ Reacts when `isProcessing` changes

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

  // ✅ Fetch LP Tokens
  const fetchLPTokens = useCallback(async () => {
    if (!wallet || !account) {
      alert("⚠️ Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      const ownerAddress =
        typeof account?.address === "string"
          ? account?.address
          : account?.address;

      if (!ownerAddress.startsWith("0x") || ownerAddress.length !== 66) {
        console.error("❌ Invalid Sui address:", ownerAddress);
        alert("⚠️ Wallet address is invalid. Please reconnect.");
        return;
      }

      console.log("🔗 Fetching LP tokens for wallet:", ownerAddress);
      let cursor: string | null | undefined = undefined;
      let ownedObjects: any[] = [];

      // ✅ Get all owned objects
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        const {
          data: ownedObjectsPage,
          hasNextPage,
          nextCursor,
        } = await provider.getOwnedObjects({
          owner: ownerAddress,
          options: { showType: true, showContent: true },
          cursor,
        });

        ownedObjects = [...ownedObjects, ...ownedObjectsPage];
        if (!hasNextPage) break;
        cursor = nextCursor;
      }

      console.log("🔍 Owned Objects:", ownedObjects);

      // ✅ Extract LP tokens dynamically
      const lpTokens = await Promise.all(
        ownedObjects.map(async (obj) => {
          const rawType = obj.data?.type;
          if (!rawType) return null;

          console.log("🔎 Checking Type:", rawType);

          if (!rawType.includes(`${PACKAGE_ID}::${DEX_MODULE_NAME}::LP<`))
            return null;

          // ✅ Extract `LP<CoinA, CoinB>`
          const lpMatch = rawType.match(/LP<([^,]+),\s?([^>]+)>/);
          if (!lpMatch) return null;

          const coinA = lpMatch[1].trim();
          const coinB = lpMatch[2].trim();
          const tokenPair = `${coinA}-${coinB}`;

          console.log(`🛠 Extracted CoinA: ${coinA}, CoinB: ${coinB}`);

          try {
            // ✅ Fetch Pool Metadata from API
            const poolResponse = await fetch(
              `/api/get-pool-id?tokenPair=${tokenPair}`
            );
            const poolData = poolResponse.ok ? await poolResponse.json() : null;

            if (!poolData?.poolId) return null;

            // ✅ Fetch Pool Stats (Total Liquidity)
            const poolStats = await fetchPoolStats(poolData.poolId);

            // ✅ Calculate User's Ownership Share
            const userLpBalance = (obj.data?.content as any)?.fields?.balance
              ? BigInt((obj.data?.content as any)?.fields?.balance)
              : BigInt(0);

            const totalLpSupply = BigInt(poolStats?.total_lp_supply || 0);
            const balanceA = BigInt(poolStats?.balance_a || 0);
            const balanceB = BigInt(poolStats?.balance_b || 0);

            const ownershipPercentage =
              totalLpSupply > 0
                ? Number(userLpBalance) / Number(totalLpSupply)
                : 0;

            const coinADecimals = poolData?.coinA_metadata?.decimals ?? 9;
            const coinBDecimals = poolData?.coinB_metadata?.decimals ?? 9;

            const userCoinA =
              (ownershipPercentage * Number(balanceA)) /
              Math.pow(10, coinADecimals);
            const userCoinB =
              (ownershipPercentage * Number(balanceB)) /
              Math.pow(10, coinBDecimals);

            return {
              objectId: obj.data?.objectId,
              type: rawType, // Full LP type
              balance: userLpBalance,
              poolData: poolData || {},
              userCoinA: userCoinA, // Convert from MIST
              userCoinB: userCoinB, // Convert from MIST
            };
          } catch (apiError) {
            console.error("⚠️ Error fetching pool metadata:", apiError);
            return null;
          }
        })
      );

      // ✅ Filter out any `null` values
      const validLpTokens = lpTokens.filter(Boolean);
      console.log("✅ Enriched LP Tokens:", validLpTokens);

      if (validLpTokens.length === 0) {
        setLpTokens([]);
        alert("No LP positions found.");
        setLoading(false);
        return;
      }

      setLpTokens(validLpTokens);
    } catch (error: any) {
      console.error("❌ Error fetching LP tokens:", error);
      alert(`Failed to fetch LP tokens: ${error.message}`);
    }

    setLoading(false);
  }, [account, wallet]);

  // ✅ Fetch Pool Stats Function
  const fetchPoolStats = async (poolObjectId: string) => {
    if (!poolObjectId) return null;

    console.log("Fetching Pool Stats with ID:", poolObjectId);

    try {
      const poolObject = await provider.getObject({
        id: poolObjectId,
        options: { showContent: true },
      });

      console.log("Pool Object Response:", poolObject);

      if ((poolObject?.data?.content as any)?.fields) {
        const fields = (poolObject?.data?.content as any)?.fields;
        return {
          balance_a: fields.balance_a || 0,
          balance_b: fields.balance_b || 0,
          total_lp_supply: fields.lp_supply?.fields?.value || 0, // Total LP Tokens in circulation
        };
      } else {
        console.warn("Missing pool fields:", poolObject);
        return null;
      }
    } catch (error: any) {
      console.error("Error fetching pool stats:", error);
      return null;
    }
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
      const txb = new TransactionBlock();

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

  useEffect(() => {
    if (account) {
      fetchLPTokens();
    }
  }, [account, fetchLPTokens]);
  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-6 pt-20 pb-20 bg-[#000306]">
      <h1 className="pt-10 text-2xl md:text-3xl font-bold mb-4 text-center">
        MY LIQUIDITY POSITIONS
      </h1>

      {!wallet || !account ? (
        <p className="text-center ">
          <strong>🔌 Connect your wallet to view your LP positions.</strong>
        </p>
      ) : (
        <>
          <button
            className="button-primary p-3 rounded-lg mt-4 disabled:opacity-50"
            onClick={fetchLPTokens}
            disabled={loading}
          >
            {loading ? "Fetching..." : "View My Positions"}
          </button>

          {/* Display LP Positions */}
          <div className="w-full max-w-3xl mt-6 px-2 md:px-0">
            {lpTokens.length > 0 ? (
              lpTokens.map((lp, index) => (
                <BurnLPPositionCard
                  key={index}
                  lp={lp}
                  handleRemoveLiquidity={handleRemoveLiquidity}
                  removeOptions={removeOptions}
                  handlePercentageClick={handlePercentageClick}
                  burnAmount={burnAmount}
                  setBurnAmount={setBurnAmount}
                  burnAgreement={burnAgreement}
                  setBurnAgreement={setBurnAgreement}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  logs={logs}
                  handleBurnLiquidityConfirm={handleBurnLiquidityConfirm}
                  isModalOpen={isModalOpen}
                  setIsModalOpen={setIsModalOpen}
                />
              ))
            ) : (
              <p className="text-center mt-4">
                <span className="text-slate-400">
                  No LP positions found. Click View My Positions to check your
                  wallet.
                </span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const BurnLPPositionCard = ({
  lp,
  handleRemoveLiquidity,
  removeOptions,
  handlePercentageClick,
  burnAmount,
  setBurnAmount,
  burnAgreement,
  setBurnAgreement,
  isProcessing,
  logs,
  handleBurnLiquidityConfirm,
  isModalOpen,
  setIsModalOpen,
}: {
  lp: any;
  handleRemoveLiquidity: (lp: any) => void;
  removeOptions: any;
  handlePercentageClick: (lp: any, percent: number) => void;
  burnAmount: any;
  setBurnAmount: any;
  burnAgreement: any;
  setBurnAgreement: any;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  logs: string[];
  handleBurnLiquidityConfirm: (lp: any) => void;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
}) => {
  const { data: coinAPriceUSD } = useCoinPrice(
    lp.poolData?.coinA_metadata?.symbol
  );
  const estimatedValue = coinAPriceUSD ? coinAPriceUSD * lp.userCoinA : 0;

  return (
    <div className="bg-[#14110c] p-5  border border-slate-700 rounded-none shadow-md mb-4 flex flex-col items-center text-center space-y-3">
      {/* Coin Images & Symbols */}
      <div className="flex items-center justify-center space-x-1 md:space-x-2 flex-wrap">
        <Avatar
          src={lp.poolData?.coinA_metadata?.image}
          alt="Coin A"
          className="w-8 md:w-10 h-8 md:h-10 rounded-full"
        />
        <span className="text-lg md:text-xl font-semibold">
          {lp.poolData?.coinA_metadata?.symbol}
        </span>
        <span className="text-lg">/</span>
        <Avatar
          src={lp.poolData?.coinB_metadata?.image}
          alt="Coin B"
          className="w-8 md:w-10 h-8 md:h-10 rounded-full"
        />
        <span className="text-lg md:text-xl font-semibold">
          {lp.poolData?.coinB_metadata?.symbol}
        </span>
      </div>

      {/* Pool Information */}
      <div className="w-full">
        <p className="text-sm">
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
        <p className="text-sm">
          <span className="text-slate-400">Balance:</span>{" "}
          {(Number(lp.balance) / 1e9).toFixed(4)} LP
        </p>
        <p className="text-sm text-slate-300 mb-1">
          <span className="text-slate-400">Estimated Value:</span>
          <span className="text-slate-300 ml-1">
            {(estimatedValue * 2).toFixed(4)} USD
          </span>
        </p>
        <p className="text-sm">
          <span className="text-slate-400">Your Share:</span>{" "}
          {lp.userCoinA.toFixed(4)} {lp.poolData?.coinA_metadata?.symbol} /{" "}
          {lp.userCoinB.toFixed(4)} {lp.poolData?.coinB_metadata?.symbol}
        </p>
      </div>

      {/* 🚀 Action Buttons */}
      <div className="flex space-x-4 mt-3 w-full">
        {/* Burn Liquidity Button */}
        <Button
          variant="secondary"
          size="full"
          rounded={false}
          className="mt-6 transition"
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
    </div>
  );
};
