// @ts-nocheck
import { useState, useEffect } from "react";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import Image from "next/image";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC } from "../config";

const suiClient = new SuiClient({ url: GETTER_RPC });

const MergeCoinsModal = ({ adapter }: { adapter: NightlyConnectSuiAdapter }) => {
    const [coins, setCoins] = useState<any[]>([]);
    const [mergeableCoins, setMergeableCoins] = useState<Record<string, any[]>>({});
    const [coinMetadata, setCoinMetadata] = useState<Record<string, any>>({});
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!adapter.connected) return;

        adapter.getAccounts().then((accounts) => {
            if (accounts.length > 0) {
                setWalletAddress(accounts[0].address);
            }
        });
    }, [adapter]);

    /**
     * ✅ Format Coin Name (Handles LP Tokens)
     */
    const formatCoinName = (coinType: string): string => {
        if (!coinType) return "Unknown";

        if (coinType.includes("LP<")) {
            try {
                const regex = /LP<([^,]+),\s*([^>]+)>/;
                const match = coinType.match(regex);

                if (match) {
                    const symbolA = match[1].split("::").pop();
                    const symbolB = match[2].split("::").pop();
                    return `LP ${symbolA} / ${symbolB}`;
                }
            } catch (error) {
                console.error("❌ Error parsing LP token name:", error);
            }
        }

        return coinMetadata[coinType]?.symbol || coinType.split("::").pop() || "Unknown";
    };

    /**
     * ✅ Fetch Metadata from RPC
     */
    const fetchMetadata = async (coinTypes: string[]) => {
        try {
            const metadataResults = await Promise.all(
                coinTypes.map(async (coinType) => {
                    try {
                        const metadata = await suiClient.getCoinMetadata({ coinType });
                        return { coinType, metadata };
                    } catch {
                        return { coinType, metadata: null };
                    }
                })
            );

            const metadataMap = metadataResults.reduce((acc, { coinType, metadata }) => {
                if (metadata) acc[coinType] = metadata;
                return acc;
            }, {} as Record<string, any>);

            setCoinMetadata(metadataMap);
        } catch (error) {
            console.error("❌ Error fetching metadata:", error);
        }
    };

    /**
     * ✅ Fetch Coins from RPC
     */
    const fetchCoins = async () => {
        if (!walletAddress) return;

        try {
            let allCoins: any[] = [];
            let cursor: string | null = null;

            do {
                const result = await suiClient.getAllCoins({ owner: walletAddress, cursor });
                allCoins = [...allCoins, ...result.data];
                cursor = result.nextCursor ?? null;
            } while (cursor);

            setCoins(allCoins);

            const groupedCoins = allCoins.reduce((acc, coin) => {
                if (!acc[coin.coinType]) acc[coin.coinType] = [];
                acc[coin.coinType].push(coin);
                return acc;
            }, {} as Record<string, any[]>);

            // ✅ Only keep coins that can be merged
            const mergeCandidates = Object.fromEntries(
                Object.entries(groupedCoins).filter(([, coins]) => (coins as any[]).length > 1) // ✅ FIXED HERE
            );

            setMergeableCoins(mergeCandidates as Record<string, any[]>);
            fetchMetadata(Object.keys(groupedCoins));
        } catch (error) {
            console.error("❌ Error fetching coins:", error);
        }
    };

    // ✅ Fetch coins on walletAddress change
    useEffect(() => {
        fetchCoins();
    }, [walletAddress]);

    /**
 * ✅ Handle Coin Merging
 */
    const handleMerge = async (coinType: string) => {
        if (!mergeableCoins[coinType] || mergeableCoins[coinType].length < 2) {
            alert("⚠️ Not enough coins to merge.");
            return;
        }

        setLoading(true);

        if (!adapter) {
            alert("⚠️ Please connect your wallet first.");
            setLoading(false);
            return;
        }

        try {
            // ✅ Retrieve the user's wallet address
            const accounts = await adapter.getAccounts();
            const userAddress = accounts[0]?.address;

            if (!userAddress) {
                alert("⚠️ No accounts found. Please reconnect your wallet.");
                setLoading(false);
                return;
            }

            console.log("✅ User Address:", userAddress);
            console.log("✅ Merging Coin Type:", coinType);

            // ✅ Extract coins to merge
            const [primaryCoin, ...coinsToMerge] = mergeableCoins[coinType];

            if (!primaryCoin || coinsToMerge.length === 0) {
                alert("⚠️ Not enough coins to merge.");
                setLoading(false);
                return;
            }

            console.log("✅ Primary Coin:", primaryCoin.coinObjectId);
            console.log("✅ Coins to Merge:", coinsToMerge.map((c) => c.coinObjectId));

            // ✅ Build the Transaction Block
            const txb = new TransactionBlock();
            const primaryCoinInput = txb.object(primaryCoin.coinObjectId);
            const mergeCoinInputs = coinsToMerge.map((coin) => txb.object(coin.coinObjectId));
            txb.mergeCoins(primaryCoinInput, mergeCoinInputs);

            // ✅ Sign Transaction
            console.log("✍️ Signing transaction...");
            const signedTx = await adapter.signTransactionBlock({
                // @ts-ignore
                transactionBlock: txb,
                chain: "sui:testnet",
            });

            console.log("✅ Transaction Signed!");

            // ✅ Submit Transaction
            console.log("🚀 Submitting transaction...");
            const executeResponse = await suiClient.executeTransactionBlock({
                transactionBlock: signedTx.transactionBlockBytes,
                signature: signedTx.signature,
                options: { showEffects: true, showEvents: true },
            });

            console.log("✅ Transaction Submitted!");

            // ✅ Track Transaction Digest
            const txnDigest = executeResponse.digest;
            console.log(`🔍 Transaction Digest: ${txnDigest}`);

            if (!txnDigest) {
                alert("⚠️ Transaction failed. Please check the console.");
                setLoading(false);
                return;
            }

            // ✅ Wait for Confirmation
            console.log("🕒 Waiting for confirmation...");
            let txnDetails = await fetchTransactionWithRetry(txnDigest);

            if (!txnDetails) {
                alert("⚠️ Transaction not successful. Please retry.");
                setLoading(false);
                return;
            }

            console.log("✅ Transaction Confirmed!");

            // ✅ Refresh Coin List
            console.log("🔄 Refreshing wallet balance...");
            await fetchCoins();

            // ✅ Remove merged coins from UI
            setMergeableCoins((prev) => {
                const updated = { ...prev };
                if (updated[coinType]) {
                    updated[coinType] = updated[coinType].slice(1);
                    if (updated[coinType].length < 2) delete updated[coinType];
                }
                if (Object.keys(updated).length === 0) {
                    setIsOpen(false); // Close modal if no mergeable coins are left
                }
                return updated;
            });

            alert("🎉 Coins successfully merged!");

        } catch (error) {
            console.error(`❌ Merge failed for ${coinType}:`, error);
            alert("⚠️ Merge transaction failed. Please check the console.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactionWithRetry = async (txnDigest, retries = 5, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`🔄 Attempt ${i + 1}: Fetching transaction status for ${txnDigest}...`);
                const txnDetails = await suiClient.getTransactionBlock({
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
        <div>
            {/* ✅ Show GIF only if there are mergeable coins */}
            {Object.keys(mergeableCoins).length > 0 && (
                <div className="flex flex-col items-center mt-4 text-center">
                  {/*  <p className="text-lg font-semibold text-emeraldGreen mb-2">Merge Coins</p> */}
                    <Image
                        src="/merge_coin.gif"
                        alt="Merge Coins"
                        width={60}
                        height={60}
                        className="cursor-pointer"
                        onClick={() => setIsOpen(true)}
                    />
                </div>
            )}

            {/* ✅ Merge Modal */}
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
                        <h1 className="text-xl font-bold mb-4">Merge Coins</h1>
                        <p className="text-sm mb-4 text-deepTeal">You have coins that can be merged.</p>

                        {/* ✅ Scrollable List of Mergeable Coins */}
                        <ul className="max-h-60 overflow-y-auto space-y-2">
                            {Object.keys(mergeableCoins).map((coinType) => {
                                const metadata = coinMetadata[coinType] || {};
                                const displayName = formatCoinName(coinType);

                                return (
                                    <li key={coinType} className="flex items-center justify-between p-2 border rounded-lg">
                                        <div className="flex items-center space-x-3 w-full">
                                            {metadata.iconUrl && (
                                                <Image
                                                    src={metadata.iconUrl}
                                                    alt={displayName}
                                                    width={24}
                                                    height={24}
                                                    className="rounded-full"
                                                />
                                            )}
                                            <span className="text-deepTeal text-sm w-full text-left"><strong>{displayName}</strong></span>
                                        </div>
                                        <button
                                            onClick={() => handleMerge(coinType)}
                                            disabled={loading}
                                            className="button-secondary px-3 py-2 text-xs md:text-sm rounded-md disabled:bg-gray-400"
                                        >
                                            {loading ? "Merging..." : `Merge ${mergeableCoins[coinType].length} Coins`}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* ✅ Close Button */}
                        <button
                            className="button-primary mt-4 px-4 py-2 rounded-md hover: w-full"
                            onClick={() => setIsOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MergeCoinsModal;