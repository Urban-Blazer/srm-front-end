"use client";
import { FC } from "react";
import { usePools } from "../hooks/usePools";
import { useAtomValue } from "jotai";
import { emptyPairAtom } from "@data/store";
import usePairStats from "../hooks/usePairStats";
import { usePoolStats } from "../hooks/usePoolStats";
import { Spinner } from "./Spinner";
import Link from "next/link";
import Avatar from "./Avatar";

interface PoolsBarProps { }

const PoolsBar: FC<PoolsBarProps> = () => {
    const selectedPair = useAtomValue(emptyPairAtom);
    const { data, isPending, error } = usePools();


    if (isPending) {
        return (
            <>Loading...</>
        )
    }

    return (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300">
            {data?.map(pool => (
                <Link key={pool.poolId} href={`/swap/${pool.coinA.symbol}/${pool.coinB.symbol}`}>
                    <div className={`flex flex-col h-full p-4 text-white border border-${((selectedPair?.poolId && selectedPair.poolId === pool.poolId) ? '3' : '1')} border-[${(selectedPair?.poolId && selectedPair.poolId === pool.poolId) ? '#61F98A' : '#5E21A1'}] items-center gap-2 opacity-${((selectedPair?.poolId && selectedPair.poolId === pool.poolId) ? '100' : '75')}`}>
                        <div className={`flex items-center gap-2`}>
                            <Avatar
                                src={pool.coinA.image}
                                alt={pool.coinA.symbol}
                                className="w-5 h-5 aspect-square rounded-full token-icon"
                            />
                            <span className="text-white text-sm">
                                {pool.coinA.symbol}
                            </span>
                            <Avatar
                                src={pool.coinB.image}
                                alt={pool.coinB.symbol}
                                className="w-5 h-5 aspect-square rounded-full token-icon"
                            />
                            <span className="text-white text-sm">
                                {pool.coinB.symbol}
                            </span>
                        </div>
                        <div className={`flex items-center gap-2`}>
                            <span className="text-white text-md">
                                <b>Rewards</b>
                            </span>
                        </div>
                        <div className={`flex items-center gap-2`}>
                            <RewardsDistributed poolId={pool.poolId} />

                            <Avatar
                                src={pool.coinA.image}
                                alt={pool.coinA.symbol}
                                className="w-5 h-5 aspect-square rounded-full token-icon"
                            />
                        </div>
                        <div className={`flex items-center gap-2`}>
                            <RewardsBalance poolId={pool.poolId} />

                            <Avatar
                                src={pool.coinA.image}
                                alt={pool.coinA.symbol}
                                className="w-5 h-5 aspect-square rounded-full token-icon"
                            />
                        </div>
                        {(selectedPair?.poolId && selectedPair.poolId === pool.poolId)  && (
                            <div className={`flex items-center gap-2`}>
                                <span className="text-xs text-green-800 bg-green-200 rounded-full px-2 py-1">active</span>
                            </div>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default PoolsBar;

const RewardsDistributed = ({ poolId }: { poolId: string }) => {
    const { pairStats, isPending: isStats24hPending } = usePairStats(poolId, "24h");
    return (
        <>
            <span className="text-white text-sm"><b>Distributed 24h: </b></span>
            <span className="text-white text-sm">
                {(Number(pairStats?.rewardsDistributed ?? 0) / 10 ** 9).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2
                })}
            </span>
        </>
    );
}

const RewardsBalance = ({ poolId }: { poolId: string }) => {
    const {
        poolStats,
        isLoading: statsLoading,
        isPending: statsPending,
        error,
    } = usePoolStats(poolId);
    return statsLoading || statsPending ? <Spinner /> : poolStats && (
        <>
            <span className="text-white text-sm"><b>Balance: </b></span>
            <span className="text-white text-sm">
                {(poolStats.reward_balance_a / Math.pow(10, 9)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
            </span>
        </>
    );
}