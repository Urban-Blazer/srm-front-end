// @ts-nocheck
import { useState, useEffect } from "react";
import Image from "next/image";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC } from "../config";
import { useCurrentAccount, useCurrentWallet } from '@mysten/dapp-kit';

const suiClient = new SuiClient({ url: GETTER_RPC });

const MergeCoinsModal = () => {
    const [coins, setCoins] = useState<any[]>([]);
    const [mergeableCoins, setMergeableCoins] = useState<Record<string, any[]>>({});
    const [coinMetadata, setCoinMetadata] = useState<Record<string, any>>({});
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const account = useCurrentAccount();
    const walletAddress = account?.address;
    const wallet = useCurrentWallet()?.currentWallet;

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

                // ✅ Preserve full ObjectRef for gas assignment
                const coinsWithRefs = result.data.map((coin) => ({
                    coinObjectId: coin.coinObjectId,
                    coinType: coin.coinType,
                    balance: coin.balance,
                    digest: coin.digest,       // ✅ Required for txb.setGasPayment()
                    version: coin.version,     // ✅ Required for txb.setGasPayment()
                }));

                allCoins = [...allCoins, ...coinsWithRefs];
                cursor = result.nextCursor ?? null;
            } while (cursor);

            setCoins(allCoins);

            // ✅ Group coins by type
            const groupedCoins = allCoins.reduce((acc, coin) => {
                if (!acc[coin.coinType]) acc[coin.coinType] = [];
                acc[coin.coinType].push(coin);
                return acc;
            }, {} as Record<string, any[]>);

            // ✅ Only keep coin types with more than 1 coin to allow merging
            const mergeCandidates = Object.fromEntries(
                Object.entries(groupedCoins).filter(([, coins]) => coins.length > 1)
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

        if (!wallet) {
            alert("⚠️ Wallet not connected.");
            setLoading(false);
            return;
        }

        if (!wallet) {
            alert("⚠️ No wallet connected.");
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            if (!walletAddress) {
                alert("⚠️ No wallet address found.");
                setLoading(false);
                return;
            }

            const isSui = coinType === "0x2::sui::SUI";
            const coinGroup = mergeableCoins[coinType];

            let primaryCoin;
            let coinsToMerge = [];

            if (isSui) {
                const sorted = [...coinGroup].sort((a, b) => Number(b.balance) - Number(a.balance));
                primaryCoin = sorted[0];
                coinsToMerge = sorted.slice(1);

                if (!primaryCoin || coinsToMerge.length === 0) {
                    alert("⚠️ Need at least two SUI coins to merge.");
                    setLoading(false);
                    return;
                }
            } else {
                [primaryCoin, ...coinsToMerge] = coinGroup;
            }

            const txb = new TransactionBlock();

            if (isSui) {
                txb.setGasPayment([{
                    objectId: primaryCoin.coinObjectId,
                    digest: primaryCoin.digest,
                    version: primaryCoin.version,
                }]);

                const mergeInputs = coinsToMerge.map((coin) => txb.object(coin.coinObjectId));
                txb.mergeCoins(txb.gas, mergeInputs);
            } else {
                const primaryInput = txb.object(primaryCoin.coinObjectId);
                const mergeInputs = coinsToMerge.map((coin) => txb.object(coin.coinObjectId));
                txb.mergeCoins(primaryInput, mergeInputs);
            }

            // ✅ Sign Transaction
            console.log("✍️ Signing transaction...");
            const signedTx = await wallet.signTransactionBlock({
                transactionBlock: txb,
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
            {walletAddress && Object.keys(mergeableCoins).length > 0 && (
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
                                                <img
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