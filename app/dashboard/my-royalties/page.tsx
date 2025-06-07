"use client";
import Avatar from "@components/Avatar";
import TransactionModal from "@components/TransactionModal";
import Button from "@components/UI/Button";
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DEX_MODULE_NAME, GETTER_RPC, PACKAGE_ID } from "../../config";

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
    const router = useRouter();
    const [pools, setPools] = useState<any[]>([]); // Stores API pool data
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const account = useCurrentAccount();
    const wallet = useCurrentWallet()?.currentWallet;
    const walletAddress = account?.address;
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
    };

    const fetchCreatorBalances = useCallback(async (pools: any[]) => {
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
    },[]);

    useEffect(() => {
        if (isProcessing) {
            setIsModalOpen(true); // ✅ Ensures modal opens when processing starts
        }
    }, [isProcessing]); // ✅ Reacts when `isProcessing` changes

    // ✅ Initialize Nightly Connect and Fetch Pools
    useEffect(() => {
        const fetchUserPools = async () => {
            if (!walletAddress) return;

            try {
                console.log("📡 Fetching pools for connected account:", walletAddress);
                const response = await fetch(`/api/get-pool-stats?walletAddress=${encodeURIComponent(walletAddress)}`);
                const pools = await response.json();

                if (!Array.isArray(pools)) {
                    throw new Error("Invalid pool data returned from API");
                }

                console.log("✅ Pools fetched from API:", pools);
                setPools(pools);
                fetchCreatorBalances(pools); // optionally fetch extra stats
            } catch (error) {
                console.error("❌ Error fetching user pools:", error);
                setPools([]);
            }
        };

        fetchUserPools();
    }, [fetchCreatorBalances, walletAddress]);

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

    // ✅ Fetch Pool Stats from Sui RPC
    const fetchPoolStats = async (poolObjectId: any) => {
        if (!poolObjectId) return null;

        console.log("🔍 Fetching Creator Balance from RPC for Pool ID:", poolObjectId);

        try {
            const poolObject = await provider.getObject({
                id: poolObjectId,
                options: { showContent: true },
            });

            if ((poolObject?.data?.content as any)?.fields) {
                return {
                    balance_a: Number((poolObject?.data?.content as any)?.fields.creator_balance_a) || 0, // ✅ Only fetch balance
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
    const handleClaimRewards = async (pool: any) => {
        setIsProcessing(true);
        setIsModalOpen(true);
        setTimeout(() => setLogs([]), 100);

        if (!wallet || !walletAddress) {
            alert("⚠️ Please connect your wallet first.");
            return;
        }

        try {
            setLoading(true);

            if (!walletAddress) {
                alert("⚠️ No accounts found. Please reconnect your wallet.");
                setLoading(false);
                return;
            }

            console.log("✅ User Address:", walletAddress);
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

            let executeResponse: any;

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

    const fetchTransactionWithRetry = async (txnDigest: string, retries = 5, delay = 2000) => {
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
        <div className="flex flex-col bg-[#000306] items-center w-full min-h-[80vh] px-4">
            {/* ✅ Keep <h1> at the top */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center mt-6 mb-6">MY ROYALTIES</h1>

            <div className="flex items-center justify-center gap-2 sm:gap-4 p-3 sm:p-4 bg-royalPurple mb-4 w-full max-w-2xl">
                <p className="text-highlight text-center text-sm sm:text-m mt-1">
                    Creator Rewards are automatically distributed once the balance exceeds 0.1 Sui or 100 USDC Coins.<br />
                    Alternatively, you can claim here at any time.
                </p>
            </div>

            {/* ✅ Center Loading and Messages Below <h1> */}
            {!walletAddress && <p className="text-center text-base sm:text-lg text-royalPurple">🔌 Please connect your wallet</p>}
            {loading && <p className="text-center text-base sm:text-lg text-royalPurple">⏳ Loading pools...</p>}

            {/* ✅ If no pools have rewards, show message + button */}
            {walletAddress && !loading && pools.filter((pool) => pool.balance_a > 0).length === 0 && (
                <div className="flex flex-col items-center text-center mt-6 px-4">
                    <p className="text-base sm:text-lg font-medium text-deepTeal"><strong>No royalties available</strong></p>
                    <p className="text-sm sm:text-md text-gray-500 mb-4">Create a new pool to start earning royalties.</p>
                    {/* href="/pools/create-pool" */}
                    <Button
                        variant="primary"
                        size="full"
                        onClick={() => router.push("/pools/create-pool")}
                    >
                        Create Pool
                    </Button>
                </div>
            )}

            {/* ✅ Pool Cards Wrapper (Ensures Centered Left-Right Layout) */}
            <div className="w-full max-w-3xl flex flex-col items-center mt-4 px-2">
                {pools
                    .filter((pool) => pool.balance_a > 0)
                    .map((pool, index) => (
                        <div
                            key={index}
                            className="bg-white p-3 sm:p-4 shadow-md mb-4 flex flex-col items-center text-center space-y-3 w-full max-w-md sm:max-w-lg"
                        >
                            {/* Coin Images & Symbols */}
                            <div className="flex items-center justify-center space-x-1 sm:space-x-2 flex-wrap">
                                <Avatar
                                    src={pool.coinA_image}
                                    alt={pool.coinA_symbol}
                                    className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 rounded-full"
                                />
                                <span className="text-md sm:text-lg md:text-xl font-semibold text-deepTeal">{pool.coinA_symbol}</span>
                                <span className="text-deepTeal text-md sm:text-lg">/</span>
                                <Avatar
                                    src={pool.coinB_image}
                                    alt={pool.coinB_symbol}
                                    className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 rounded-full"
                                />
                                <span className="text-md sm:text-lg md:text-xl font-semibold text-deepTeal">{pool.coinB_symbol}</span>
                            </div>

                            {/* Pool Information */}
                            <div className="w-full px-2">
                                <p className="text-xs sm:text-sm">
                                    <strong>Pool ID:</strong>
                                    <span className="text-royalPurple break-all"> {pool.poolId || "N/A"}</span>
                                </p>
                                <p className="text-xs sm:text-sm">
                                    <strong>Available Rewards:</strong> {(Number(pool.balance_a) / 10 ** pool.coinA_decimals).toFixed(4)} {pool.coinA_symbol}
                                </p>
                            </div>

                            {/* 🚀 Action Buttons */}
                            <div className="flex flex-wrap justify-center space-x-2 sm:space-x-4 mt-3">
                                {/* Claim Rewards Button */}
                                <Button
                                    variant="primary"
                                    size="full"
                                    onClick={() => handleClaimRewards(pool)}
                                >
                                    🎁 CLAIM REWARDS
                                </Button>
                                <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} isProcessing={isProcessing} />
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
