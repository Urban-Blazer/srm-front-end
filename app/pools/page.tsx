"use client";
import { useEffect, useState } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME } from "../config";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import TransactionModal from "@components/TransactionModal";

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
    const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [lpTokens, setLpTokens] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [removeOptions, setRemoveOptions] = useState<{ [key: string]: boolean }>({});
    const [withdrawAmount, setWithdrawAmount] = useState<{ [key: string]: string }>({});
    const [slippageTolerance, setSlippageTolerance] = useState<{ [key: string]: string }>({});

    const [logs, setLogs] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
    };

    // ✅ Initialize Nightly Connect (Matches structure from AddLiquidity.tsx)
    useEffect(() => {
        const initWallet = async () => {
            try {
                const adapter = await NightlyConnectSuiAdapter.build({
                    appMetadata: {
                        name: "Sui DEX",
                        description: "DEX for trading tokens on Sui",
                        icon: "https://your-app-logo-url.com/icon.png",
                    },
                });

                setWalletAdapter(adapter);
                await adapter.connect(); // 🔥 Ensure wallet is connected
                const accounts = await adapter.getAccounts();

                if (accounts.length > 0) {
                    console.log("✅ Wallet Connected:", accounts[0]);
                    setWalletConnected(true);
                    setWalletAddress(accounts[0]);
                } else {
                    console.warn("⚠️ No accounts found.");
                }

                // ✅ Handle wallet connection events
                adapter.on("connect", async (account) => {
                    console.log("🔗 Wallet connected:", account);
                    setWalletConnected(true);
                    setWalletAddress(account);
                });

                // ✅ Handle wallet disconnection
                adapter.on("disconnect", () => {
                    console.log("🔌 Wallet disconnected");
                    setWalletConnected(false);
                    setWalletAddress(null);
                });

            } catch (error) {
                console.error("❌ Failed to initialize Nightly Connect:", error);
            }
        };

        initWallet();
    }, []);

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
        const calculatedAmount = ((Number(lp.balance) / 1e9) * (percentage / 100)).toFixed(4); // Convert from MIST
        setWithdrawAmount((prev) => ({
            ...prev,
            [lp.objectId]: calculatedAmount,
        }));
    };

    // ✅ Fetch LP Tokens
    const fetchLPTokens = async () => {
        if (!walletConnected || !walletAddress) {
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

                        const userCoinA = ownershipPercentage * Number(balanceA);
                        const userCoinB = ownershipPercentage * Number(balanceB);

                        return {
                            objectId: obj.data?.objectId,
                            type: rawType, // Full LP type
                            balance: userLpBalance,
                            poolData: poolData || {},
                            userCoinA: userCoinA / 1e9, // Convert from MIST
                            userCoinB: userCoinB / 1e9, // Convert from MIST
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
        setIsModalOpen(true); // Open modal
        
        if (!walletConnected || !walletAddress || !walletAdapter) {
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

            const accounts = await walletAdapter.getAccounts();
            const userAddress = accounts[0]?.address;

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
            const withdrawFraction = lpWithdraw_MIST * BigInt(1_000_000) / lp.balance; // Scale to avoid precision loss

            // ✅ Calculate minAOut and minBOut proportionally
            const estimatedAOut = (BigInt(Math.floor(lp.userCoinA * 1_000_000_000)) * withdrawFraction) / BigInt(1_000_000);
            const estimatedBOut = (BigInt(Math.floor(lp.userCoinB * 1_000_000_000)) * withdrawFraction) / BigInt(1_000_000);

            // ✅ Apply user-defined slippage
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
            txb.setGasBudget(1_000_000_000);

            txb.moveCall({
                target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::remove_liquidity_with_coins_and_transfer_to_sender`,
                typeArguments: [lp.poolData?.coinA_metadata?.typeName, lp.poolData?.coinB_metadata?.typeName],
                arguments: [
                    txb.object(lp.poolData?.poolId), // ✅ Pool ID
                    txb.object(lpObjectId), // ✅ LP Object ID
                    txb.pure.u64(lpWithdraw_MIST), // ✅ `lp_amount` now passed explicitly
                    txb.pure.u64(minAOut), // ✅ Minimum output for Coin A
                    txb.pure.u64(minBOut), // ✅ Minimum output for Coin B
                ],
            });

            // ✅ Sign Transaction
            addLog("✍️ Signing transaction...");
            console.log("✍️ Signing transaction...");
            const signedTx = await walletAdapter.signTransactionBlock({
                transactionBlock: txb,
                account: userAddress,
                chain: "sui:devnet",
            });

            addLog("✅ Transaction Signed!");
            console.log("✅ Transaction Signed!");

            // ✅ Submit Transaction
            addLog("🚀 Submitting transaction...");
            console.log("🚀 Submitting transaction...");
            const executeResponse = await provider.executeTransactionBlock({
                transactionBlock: signedTx.transactionBlockBytes,
                signature: signedTx.signature,
                options: { showEffects: true, showEvents: true },
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
        } catch (error) {
            addLog("❌ Remove Liquidity Transaction failed:", error);
            console.error("❌ Remove Liquidity Transaction failed:", error);
            alert("Transaction failed. Check the console.");
        } finally {
            setLoading(false);
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


    return (
        <div className="flex flex-col items-center h-screen p-6 pb-20 bg-gray-100 overflow-y-auto">
            <h1 className="text-3xl font-bold mb-6">My Positions</h1>

            {!walletConnected ? (
                <p className="text-gray-700">🔌 Connect your wallet to view LP positions.</p>
            ) : (
                <>
                    <button
                        className="bg-black text-white p-3 rounded-lg mt-4 disabled:opacity-50"
                        onClick={fetchLPTokens}
                        disabled={loading}
                    >
                        {loading ? "Fetching..." : "View My Positions"}
                    </button>

                        {/* Display LP Positions */}
                        <div className="w-full max-w-3xl mt-6">
                            {lpTokens.length > 0 ? (
                                lpTokens.map((lp, index) => (
                                    <div
                                        key={index}
                                        className="bg-white p-4 rounded-lg shadow-md mb-4 flex flex-col items-center text-center space-y-3"
                                    >
                                        {/* Coin Images & Symbols */}
                                        <div className="flex items-center space-x-2">
                                            <img src={lp.poolData?.coinA_metadata?.image || "https://via.placeholder.com/40"} alt={lp.poolData?.coinA_metadata?.symbol || "Coin A"} className="w-10 h-10 rounded-full" />
                                            <span className="text-xl font-semibold text-black">{lp.poolData?.coinA_metadata?.symbol || "Unknown"}</span>
                                            <span className="text-gray-500 text-lg">/</span>
                                            <img src={lp.poolData?.coinB_metadata?.image || "https://via.placeholder.com/40"} alt={lp.poolData?.coinB_metadata?.symbol || "Coin B"} className="w-10 h-10 rounded-full" />
                                            <span className="text-xl font-semibold text-black">{lp.poolData?.coinB_metadata?.symbol || "Unknown"}</span>
                                        </div>

                                        {/* Pool Information */}
                                        <div className="w-full">
                                            <p className="text-gray-700 text-sm">
                                                <strong>Pool ID:</strong>
                                                <span className="text-blue-600 break-all"> {lp.poolData?.poolId || "N/A"}</span>
                                            </p>
                                            <p className="text-sm text-gray-700">
                                                <strong>Balance:</strong> {(Number(lp.balance) / 1e9).toFixed(4)} LP
                                            </p>
                                            <p className="text-sm text-green-700">
                                                <strong>Your Share:</strong> {lp.userCoinA.toFixed(4)} {lp.poolData?.coinA_metadata?.symbol} / {lp.userCoinB.toFixed(4)} {lp.poolData?.coinB_metadata?.symbol}
                                            </p>
                                        </div>

                                        {/* 🚀 Action Buttons */}
                                        <div className="flex space-x-4 mt-3">
                                            {/* Add Liquidity Button */}
                                            <a href={`/pools/add-liquidity?coinA=${encodeURIComponent(lp.poolData?.coinA_metadata?.typeName)}&coinB=${encodeURIComponent(lp.poolData?.coinB_metadata?.typeName)}`} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition">
                                                ➕ Add Liquidity
                                            </a>

                                            {/* Remove Liquidity Button */}
                                            <button
                                                onClick={() => handleRemoveLiquidity(lp)}
                                                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition"
                                            >
                                                ❌ Remove Liquidity
                                            </button>
                                        </div>

                                        {/* 🔽 Remove Liquidity UI (if enabled) */}
                                        {removeOptions[lp.objectId] && (
                                            <div className="mt-4 w-full bg-gray-50 p-4 rounded-lg">
                                                <h3 className="text-lg font-semibold text-black">Select Withdrawal Amount</h3>

                                                {/* Percentage Quick Select Buttons */}
                                                <div className="flex space-x-2">
                                                    {[25, 50, 75, 100].map((percent) => (
                                                        <button
                                                            key={percent}
                                                            onClick={() => handlePercentageClick(lp, percent)}
                                                            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition"
                                                        >
                                                            {percent}%
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Input for LP Amount */}
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border rounded-lg text-black mt-2"
                                                    placeholder="Enter LP amount"
                                                    value={withdrawAmount[lp.objectId] || ""}
                                                    onChange={(e) => setWithdrawAmount((prev) => ({ ...prev, [lp.objectId]: e.target.value }))}
                                                />

                                                {/* ✅ Slippage Tolerance Input */}
                                                <div className="mt-3">
                                                    <label className="block text-black text-sm font-medium">Slippage Tolerance (%)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 border rounded-lg text-black mt-1"
                                                        placeholder="Enter slippage (e.g., 1.0)"
                                                        value={slippageTolerance[lp.objectId] || ""}
                                                        onChange={(e) => setSlippageTolerance((prev) => ({ ...prev, [lp.objectId]: e.target.value }))}
                                                    />
                                                </div>

                                                {/* Confirm Button */}
                                                <button
                                                    onClick={() => handleRemoveLiquidityConfirm(lp)}
                                                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition mt-3 w-full"
                                                >
                                                    ✅ Confirm Withdraw LP
                                                </button>
                                                <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} />
                                            </div>
                                        )}

                                        </div>
                                ))
                            ) : (
                                <p className="text-gray-700 mt-4">No LP positions found.</p>
                            )}

                        </div>


                </>
            )}
        </div>
    );
}
