"use client";
import { useState } from "react";
import CopyIcon from "@svg/copy-icon.svg";
import { Spinner } from "./Spinner";
import ExplorerAccountLink from "./ExplorerLink/ExplorerAccountLink";
import { ExternalLinkIcon } from "lucide-react";

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

export default function PoolInfoV2({ poolId, coinA, coinB, poolStats, loading }: Props) {
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    if (!poolId) return <p className="text-gray-400 text-sm">No pool selected</p>;

    return (
        <div className="w-full border border-gray-800 shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
                {loading && <Spinner />}            
            </div>

            {poolStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-300">
                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">Balance A</span>
                        <span className="text-white font-medium flex items-center gap-1">
                            {(poolStats.balance_a / Math.pow(10, coinA?.decimals ?? 0)).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                            {coinA?.image && (
                                <img src={coinA.image} alt={coinA.symbol} className="w-4 h-4 rounded-full" />
                            )}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">Balance B</span>
                        <span className="text-white font-medium flex items-center gap-1">
                            {(poolStats.balance_b / Math.pow(10, coinB?.decimals ?? 0)).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                            {coinB?.image && (
                                <img src={coinB.image} alt={coinB.symbol} className="w-4 h-4 rounded-full" />
                            )}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">Reward Balance</span>
                        <span className="text-white font-medium flex items-center gap-1">
                            {(poolStats.reward_balance_a / Math.pow(10, coinA?.decimals ?? 0)).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                            {coinA?.image && (
                                <img src={coinA.image} alt={coinA.symbol} className="w-4 h-4 rounded-full" />
                            )}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">LP Builder Fee</span>
                        <span className="text-white font-medium">
                            {(poolStats.lp_builder_fee / 100).toFixed(2)}%
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">Burn Fee</span>
                        <span className="text-white font-medium">
                            {(poolStats.burn_fee / 100).toFixed(2)}%
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">Rewards Fee</span>
                        <span className="text-white font-medium">
                            {(poolStats.rewards_fee / 100).toFixed(2)}%
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">Creator Royalty Fee</span>
                        <span className="text-white font-medium">
                            {(poolStats.creator_royalty_fee / 100).toFixed(2)}%
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs">Creator Wallet</span>
                        <div className="text-white font-medium flex items-center gap-1">
                            <ExplorerAccountLink
                                account={poolStats.creator_royalty_wallet}
                                className="flex items-center gap-1 text-white"
                            >
                                {poolStats.creator_royalty_wallet.slice(0, 6)}…{poolStats.creator_royalty_wallet.slice(-4)} <ExternalLinkIcon size={16} />
                            </ExplorerAccountLink>
                        </div>
                    </div>
                </div>
            ) : !loading && (
                <p className="text-gray-400 text-sm">No data available for this pool.</p>
            )}
        </div>
    );
}
