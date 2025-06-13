"use client";
import { FC } from "react";
import { usePoolsWithStats } from "../hooks/usePoolsWithStats";
import { useAtomValue } from "jotai";
import { emptyPairAtom } from "@data/store";
import { usePoolStats } from "../hooks/usePoolStats";
import { Spinner } from "./Spinner";
import Link from "next/link";
import Avatar from "./Avatar";

interface PoolsBarProps {
  featuredCoinBSymbol?: string;
}

const PoolsBar: FC<PoolsBarProps> = ({ featuredCoinBSymbol }) => {
  const selectedPair = useAtomValue(emptyPairAtom);
  const { pools, isPending, error } = usePoolsWithStats({
    featuredCoinBSymbol,
  });

  if (isPending) {
    return <Spinner />;
  }

  if (!pools || pools.length === 0) {
    return (
      <div className="w-full text-center text-gray-400 py-4">
        No pools available.
      </div>
    );
  }

  console.log({ pools });

  return (
    <div className="w-full mb-4">
      <h2 className="text-white text-lg text-center mb-2"><b>REWARDS</b></h2>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-300">
        {pools.map((pool) => (
          <Link
            key={pool.poolId}
            href={`/swap/${pool.coinA.symbol}/${pool.coinB.symbol}`}
          >
            <div
              className={`flex flex-col h-full p-4 text-white ${
                selectedPair?.poolId && selectedPair.poolId === pool.poolId
                  ? "border border-3"
                  : "bg-[#130e18]"
              } border-[${
                selectedPair?.poolId && selectedPair.poolId === pool.poolId
                  ? "#5E21A1"
                  : "#130e18"
              }] items-center gap-2 opacity-${
                selectedPair?.poolId && selectedPair.poolId === pool.poolId
                  ? "100"
                  : "75"
              } hover:opacity-100 hover:cursor-pointer `}
            >
              <div className={`w-full flex justify-between gap-2`}>
                <Avatar
                  src={pool.coinA.image}
                  alt={pool.coinA.symbol}
                  className="w-8 h-8 aspect-square rounded-full token-icon"
                />
                <span className="text-white text-lg">{pool.coinA.symbol}</span>
                <span className="text-white text-lg">/</span>
                <Avatar
                  src={pool.coinB.image}
                  alt={pool.coinB.symbol}
                  className="w-8 h-8 aspect-square rounded-full token-icon"
                />
                <span className="text-white text-lg">{pool.coinB.symbol}</span>
              </div>
              <div className={`w-full flex items-center gap-2`}>
                <RewardsDistributed
                  rewardsDistributed={pool.rewardsDistributed}
                />

                <Avatar
                  src={pool.coinA.image}
                  alt={pool.coinA.symbol}
                  className="w-5 h-5 aspect-square rounded-full token-icon"
                />
              </div>
              <div className={`w-full flex items-center gap-2`}>
                <RewardsBalance poolId={pool.poolId} />

                <Avatar
                  src={pool.coinA.image}
                  alt={pool.coinA.symbol}
                  className="w-5 h-5 aspect-square rounded-full token-icon"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PoolsBar;

const RewardsDistributed = ({
  rewardsDistributed,
}: {
  rewardsDistributed: number;
}) => {
  return (
    <div className="w-full flex justify-between items-center gap-2">
      <b className="text-white text-xs">DISTRIBUTED 24H: </b>
      <span className="text-white text-xs">
        {(Number(rewardsDistributed) / 10 ** 9).toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        })}
      </span>
    </div>
  );
};

const RewardsBalance = ({ poolId }: { poolId: string }) => {
  const {
    poolStats,
    isLoading: statsLoading,
    isPending: statsPending,
    error,
  } = usePoolStats(poolId);
  return statsLoading || statsPending ? (
    <Spinner />
  ) : (
    poolStats && (
      <div className="w-full flex justify-between items-center gap-2">
        <b className="text-white text-xs">BALANCE: </b>
        <span className="text-white text-xs">
          {(poolStats.reward_balance_a / Math.pow(10, 9)).toLocaleString(
            undefined,
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}
        </span>
      </div>
    )
  );
};
