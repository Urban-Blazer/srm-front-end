"use client";
import { useEffect, useState, useCallback } from "react";
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
    const fetchLPTokens = useCallback(async () => {
        if (!walletConnected || !account?.address) {
            console.error("⚠️ Please connect your wallet first.");
            return;
        }

        setLoading(true);

        try {
            console.log("🔗 Fetching LP tokens for wallet:", account?.address);
            let cursor: string | null | undefined = undefined;
            let ownedObjects: any[] = [];
            // ✅ Get all owned objects
            while (true) {
                const { data: ownedObjectsPage, hasNextPage, nextCursor } = await provider.getOwnedObjects({
                    owner: '0x627dc5ea4d2e54df9f5d17c37b8e2b0eb9279ae42bb777ca6e944b1f1114827a',
                    // owner: account?.address,
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

                    if (!rawType.includes(`${PACKAGE_ID}::${DEX_MODULE_NAME}::LP<`)) return null;

                    console.log("✅ Found LP Token:", rawType, {obj});

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

                        const totalLpSupply = BigInt(poolStats?.total_lp_supply || 0);
                        const balanceA = BigInt(poolStats?.balance_a || 0);
                        const balanceB = BigInt(poolStats?.balance_b || 0);

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
                console.error("No LP positions found.");
                setLoading(false);
                return;
            }

            setLpTokens(validLpTokens);
        } catch (error: any) {
            console.error("❌ Error fetching LP tokens:", error);
            alert(`Failed to fetch LP tokens: ${error.message}`);
        }

        setLoading(false);
    }, [walletConnected, account?.address]);

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
                const fields = (poolObject?.data?.content as any).fields;
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
        
        if (!walletConnected || !account?.address) {
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

            if (!account?.address) {
                console.error("⚠️ No accounts found. Please reconnect your wallet.");
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

            addLog(`🔢 minAOut: ${minAOut.toString()}, minBOut: ${minBOut.toString()}`);
            console.log(`🔢 minAOut: ${minAOut.toString()}, minBOut: ${minBOut.toString()}`);

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

            let executeResponse: { digest: string } | undefined;

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
            const txnDigest = executeResponse?.digest;
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
            addLog(`❌ Remove Liquidity Transaction failed: ${error}`);
            console.error("❌ Remove Liquidity Transaction failed:", error);
            alert("Transaction failed. Check the console.");
        } finally {
            setLoading(false);
            setIsProcessing(false);
            await fetchLPTokens();
        }
    };

    // ✅ Add this function before calling it in handleRemoveLiquidityConfirm
    const fetchTransactionWithRetry = async (txnDigest: string, retries = 20, delay = 5000) => {
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
        if (walletConnected && account?.address) {
            fetchLPTokens();
        }
    }, [fetchLPTokens, walletConnected, account?.address]);

    return (
        <div className="flex flex-col items-center min-h-screen p-4 md:p-6 pt-20 pb-20 text-slate-100">
            <h1 className="pt-10 text-2xl md:text-3xl font-bold mb-6 text-center">My Liquidity Positions</h1>

            {!walletConnected ? (
                <p className="text-center text-slate-300"><strong>🔌 Connect your wallet to view your LP positions.</strong></p>
            ) : (
                <>
                    <button
                        className={`px-4 py-2 rounded-none text-sm font-semibold ${!loading ? 'bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75' : 'bg-[#14110c] text-slate-400'}`}
                        onClick={fetchLPTokens}
                        disabled={loading}
                    >
                        {loading ? "Fetching..." : "View My Positions"}
                    </button>

                    {/* Display LP Positions */}
                    <div className="w-full max-w-3xl mt-8 px-2 md:px-0">
                        {lpTokens.length > 0 ? (
                            lpTokens.map((lp, index) => (
                                <div
                                    key={index}
                                    className="p-5 border border-slate-700 bg-[#14110c] mb-6 flex flex-col items-center text-center space-y-4 rounded-none"
                                >
                                    {/* Coin Images & Symbols */}
                                    <div className="flex items-center justify-center space-x-1 md:space-x-2 flex-wrap">
                                        <Image src={lp.poolData?.coinA_metadata?.image || ''} alt="Coin A" width={20} height={20} className="w-8 md:w-10 h-8 md:h-10 rounded-full" unoptimized />
                                        <span className="text-lg md:text-xl font-semibold text-slate-100">{lp.poolData?.coinA_metadata?.symbol}</span>
                                        <span className="text-lg text-slate-400">/</span>
                                        <Image src={lp.poolData?.coinB_metadata?.image || ''} alt="Coin B" width={20} height={20} className="w-8 md:w-10 h-8 md:h-10 rounded-full" unoptimized />
                                        <span className="text-lg md:text-xl font-semibold text-slate-100">{lp.poolData?.coinB_metadata?.symbol}</span>
                                    </div>

                                    {/* Pool Information */}
                                    <div className="w-full">
                                        <p className="text-sm text-slate-300 mb-1">
                                            <span className="text-slate-400">Pool ID:</span>
                                            <span className="text-slate-300 break-all ml-1">{lp.poolData?.poolId.slice(0, 6) + "..." + lp.poolData?.poolId.slice(-6) || "N/A"}</span>
                                        </p>
                                        <p className="text-sm text-slate-300 mb-1">
                                            <span className="text-slate-400">LP Object ID:</span>
                                            <span className="text-slate-300 break-all ml-1">{lp.objectId.slice(0, 6) + "..." + lp.objectId.slice(-6) || "N/A"}</span>
                                        </p>
                                        <p className="text-sm text-slate-300 mb-1">
                                            <span className="text-slate-400">Balance:</span>
                                            <span className="text-slate-300 ml-1">{(Number(lp.balance) / 1e9).toFixed(4)} LP</span>
                                        </p>
                                        <p className="text-sm text-slate-300">
                                            <span className="text-slate-400">Your Share:</span>
                                            <span className="text-slate-300 ml-1">{lp.userCoinA.toFixed(4)} {lp.poolData?.coinA_metadata?.symbol} / {lp.userCoinB.toFixed(4)} {lp.poolData?.coinB_metadata?.symbol}</span>
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-4 mt-3">
                                        {/* Add Liquidity Button */}
                                        <a 
                                            href={`/pools/add-liquidity?coinA=${encodeURIComponent(lp.poolData?.coinA_metadata?.typeName)}&coinB=${encodeURIComponent(lp.poolData?.coinB_metadata?.typeName)}`} 
                                            className="px-4 py-2 rounded-none text-sm font-semibold bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                                        >
                                            ADD LIQUIDITY
                                        </a>

                                        {/* Remove Liquidity Button */}
                                        <button
                                            onClick={() => handleRemoveLiquidity(lp)}
                                            className="px-4 py-2 rounded-none text-sm font-semibold bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:text-[#61F98A] hover:opacity-75"
                                        >
                                            REMOVE LIQUIDITY
                                        </button>
                                    </div>

                                    {/* Remove Liquidity UI (if enabled) */}
                                    {removeOptions[lp.objectId] && (
                                        <div className="mt-4 w-full bg-[#1a1712] p-4 border border-slate-700 rounded-none text-sm md:text-base">
                                            <h2 className="text-lg font-semibold text-slate-100 mb-3">Select Withdrawal Amount</h2>

                                            {/* Percentage Quick Select Buttons */}
                                            <div className="flex justify-between mt-2 mb-4">
                                                {[25, 50, 75, 100].map((percent) => (
                                                    <button
                                                        key={percent}
                                                        onClick={() => handlePercentageClick(lp, percent)}
                                                        className="flex-1 text-md mx-1 bg-[#14110c] hover:bg-slate-600 rounded-none px-3 py-1 text-slate-300"
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
                                                        className="max-w-[240px] flex-1 p-2 outline-none bg-transparent text-xl sm:text-lg overflow-hidden grow text-slate-100"
                                                        placeholder="Enter LP amount"
                                                        value={withdrawAmount[lp.objectId] || ""}
                                                        onChange={(e) => setWithdrawAmount((prev) => ({ ...prev, [lp.objectId]: e.target.value }))}
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
                                                        className="max-w-[240px] flex-1 p-2 outline-none bg-transparent text-xl sm:text-lg overflow-hidden grow text-slate-100"
                                                        placeholder="Enter slippage (e.g., 1.0)"
                                                        value={slippageTolerance[lp.objectId] || ""}
                                                        onChange={(e) => setSlippageTolerance((prev) => ({ ...prev, [lp.objectId]: e.target.value }))}
                                                    />
                                                </div>
                                            </div>

                                            {/* Confirm Button */}
                                            <button
                                                onClick={() => handleRemoveLiquidityConfirm(lp)}
                                                className="w-full px-4 py-2 rounded-none text-sm font-semibold bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:text-[#61F98A] hover:opacity-75 transition mt-2"
                                            >
                                                ✅ Confirm Withdraw LP
                                            </button>
                                            <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} isProcessing={isProcessing} />
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center mt-4 text-slate-300"><strong>No LP positions found. Click View My Positions to check your wallet.</strong></p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
