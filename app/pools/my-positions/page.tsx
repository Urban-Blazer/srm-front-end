// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import { useCurrentWallet, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME } from "../../config";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import TransactionModal from "@components/TransactionModal";
import Image from "next/image";

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
    const wallet = useCurrentWallet()?.currentWallet;
    const account = useCurrentAccount();
    const walletConnected = !!wallet && !!account;
    const walletAddress = account?.address || null;
    const [lpTokens, setLpTokens] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [removeOptions, setRemoveOptions] = useState<{ [key: string]: boolean }>({});
    const [withdrawAmount, setWithdrawAmount] = useState<{ [key: string]: string }>({});
    const [slippageTolerance, setSlippageTolerance] = useState<{ [key: string]: string }>({});

    const [logs, setLogs] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
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
        setWithdrawAmount((prev) => ({
            ...prev,
            [lp.objectId]: "", // Clear previous input when toggling
        }));
    };

    // ✅ Handle Percentage Click
    const handlePercentageClick = (lp: any, percentage: number) => {
        const calculatedAmount = ((Number(lp.balance) / 1e9) * (percentage / 100)); // Convert from MIST
        setWithdrawAmount((prev) => ({
            ...prev,
            [lp.objectId]: calculatedAmount,
        }));
    };

    // ✅ Fetch LP Tokens
    const fetchLPTokens = async () => {
        if (!wallet || !walletAddress) {
            alert("⚠️ Please connect your wallet first.");
            return;
        }

        setLoading(true);

        try {
            const ownerAddress = typeof walletAddress === "string" ? walletAddress : walletAddress.address;

            if (!ownerAddress.startsWith("0x") || ownerAddress.length !== 66) {
                console.error("❌ Invalid Sui address:", ownerAddress);
                alert("⚠️ Wallet address is invalid. Please reconnect.");
                return;
            }

            console.log("🔗 Fetching LP tokens for wallet:", ownerAddress);

            // ✅ Get all owned objects
            const { data: ownedObjects } = await provider.getOwnedObjects({
                owner: ownerAddress,
                options: { showType: true, showContent: true },
            });

            console.log("🔍 Owned Objects:", ownedObjects);

            // ✅ Extract LP tokens dynamically
            const lpTokens = await Promise.all(
                ownedObjects.map(async (obj) => {
                    const rawType = obj.data?.type;
                    if (!rawType) return null;

                    console.log("🔎 Checking Type:", rawType);

                    if (!rawType.includes(`${PACKAGE_ID}::${DEX_MODULE_NAME}::LP<`)) return null;

                    // ✅ Extract `LP<CoinA, CoinB>`
                    const lpMatch = rawType.match(/LP<([^,]+),\s?([^>]+)>/);
                    if (!lpMatch) return null;

                    const coinA = lpMatch[1].trim();
                    const coinB = lpMatch[2].trim();
                    const tokenPair = `${coinA}-${coinB}`;

                    console.log(`🛠 Extracted CoinA: ${coinA}, CoinB: ${coinB}`);

                    try {
                        // ✅ Fetch Pool Metadata from API
                        const poolResponse = await fetch(`/api/get-pool-id?tokenPair=${tokenPair}`);
                        const poolData = poolResponse.ok ? await poolResponse.json() : null;

                        if (!poolData?.poolId) return null;

                        // ✅ Fetch Pool Stats (Total Liquidity)
                        const poolStats = await fetchPoolStats(poolData.poolId);

                        // ✅ Calculate User's Ownership Share
                        const userLpBalance = obj.data?.content?.fields?.balance
                            ? BigInt(obj.data?.content?.fields?.balance)
                            : BigInt(0);

                        const totalLpSupply = BigInt(poolStats.total_lp_supply || 0);
                        const balanceA = BigInt(poolStats.balance_a || 0);
                        const balanceB = BigInt(poolStats.balance_b || 0);

                        const ownershipPercentage = totalLpSupply > 0
                            ? Number(userLpBalance) / Number(totalLpSupply)
                            : 0;

                        const coinADecimals = poolData?.coinA_metadata?.decimals ?? 9;
                        const coinBDecimals = poolData?.coinB_metadata?.decimals ?? 9;

                        const userCoinA = ownershipPercentage * Number(balanceA) / Math.pow(10, coinADecimals);
                        const userCoinB = ownershipPercentage * Number(balanceB) / Math.pow(10, coinBDecimals);

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
        } catch (error) {
            console.error("❌ Error fetching LP tokens:", error);
            alert(`Failed to fetch LP tokens: ${error.message}`);
        }

        setLoading(false);
    };

    // ✅ Fetch Pool Stats Function
    const fetchPoolStats = async (poolObjectId) => {
        if (!poolObjectId) return null;

        console.log("Fetching Pool Stats with ID:", poolObjectId);

        try {
            const poolObject = await provider.getObject({
                id: poolObjectId,
                options: { showContent: true },
            });

            console.log("Pool Object Response:", poolObject);

            if (poolObject?.data?.content?.fields) {
                const fields = poolObject.data.content.fields;
                return {
                    balance_a: fields.balance_a || 0,
                    balance_b: fields.balance_b || 0,
                    total_lp_supply: fields.lp_supply?.fields?.value || 0, // Total LP Tokens in circulation
                };
            } else {
                console.warn("Missing pool fields:", poolObject);
                return null;
            }
        } catch (error) {
            console.error("Error fetching pool stats:", error);
            return null;
        }
    };  

    const handleRemoveLiquidityConfirm = async (lp: any) => {
        setLogs([]); // Clear previous logs
        setIsProcessing(true); // 🔥 Set processing state
        setIsModalOpen(true); // Open modal
        
        if (!wallet || !walletAddress) {
            alert("⚠️ Please connect your wallet first.");
            return;
        }

        try {
            const inputAmount = withdrawAmount[lp.objectId];

            // ✅ Validate input
            if (!inputAmount || isNaN(Number(inputAmount)) || Number(inputAmount) <= 0) {
                alert("⚠️ Please enter a valid LP amount.");
                return;
            }

            setLoading(true);

            const userAddress = walletAddress;

            if (!userAddress) {
                alert("⚠️ No accounts found. Please reconnect your wallet.");
                setLoading(false);
                return;
            }

            addLog(`✅ Removing ${inputAmount} LP from pool: ${lp.poolData?.poolId}`);
            console.log(`✅ Removing ${inputAmount} LP from pool: ${lp.poolData?.poolId}`);

            // ✅ Convert LP amount to MIST
            const lpWithdraw_MIST = BigInt(Math.floor(Number(inputAmount) * 1_000_000_000));

            // ✅ Determine the fraction of LP being withdrawn
            const coinADecimals = lp.poolData?.coinA_metadata?.decimals ?? 9;
            const coinBDecimals = lp.poolData?.coinB_metadata?.decimals ?? 9;

            const withdrawFraction = lpWithdraw_MIST * BigInt(1_000_000) / lp.balance;

            // Use correct decimal scale per coin
            const estimatedAOut = (
                BigInt(Math.floor(lp.userCoinA * Math.pow(10, coinADecimals))) * withdrawFraction
            ) / BigInt(1_000_000);

            const estimatedBOut = (
                BigInt(Math.floor(lp.userCoinB * Math.pow(10, coinBDecimals))) * withdrawFraction
            ) / BigInt(1_000_000);

            // Slippage handling
            const userSlippage = parseFloat(slippageTolerance[lp.objectId]) || 1.0;
            const slippageMultiplier = (100 - userSlippage) / 100;

            const minAOut = (estimatedAOut * BigInt(Math.floor(slippageMultiplier * 1_000_000))) / BigInt(1_000_000);
            const minBOut = (estimatedBOut * BigInt(Math.floor(slippageMultiplier * 1_000_000))) / BigInt(1_000_000);

            addLog("🔢 minAOut:", minAOut.toString(), "minBOut:", minBOut.toString());
            console.log("🔢 minAOut:", minAOut.toString(), "minBOut:", minBOut.toString());

            // ✅ Use the object ID we already have
            const lpObjectId = lp.objectId;

            // ✅ Build Transaction Block
            const txb = new TransactionBlock();

            txb.moveCall({
                target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::remove_liquidity_with_coins_and_transfer_to_sender`,
                typeArguments: [lp.poolData?.coinA_metadata?.typeName, lp.poolData?.coinB_metadata?.typeName],
                arguments: [
                    txb.object(lp.poolData?.poolId), // ✅ Pool ID
                    txb.object(lpObjectId), // ✅ LP Object ID
                    txb.pure.u64(lpWithdraw_MIST), // ✅ `lp_amount` now passed explicitly
                    txb.pure.u64(minAOut), // ✅ Minimum output for Coin A
                    txb.pure.u64(minBOut), // ✅ Minimum output for Coin B
                    txb.object("0x6"), // Clock object
                ],
            });

            let executeResponse;

            await new Promise<void>((resolve, reject) => {
                signAndExecuteTransaction(
                    {
                        transaction: txb.serialize(),
                        chain: 'sui:mainnet', // Or 'sui:devnet' depending on env
                    },
                    {
                        onSuccess: (result) => {
                            executeResponse = result;
                            resolve();
                        },
                        onError: (error) => {
                            console.error("❌ Claim transaction failed:", error);
                            addLog(`❌ Transaction failed: ${error.message}`);
                            alert("⚠️ Claim transaction failed. See console for details.");
                            reject(error);
                        },
                    }
                );
            });

            addLog("✅ Transaction Submitted!");
            console.log("✅ Transaction Submitted!");

            // ✅ Track Transaction Digest
            const txnDigest = executeResponse.digest;
            addLog(`🔍 Transaction Digest: ${txnDigest}`);
            console.log(`🔍 Transaction Digest: ${txnDigest}`);

            if (!txnDigest) {
                alert("Transaction failed. Please check the console.");
                setLoading(false);
                return;
            }

            // ✅ Wait for Transaction Confirmation
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

            alert(`✅ Successfully removed ${inputAmount} LP from ${lp.poolData?.poolId}`);
            setIsProcessing(false); // ✅ Ensure modal does not close early
        } catch (error) {
            addLog("❌ Remove Liquidity Transaction failed:", error);
            console.error("❌ Remove Liquidity Transaction failed:", error);
            alert("Transaction failed. Check the console.");
        } finally {
            setLoading(false);
            setIsProcessing(false);
            await fetchLPTokens();
        }
    };

    // ✅ Add this function before calling it in handleRemoveLiquidityConfirm
    const fetchTransactionWithRetry = async (txnDigest, retries = 20, delay = 5000) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🔍 Attempt ${attempt}: Fetching transaction details for digest: ${txnDigest}`);
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
                            console.error("❌ Transaction Failed!", txnDetails.effects.status.error);
                            return null; // ❌ Stop if transaction failed
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`, error);
                await new Promise((res) => setTimeout(res, delay));
            }
        }

        console.error("❌ All retry attempts failed. Transaction might not be indexed yet.");
        return null;
    };

    useEffect(() => {
        if (walletAddress) {
            fetchLPTokens(walletAddress);
        }
    }, [walletAddress]);

    return (
        <div className="flex flex-col items-center min-h-screen p-4 md:p-6 pt-20 pb-20 bg-gray-100">
            <h1 className="pt-10 text-2xl md:text-3xl font-bold mb-4 text-center">My Liquidity Positions</h1>

            {!walletConnected ? (
                <p className="text-deepTeal text-center "><strong>🔌 Connect your wallet to view your LP positions.</strong></p>
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
                                    <div
                                        key={index}
                                        className="bg-white p-4 rounded-lg shadow-md mb-4 flex flex-col items-center text-center space-y-3"
                                    >
                                        {/* Coin Images & Symbols */}
                                        <div className="flex items-center justify-center space-x-1 md:space-x-2 flex-wrap">
                                            <img src={lp.poolData?.coinA_metadata?.image} alt="Coin A" width={20} height={20} className="w-8 md:w-10 h-8 md:h-10 rounded-full" />
                                            <span className="text-lg md:text-xl font-semibold text-deepTeal">{lp.poolData?.coinA_metadata?.symbol}</span>
                                            <span className="text-deepTeal text-lg">/</span>
                                            <img src={lp.poolData?.coinB_metadata?.image} alt="Coin B" width={20} height={20} className="w-8 md:w-10 h-8 md:h-10 rounded-full" />
                                            <span className="text-lg md:text-xl font-semibold text-deepTeal">{lp.poolData?.coinB_metadata?.symbol}</span>
                                        </div>

                                        {/* Pool Information */}
                                        <div className="w-full">
                                            <p className="text-deepTeal text-sm">
                                                <strong>Pool ID:</strong>
                                                <span className="text-royalPurple break-all"> {lp.poolData?.poolId || "N/A"}</span>
                                            </p>
                                            <p className="text-sm text-deepTeal">
                                                <strong>Balance:</strong> {(Number(lp.balance) / 1e9).toFixed(4)} LP
                                            </p>
                                            <p className="text-sm text-deepTeal">
                                                <strong>Your Share:</strong> {lp.userCoinA.toFixed(4)} {lp.poolData?.coinA_metadata?.symbol} / {lp.userCoinB.toFixed(4)} {lp.poolData?.coinB_metadata?.symbol}
                                            </p>
                                        </div>

                                        {/* 🚀 Action Buttons */}
                                        <div className="flex space-x-4 mt-3">
                                            {/* Add Liquidity Button */}
                                            <a href={`/pools/add-liquidity?coinA=${encodeURIComponent(lp.poolData?.coinA_metadata?.typeName)}&coinB=${encodeURIComponent(lp.poolData?.coinB_metadata?.typeName)}`} className="bg-emeraldGreen text-white px-3 md:px-4 py-1 md:py-2 rounded-md text-xs md:text-sm font-medium hover:bg-softMint transition">
                                                <strong>➕ ADD LIQUIDITY</strong>
                                            </a>

                                            {/* Remove Liquidity Button */}
                                            <button
                                                onClick={() => handleRemoveLiquidity(lp)}
                                                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition"
                                            >
                                                <strong>❌ Remove Liquidity</strong>
                                            </button>
                                        </div>

                                        {/* 🔽 Remove Liquidity UI (if enabled) */}
                                        {removeOptions[lp.objectId] && (
                                            <div className="mt-4 w-full bg-softMint p-3 md:p-4 rounded-lg text-sm md:text-base">
                                                <h2 className="text-lg font-semibold">Select Withdrawal Amount</h2>

                                                {/* Percentage Quick Select Buttons */}
                                                <div className="flex space-x-2">
                                                    {[25, 50, 75, 100].map((percent) => (
                                                        <button
                                                            key={percent}
                                                            onClick={() => handlePercentageClick(lp, percent)}
                                                            className="button-secondary px-3 py-1 rounded-md text-sm transition"
                                                        >
                                                            {percent}%
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Input for LP Amount */}
                                                <input
                                                    type="number"
                                                    className="w-full p-1 md:p-2 border rounded-lg text-black mt-2 text-sm md:text-base"
                                                    placeholder="Enter LP amount"
                                                    value={withdrawAmount[lp.objectId] || ""}
                                                    onChange={(e) => setWithdrawAmount((prev) => ({ ...prev, [lp.objectId]: e.target.value }))}
                                                />

                                                {/* ✅ Slippage Tolerance Input */}
                                                <div className="mt-3">
                                                    <h2 className="text-lg font-semibold">Slippage Tolerance (%)</h2>
                                                    <input
                                                        type="number"
                                                        className="w-full md:w-1/2 p-1 md:p-2 border rounded-lg text-black mt-1 text-sm md:text-base"
                                                        placeholder="Enter slippage (e.g., 1.0)"
                                                        value={slippageTolerance[lp.objectId] || ""}
                                                        onChange={(e) => setSlippageTolerance((prev) => ({ ...prev, [lp.objectId]: e.target.value }))}
                                                    />
                                                </div>

                                                {/* Confirm Button */}
                                                <button
                                                    onClick={() => handleRemoveLiquidityConfirm(lp)}
                                                    className="button-secondary px-4 py-2 rounded-md text-sm font-medium transition mt-3 w-full"
                                                >
                                                    ✅ Confirm Withdraw LP
                                                </button>
                                                <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} isProcessing={isProcessing} />
                                            </div>
                                        )}

                                        </div>
                                ))
                            ) : (
                                    <p className="text-deepTeal text-center mt-4"><strong>No LP positions found. Click View My Positions to check your wallet.</strong></p>
                            )}

                        </div>


                </>
            )}
        </div>
    );
}
