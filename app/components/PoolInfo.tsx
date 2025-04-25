// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import CopyIcon from "@svg/copy-icon.svg";

interface Coin {
    typeName: string;
    decimals: number;
    image?: string;
    name?: string;
    symbol?: string;
}

interface Props {
    provider: SuiClient;
    poolId: string | null;
    coinA: Coin | null;
    coinB: Coin | null;
}

export default function PoolInfo({ provider, poolId, coinA, coinB }: Props) {
    const [poolStats, setPoolStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const fetchPoolStats = async (poolObjectId: string) => {
        if (!poolObjectId) return;

        setLoading(true);
        setPoolStats(null);
        console.log("📥 Fetching Pool Stats for:", poolObjectId);

        try {
            const poolObject = await provider.getObject({
                id: poolObjectId,
                options: { showContent: true },
            });

            const content = poolObject?.data?.content;
            if (content && content.dataType === "moveObject" && "fields" in content) {
                const fields = content.fields;

            if (fields) {
                setPoolStats({
                    balance_a: fields.balance_a || 0,
                    balance_b: fields.balance_b || 0,
                    burn_fee: fields.burn_fee || 0,
                    creator_royalty_fee: fields.creator_royalty_fee || 0,
                    creator_royalty_wallet: fields.creator_royalty_wallet || "",
                    locked_lp_balance: fields.locked_lp_balance || 0,
                    lp_builder_fee: fields.lp_builder_fee || 0,
                    reward_balance_a: fields.reward_balance_a || 0,
                    rewards_fee: fields.rewards_fee || 0,
                });
            } else {
                console.warn("⚠️ Missing fields in pool object:", poolObject);
                setPoolStats(null);
            }
        } catch (error) {
            console.error("❌ Error fetching pool stats:", error);
            setPoolStats(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (poolId) fetchPoolStats(poolId);
    }, [poolId]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);

        // Hide the message after 2 seconds
        setTimeout(() => setCopiedText(null), 2000);
    };

    if (!poolId) return <p className="text-gray-400 text-sm">No pool selected</p>;

    return (
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg shadow-md">
            <h2 className="text-white text-lg font-semibold mb-2">Pool Info</h2>

            {loading && <p className="text-gray-400 text-sm">Loading...</p>}

            {poolStats ? (
                <div className="text-sm text-gray-300 space-y-1">
                    <p>
                        <strong>Balance A:</strong>{" "}
                        {(Number(poolStats.balance_a) / Math.pow(10, coinA?.decimals ?? 0)).toFixed(2)}
                        {coinA?.image && (
                            <img
                                src={coinA.image}
                                alt={coinA.symbol}
                                className="inline-block w-4 h-4 ml-1 rounded-full"
                            />
                        )}
                    </p>

                    <p>
                        <strong>Balance B:</strong>{" "}
                        {(Number(poolStats.balance_b) / Math.pow(10, coinB?.decimals ?? 0)).toFixed(2)}
                        {coinB?.image && (
                            <img
                                src={coinB.image}
                                alt={coinB.symbol}
                                className="inline-block w-4 h-4 ml-1 rounded-full"
                            />
                        )}
                    </p>

                    <p>
                        <strong>Reward Balance:</strong>{" "}
                        {(Number(poolStats.reward_balance_a) / Math.pow(10, coinA?.decimals ?? 0)).toFixed(2)}
                        {coinA?.image && (
                            <img
                                src={coinA.image}
                                alt={coinA.symbol}
                                className="inline-block w-4 h-4 ml-1 rounded-full"
                            />
                        )}
                    </p>

                    <p><strong>LP Builder Fee:</strong> {(Number(poolStats.lp_builder_fee) / 100).toFixed(2)}%</p>
                    <p><strong>Burn Fee:</strong> {(Number(poolStats.burn_fee) / 100).toFixed(2)}%</p>
                    <p><strong>Rewards Fee:</strong> {(Number(poolStats.rewards_fee) / 100).toFixed(2)}%</p>
                    <p><strong>Creator Royalty Fee:</strong> {(Number(poolStats.creator_royalty_fee) / 100).toFixed(2)}%</p>
                    <p className="flex items-center gap-2">
                        <strong>Creator Wallet:</strong>
                        <div className="flex items-center gap-1">
                            <span>
                                {poolStats.creator_royalty_wallet.slice(0, 6)}...
                                {poolStats.creator_royalty_wallet.slice(-4)}
                            </span>
                            <button
                                onClick={() => handleCopy(poolStats.creator_royalty_wallet)}
                                className="bg-white p-1 rounded hover:bg-softMint"
                                title="Copy Wallet"
                            >
                                <CopyIcon className="w-2 h-2 hover:opacity-70" />
                            </button>
                            {copiedText === poolStats.creator_royalty_wallet && (
                                <span className="text-xs text-green-500 ml-1">Copied!</span>
                            )}
                        </div>
                    </p>
                </div>
            ) : !loading && (
                <p className="text-gray-400 text-sm">No data available for this pool.</p>
            )}
        </div>
    );
}