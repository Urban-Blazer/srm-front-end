"use client";
import { useEffect, useState } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { GETTER_RPC } from "../config"; // Removed PACKAGE_ID, DEX_MODULE_NAME to support any LP token structure

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
    const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [lpTokens, setLpTokens] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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

                    if (!rawType.includes("::LP<")) return null;

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


    return (
        <div className="flex flex-col items-center h-screen p-6 bg-gray-100">
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
                                            <img
                                                src={lp.poolData?.coinA_metadata?.image || "https://via.placeholder.com/40"}
                                                alt={lp.poolData?.coinA_metadata?.symbol || "Coin A"}
                                                className="w-10 h-10 rounded-full"
                                            />
                                            <span className="text-xl font-semibold text-black">
                                                {lp.poolData?.coinA_metadata?.symbol || "Unknown"}
                                            </span>
                                            <span className="text-gray-500 text-lg">/</span>
                                            <img
                                                src={lp.poolData?.coinB_metadata?.image || "https://via.placeholder.com/40"}
                                                alt={lp.poolData?.coinB_metadata?.symbol || "Coin B"}
                                                className="w-10 h-10 rounded-full"
                                            />
                                            <span className="text-xl font-semibold text-black">
                                                {lp.poolData?.coinB_metadata?.symbol || "Unknown"}
                                            </span>
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
                                            <a
                                                href={`/pools/add-liquidity?coinA=${encodeURIComponent(lp.poolData?.coinA_metadata?.typeName)}&coinB=${encodeURIComponent(lp.poolData?.coinB_metadata?.typeName)}`}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition"
                                            >
                                                ➕ Add Liquidity
                                            </a>

                                            {/* Remove Liquidity Button (To Be Implemented) */}
                                            <button
                                                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition"
                                                onClick={() => handleRemoveLiquidity(lp)}
                                            >
                                                ❌ Remove Liquidity
                                            </button>
                                        </div>
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
