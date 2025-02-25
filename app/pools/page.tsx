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

        // ✅ Ensure we extract the correct address
        const ownerAddress = typeof walletAddress === "string" ? walletAddress : walletAddress.address;

        if (!ownerAddress || !ownerAddress.startsWith("0x") || ownerAddress.length !== 66) {
            console.error("❌ Invalid Sui address:", ownerAddress);
            alert("⚠️ Wallet address is invalid. Please reconnect your wallet.");
            return;
        }

        setLoading(true);

        try {
            console.log("🔗 Fetching LP tokens for wallet:", ownerAddress);

            // ✅ Get all owned objects
            const { data: ownedObjects } = await provider.getOwnedObjects({
                owner: ownerAddress, // Use the correct extracted address
                options: { showType: true, showContent: true },
            });

            console.log("🔍 Owned Objects:", ownedObjects);

            // ✅ Debug: Log all owned object types
            const allTypes = ownedObjects.map(obj => obj.data?.type);
            console.log("📌 All Owned Types:", allTypes);

            // ✅ Extract LP tokens dynamically
            const lpTokens = ownedObjects
                .map((obj) => {
                    const rawType = obj.data?.type;
                    if (!rawType) return null;

                    console.log("🔎 Checking Type:", rawType);

                    // More flexible check: Look for "::LP<"
                    if (!rawType.includes("::LP<")) return null;

                    return {
                        objectId: obj.data?.objectId,
                        type: rawType, // Full LP type: package::module::LP<CoinA, CoinB>
                        balance: obj.data?.content?.fields?.balance
                            ? BigInt(obj.data?.content?.fields?.balance)
                            : BigInt(0),
                    };
                })
                .filter(Boolean);

            console.log("✅ Extracted LP Tokens:", lpTokens);

            if (lpTokens.length === 0) {
                setLpTokens([]);
                alert("No LP positions found.");
                setLoading(false);
                return;
            }

            setLpTokens(lpTokens);
        } catch (error) {
            console.error("❌ Error fetching LP tokens:", error);
            alert(`Failed to fetch LP tokens: ${error.message}`);
        }

        setLoading(false);
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
                                <div key={index} className="bg-white p-4 rounded-lg shadow-md mb-4">
                                    <h3 className="text-lg font-semibold text-black">LP Token</h3>
                                    <p className="text-gray-700 text-sm break-all">
                                        <strong>Type:</strong> {lp.type}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        <strong>Balance:</strong> {(Number(lp.balance) / 1e9).toFixed(4)} LP
                                    </p>
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
