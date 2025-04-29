"use client";
import { useState } from "react";
import CopyIcon from "@svg/copy-icon.svg";

interface Coin {
    typeName: string;
    decimals: number;
    image?: string;
    name?: string;
    symbol?: string;
}

interface PoolStats {
    balance_a: number;
    balance_b: number;
    burn_fee: number;
    creator_royalty_fee: number;
    creator_royalty_wallet: string;
    locked_lp_balance: number;
    lp_builder_fee: number;
    reward_balance_a: number;
    rewards_fee: number;
}

interface Props {
    poolId: string | null;
    coinA: Coin | null;
    coinB: Coin | null;
    poolStats: PoolStats | null;
    loading: boolean;
}

export default function PoolInfo({ poolId, coinA, coinB, poolStats, loading }: Props) {
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);

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
                        {(poolStats.balance_a / Math.pow(10, coinA?.decimals ?? 0)).toFixed(2)}
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
                        {(poolStats.balance_b / Math.pow(10, coinB?.decimals ?? 0)).toFixed(2)}
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
                        {(poolStats.reward_balance_a / Math.pow(10, coinA?.decimals ?? 0)).toFixed(2)}
                        {coinA?.image && (
                            <img
                                src={coinA.image}
                                alt={coinA.symbol}
                                className="inline-block w-4 h-4 ml-1 rounded-full"
                            />
                        )}
                    </p>

                    <p><strong>LP Builder Fee:</strong> {(poolStats.lp_builder_fee / 100).toFixed(2)}%</p>
                    <p><strong>Burn Fee:</strong> {(poolStats.burn_fee / 100).toFixed(2)}%</p>
                    <p><strong>Rewards Fee:</strong> {(poolStats.rewards_fee / 100).toFixed(2)}%</p>
                    <p><strong>Creator Royalty Fee:</strong> {(poolStats.creator_royalty_fee / 100).toFixed(2)}%</p>

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