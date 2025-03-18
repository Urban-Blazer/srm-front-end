// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME, CONFIG_ID } from "../../config";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import TransactionModal from "@components/TransactionModal";
import Image from "next/image";

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
    const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [pools, setPools] = useState([]); // Stores API pool data
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Track processing state

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
    };

    useEffect(() => {
        if (isProcessing) {
            setIsModalOpen(true); // ✅ Ensures modal opens when processing starts
        }
    }, [isProcessing]); // ✅ Reacts when `isProcessing` changes

    // ✅ Initialize Nightly Connect and Fetch Pools
    useEffect(() => {
        const initWallet = async () => {
            try {
                const adapter = await NightlyConnectSuiAdapter.build({
                    appMetadata: {
                        name: "Sui Rewards Me",
                        description: "Rewards DEX on Sui",
                        icon: "https://your-app-logo-url.com/icon.png",
                    },
                });

                setWalletAdapter(adapter);
                await adapter.connect();
                const accounts = await adapter.getAccounts();

                if (accounts.length > 0) {
                    console.log("✅ Wallet Connected:", accounts[0]);
                    setWalletConnected(true);
                    setWalletAddress(accounts[0].address); // 🔥 FIXED: Extract actual address

                    fetchPools(accounts[0].address); // Fetch Pools on Connect
                } else {
                    console.warn("⚠️ No accounts found.");
                }

                adapter.on("connect", async (account) => {
                    console.log("🔗 Wallet connected:", account);
                    setWalletConnected(true);
                    setWalletAddress(account.address); // 🔥 FIXED: Extract actual address

                    fetchPools(account.address);
                });

                adapter.on("disconnect", () => {
                    console.log("🔌 Wallet disconnected");
                    setWalletConnected(false);
                    setWalletAddress(null);
                    setPools([]); // Clear pools on disconnect
                });

            } catch (error) {
                console.error("❌ Failed to initialize Nightly Connect:", error);
            }
        };

        initWallet();
    }, []);

    // ✅ Fetch Pools when walletAddress is set
    useEffect(() => {
        if (walletAddress) {
            fetchPools(walletAddress);
        }
    }, [walletAddress]);

    // ✅ Step 1: Fetch Pool Data from API
    const fetchPools = async (walletAddress: string) => {
        setLoading(true);
        try {
            console.log("📡 Fetching pools from API for:", walletAddress);
            const response = await fetch(`/api/get-pool-stats?walletAddress=${encodeURIComponent(walletAddress)}`);
            const pools = await response.json();

            if (!Array.isArray(pools)) throw new Error("Invalid pool data from API");

            console.log("✅ API Pools Fetched:", pools);

            // ✅ Store pool metadata first (poolId, coinA, coinB)
            setPools(pools);

            // ✅ Fetch reward balances separately
            fetchCreatorBalances(pools);
        } catch (error) {
            console.error("❌ Error fetching pools from API:", error);
            setPools([]);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Step 2: Fetch Creator Balance for each Pool
    const fetchCreatorBalances = async (pools) => {
        try {
            const updatedPools = await Promise.all(
                pools.map(async (pool) => {
                    const stats = await fetchPoolStats(pool.poolId); // Fetch from RPC
                    return {
                        ...pool,
                        balance_a: stats?.balance_a || 0, // ✅ Store `creator_balance_a`
                    };
                })
            );

            console.log("✅ Updated Pools with Reward Balances:", updatedPools);
            setPools(updatedPools);
        } catch (error) {
            console.error("❌ Error fetching reward balances:", error);
        }
    };

    // ✅ Fetch Pool Stats from Sui RPC
    const fetchPoolStats = async (poolObjectId) => {
        if (!poolObjectId) return null;

        console.log("🔍 Fetching Creator Balance from RPC for Pool ID:", poolObjectId);

        try {
            const poolObject = await provider.getObject({
                id: poolObjectId,
                options: { showContent: true },
            });

            if (poolObject?.data?.content?.fields) {
                return {
                    balance_a: Number(poolObject.data.content.fields.creator_balance_a) || 0, // ✅ Only fetch balance
                };
            } else {
                console.warn("⚠️ Missing balance field in RPC response:", poolObject);
                return null;
            }
        } catch (error) {
            console.error("❌ Error fetching creator balance:", error);
            return null;
        }
    };

    // ✅ Function to Handle Claiming Rewards
    const handleClaimRewards = async (pool) => {
        setIsProcessing(true);
        setIsModalOpen(true);
        setTimeout(() => setLogs([]), 100);

        if (!walletConnected || !walletAddress || !walletAdapter) {
            alert("⚠️ Please connect your wallet first.");
            return;
        }

        try {
            setLoading(true);

            const accounts = await walletAdapter.getAccounts();
            const userAddress = accounts[0]?.address;

            if (!userAddress) {
                alert("⚠️ No accounts found. Please reconnect your wallet.");
                setLoading(false);
                return;
            }

            console.log("✅ User Address:", userAddress);
            console.log("✅ Pool ID:", pool.poolId);
            console.log("✅ Coin A:", pool.coinA);
            console.log("✅ Coin B:", pool.coinB);

            if (!pool.coinA || !pool.coinB) {
                alert("⚠️ Pool is missing token types. Please try again.");
                setLoading(false);
                return;
            }

            addLog("✅ Authorization check will be done on-chain!");

            // ✅ Build Transaction Block
            const txb = new TransactionBlock();

            txb.moveCall({
                target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::withdraw_creator_royalty_fees`,
                typeArguments: [pool.coinA, pool.coinB], // ✅ Use correct field names
                arguments: [txb.object(pool.poolId)], // Pool ID (mutable)
            });

            // ✅ Sign Transaction
            addLog("✍️ Signing transaction...");
            const signedTx = await walletAdapter.signTransactionBlock({
                transactionBlock: txb,
                account: userAddress,
                chain: "sui:testnet",
            });

            addLog("✅ Transaction Signed!");

            // ✅ Submit Transaction
            addLog("🚀 Submitting transaction...");
            const executeResponse = await provider.executeTransactionBlock({
                transactionBlock: signedTx.transactionBlockBytes,
                signature: signedTx.signature,
                options: { showEffects: true, showEvents: true },
            });

            addLog("✅ Transaction Submitted!");

            // ✅ Track Transaction Digest
            const txnDigest = executeResponse.digest;
            addLog(`🔍 Transaction Digest: ${txnDigest}`);

            if (!txnDigest) {
                alert("Transaction failed. Please check the console.");
                setLoading(false);
                return;
            }

            // ✅ Wait for Confirmation
            addLog("🕒 Waiting for confirmation...");
            let txnDetails = await fetchTransactionWithRetry(txnDigest);

            if (!txnDetails) {
                alert("Transaction not successful. Please retry.");
                setLoading(false);
                return;
            }

            addLog("✅ Transaction Confirmed!");

            // ✅ Refresh Creator Balance After Successful Transaction
            addLog("🔄 Refreshing creator balance...");
            fetchCreatorBalances([pool]); // Pass only the affected pool

            // ✅ Show success message
            alert("🎉 Rewards successfully claimed!");

        } catch (error) {
            console.error("❌ Claim Rewards Transaction failed:", error);
            alert("Transaction failed. Check the console.");
        } finally {
            setLoading(false);
            setIsProcessing(false);
            setTimeout(() => setIsModalOpen(false), 5000);
        }
    };

    const fetchTransactionWithRetry = async (txnDigest, retries = 5, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`🔄 Attempt ${i + 1}: Fetching transaction status for ${txnDigest}...`);
                const txnDetails = await provider.getTransactionBlock({
                    digest: txnDigest,
                    options: { showEffects: true, showEvents: true },
                });

                if (txnDetails) {
                    console.log("✅ Transaction Details Fetched:", txnDetails);
                    return txnDetails;
                }
            } catch (error) {
                console.warn(`⚠️ Error fetching transaction. Retrying in ${delay / 1000} seconds...`, error);
            }

            await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
        }

        console.error("❌ Failed to fetch transaction details after retries.");
        return null;
    };

    return (
        <div className="flex flex-col bg-white items-center w-full min-h-screen px-4">
            {/* ✅ Keep <h1> at the top */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center mt-6 mb-6">My Royalties</h1>

            <div className="flex items-center justify-center gap-2 sm:gap-4 p-3 sm:p-4 bg-royalPurple rounded-lg mb-4 w-full max-w-2xl">
                <p className="text-highlight text-center text-sm sm:text-m mt-1">
                    Creator Rewards are automatically distributed once the balance exceeds 10 Coins.<br />
                    Alternatively, you can claim here at any time.
                </p>
            </div>

            {/* ✅ Center Loading and Messages Below <h1> */}
            {!walletConnected && <p className="text-center text-base sm:text-lg text-royalPurple">🔌 Please connect your wallet</p>}
            {loading && <p className="text-center text-base sm:text-lg text-royalPurple">⏳ Loading pools...</p>}

            {/* ✅ If no pools have rewards, show message + button */}
            {walletConnected && !loading && pools.filter((pool) => pool.balance_a > 0).length === 0 && (
                <div className="flex flex-col items-center text-center mt-6 px-4">
                    <p className="text-base sm:text-lg font-medium text-deepTeal"><strong>No royalties available</strong></p>
                    <p className="text-sm sm:text-md text-gray-500 mb-4">Create a new pool to start earning royalties.</p>
                    <a
                        href="/pools/create-pool"
                        className="bg-emeraldGreen text-white px-4 py-2 rounded-md text-sm sm:text-base font-medium hover:bg-softMint transition"
                    >
                        ➕ Create Pool
                    </a>
                </div>
            )}

            {/* ✅ Pool Cards Wrapper (Ensures Centered Left-Right Layout) */}
            <div className="w-full max-w-3xl flex flex-col items-center mt-4 px-2">
                {pools
                    .filter((pool) => pool.balance_a > 0)
                    .map((pool, index) => (
                        <div
                            key={index}
                            className="bg-white p-3 sm:p-4 rounded-lg shadow-md mb-4 flex flex-col items-center text-center space-y-3 w-full max-w-md sm:max-w-lg"
                        >
                            {/* Coin Images & Symbols */}
                            <div className="flex items-center justify-center space-x-1 sm:space-x-2 flex-wrap">
                                <Image
                                    src={pool.coinA_image}
                                    alt={pool.coinA_symbol}
                                    width={20}
                                    height={20}
                                    className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 rounded-full"
                                />
                                <span className="text-md sm:text-lg md:text-xl font-semibold text-deepTeal">{pool.coinA_symbol}</span>
                                <span className="text-deepTeal text-md sm:text-lg">/</span>
                                <Image
                                    src={pool.coinB_image}
                                    alt={pool.coinB_symbol}
                                    width={20}
                                    height={20}
                                    className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 rounded-full"
                                />
                                <span className="text-md sm:text-lg md:text-xl font-semibold text-deepTeal">{pool.coinB_symbol}</span>
                            </div>

                            {/* Pool Information */}
                            <div className="w-full px-2">
                                <p className="text-deepTeal text-xs sm:text-sm">
                                    <strong>Pool ID:</strong>
                                    <span className="text-royalPurple break-all"> {pool.poolId || "N/A"}</span>
                                </p>
                                <p className="text-xs sm:text-sm text-deepTeal">
                                    <strong>Available Rewards:</strong> {(Number(pool.balance_a) / 10 ** pool.coinA_decimals).toFixed(4)} {pool.coinA_symbol}
                                </p>
                            </div>

                            {/* 🚀 Action Buttons */}
                            <div className="flex flex-wrap justify-center space-x-2 sm:space-x-4 mt-3">
                                {/* Claim Rewards Button */}
                                <button
                                    className="bg-emeraldGreen text-white px-3 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-softMint transition"
                                    onClick={() => handleClaimRewards(pool)}
                                >
                                    🎁 CLAIM REWARDS
                                </button>
                                <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} isProcessing={isProcessing} />
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
