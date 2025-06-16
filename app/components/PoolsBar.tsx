"use client";
import { emptyPairAtom } from "@data/store";
import { useAtomValue } from "jotai";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PinIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  StarIcon,
} from "lucide-react";
import Link from "next/link";
import { FC, useMemo, useState } from "react";
import usePoolRanking from "../hooks/usePoolRanking";
import { usePoolsWithStats } from "../hooks/usePoolsWithStats";
import Avatar from "./Avatar";
import { Spinner } from "./Spinner";
import image from "next/image";

interface PoolsBarProps {
  featuredCoinBSymbol?: string;
}

type SortField = "totalVolume" | "rewardsDistributed" | "rewardsBalance";
type SortDirection = "asc" | "desc";

interface SortedPool {
  poolId: string;
  coinA: {
    symbol: string;
    image: string;
  };
  coinB: {
    symbol: string;
    image: string;
  };
  rewardsDistributed: number;
  totalVolume?: number;
  buyVolume?: number;
  sellVolume?: number;
  isSRM?: boolean;
  isFeatured?: boolean;
  rewardBalance?: string;
}

const PoolsBar: FC<PoolsBarProps> = ({ featuredCoinBSymbol }) => {
  // States for sorting and expanding
  const [expanded, setExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>("totalVolume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [range, setRange] = useState<"24h" | "7d" | "all">("24h");

  const selectedPair = useAtomValue(emptyPairAtom);

  // Fetch pools data from usePoolsWithStats - this gives us the basic pool info and rewards
  const {
    pools,
    isPending: isPoolsPending,
    error: poolsError,
  } = usePoolsWithStats({
    featuredCoinBSymbol,
    limit: 12, // Request more pools so we have enough for the expanded view
  });

  // Fetch pool ranking data for volume information
  const {
    poolRankingData,
    isLoading: isRankingLoading,
    error: rankingError,
  } = usePoolRanking(range);

  // Combine pool data with ranking data to get totalVolume for sorting
  const combinedPools = useMemo(() => {
    if (!pools || !poolRankingData) return [];
    console.log({ pools, poolRankingData });
    return pools.map((pool) => {
      // Find matching pool in ranking data
      const rankingPool = poolRankingData.find(
        (rankPool) => rankPool.pool_id === pool.poolId
      );

      // Mark special pools
      const isSRM = pool.coinB.symbol === "SRM";
      const isFeatured =
        featuredCoinBSymbol && pool.coinB.symbol === featuredCoinBSymbol;

      return {
        ...pool,
        totalVolume: rankingPool
          ? parseFloat(rankingPool.totalVolume.replace(/,/g, ""))
          : 0,
        buyVolume: rankingPool
          ? parseFloat(rankingPool.buyVolume.replace(/,/g, ""))
          : 0,
        sellVolume: rankingPool
          ? parseFloat(rankingPool.sellVolume.replace(/,/g, ""))
          : 0,
        isSRM,
        isFeatured,
        rewardBalance: pool.rewardBalance,
      } as SortedPool;
    });
  }, [pools, poolRankingData, featuredCoinBSymbol]);

  // Apply sorting and special rules (SRM first, featured special placement)
  const sortedPools = useMemo(() => {
    if (!combinedPools || combinedPools.length === 0) return [];

    // First separate out our special pools
    let srmPool: SortedPool | undefined = combinedPools.find(
      (p: SortedPool) => p.isSRM
    );
    let featuredPool: SortedPool | undefined = combinedPools.find(
      (p: SortedPool) => p.isFeatured && !p.isSRM
    );
    let regularPools = combinedPools.filter(
      (p: SortedPool) => !p.isSRM && !p.isFeatured
    );

    // Sort the regular pools by the selected field and direction
    const sortedRegularPools = [...regularPools].sort(
      (a: SortedPool, b: SortedPool) => {
        let fieldA: number, fieldB: number;

        if (sortField === "totalVolume") {
          fieldA = a.totalVolume || 0;
          fieldB = b.totalVolume || 0;
        } else if (sortField === "rewardsBalance") {
          fieldA = a.rewardBalance
            ? parseFloat(a.rewardBalance.replace(/,/g, "")) || 0
            : 0;
          fieldB = b.rewardBalance
            ? parseFloat(b.rewardBalance.replace(/,/g, "")) || 0
            : 0;
        } else {
          // rewardsDistributed
          fieldA = a.rewardsDistributed;
          fieldB = b.rewardsDistributed;
        }

        return sortDirection === "asc" ? fieldA - fieldB : fieldB - fieldA;
      }
    );

    const result: SortedPool[] = [];

    // Always add SRM first if it exists
    if (srmPool) result.push(srmPool);

    // Decide where to place featured pool based on expanded state
    const displayLimit = expanded ? 8 : 4;

    if (expanded && featuredPool) {
      // In expanded mode, featured pool is second after SRM
      if (result.length === 1) result.push(featuredPool); // After SRM
      else result.unshift(featuredPool); // First if no SRM

      // Add other pools up to limit
      const remainingSlots = displayLimit - result.length;
      result.push(...sortedRegularPools.slice(0, remainingSlots));
    } else {
      // Add featured pool 2nd
      if (!expanded && featuredPool) result.push(featuredPool);
      // In collapsed mode, featured pool is last
      // Add regular pools up to almost limit
      const regularPoolLimit = featuredPool
        ? displayLimit - result.length
        : displayLimit - result.length;
      result.push(...sortedRegularPools.slice(0, regularPoolLimit));
    }

    return result.slice(0, displayLimit);
  }, [combinedPools, sortField, sortDirection, expanded]);

  // Handle sort toggle
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev: SortDirection) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending when changing sort field
    }
  };

  const isPending = isPoolsPending || isRankingLoading;
  const error = poolsError || rankingError;

  if (isPending) {
    return <Spinner />;
  }

  if (!sortedPools || sortedPools.length === 0) {
    return (
      <div className="w-full text-center text-gray-400 py-4">
        No pools available.
      </div>
    );
  }

  return (
    <div className="w-full mb-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-white text-lg">
            <b>REWARDIANS</b>
          </h2>
          <span className="text-xs text-gray-400">
            {sortedPools.length} pools displayed
          </span>
        </div>
        <div className="flex gap-4">
          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSort("totalVolume")}
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                sortField === "totalVolume" ? "text-[#61F98A]" : "text-white"
              }`}
            >
              Volume
              {sortField === "totalVolume" &&
                (sortDirection === "asc" ? (
                  <ArrowUpIcon size={14} />
                ) : (
                  <ArrowDownIcon size={14} />
                ))}
            </button>
            <button
              onClick={() => toggleSort("rewardsDistributed")}
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                sortField === "rewardsDistributed"
                  ? "text-[#61F98A]"
                  : "text-white"
              }`}
            >
              Rewards
              {sortField === "rewardsDistributed" &&
                (sortDirection === "asc" ? (
                  <ArrowUpIcon size={14} />
                ) : (
                  <ArrowDownIcon size={14} />
                ))}
            </button>
            <button
              onClick={() => toggleSort("rewardsBalance")}
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                sortField === "rewardsBalance" ? "text-[#61F98A]" : "text-white"
              }`}
            >
              Balance
              {sortField === "rewardsBalance" &&
                (sortDirection === "asc" ? (
                  <ArrowUpIcon size={14} />
                ) : (
                  <ArrowDownIcon size={14} />
                ))}
            </button>
          </div>

          {/* Expand/collapse button */}
          <button
            onClick={() => setExpanded((prev: boolean) => !prev)}
            className="flex items-center gap-1 text-sm text-white hover:text-[#61F98A] transition-colors"
          >
            {expanded ? (
              <>
                <span>Show Less</span>
                <ChevronUpIcon size={16} />
              </>
            ) : (
              <>
                <span>Show More</span>
                <ChevronDownIcon size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-300">
        {sortedPools.map((pool) => (
          <Link
            key={pool.poolId}
            href={`/swap/${pool.coinA.symbol}/${pool.coinB.symbol}`}
          >
            <div
              className={`flex flex-col h-full p-4 text-white ${
                selectedPair?.poolId && selectedPair.poolId === pool.poolId
                  ? "border border-3"
                  : pool.isSRM
                  ? "bg-[#180e18] border border-[#5E21A1]"
                  : pool.isFeatured
                  ? "bg-[#0e1818] border border-[#21A15E]"
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
              <div className="w-full flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar
                    src={pool.coinA.image}
                    alt={pool.coinA.symbol}
                    className="lg:w-8 lg:h-8 w-6 h-6 aspect-square rounded-full token-icon"
                  />
                  <span className="text-white lg:text-lg">
                    {pool.coinA.symbol}
                  </span>
                  <span className="text-white lg:text-lg">/</span>
                  <Avatar
                    src={pool.coinB.image}
                    alt={pool.coinB.symbol}
                    className="lg:w-8 lg:h-8 w-6 h-6 aspect-square rounded-full token-icon"
                  />
                  <span className="text-white lg:text-lg">
                    {pool.coinB.symbol}
                  </span>
                </div>
                <div>
                  {pool.isSRM && (
                    <div className="tooltip" data-tip="SRM Pool">
                      <PinIcon size={16} className="text-[#5E21A1]" />
                    </div>
                  )}
                  {pool.isFeatured && (
                    <div className="tooltip" data-tip="Featured Pool">
                      <StarIcon size={16} className="text-[#21A15E]" />
                    </div>
                  )}
                </div>
              </div>
              <RewardsDistributed
                rewardsDistributed={pool.rewardsDistributed}
                image={pool.coinA.image}
                symbol={pool.coinA.symbol}
              />
              <RewardsBalance
                rewardBalance={pool.rewardBalance || "0"}
                image={pool.coinA.image}
                symbol={pool.coinA.symbol}
              />

              {/* Show volume information when available */}
              {pool.totalVolume !== undefined && (
                <VolumeInformation 
                  totalVolume={pool.totalVolume} 
                  image={pool.coinA.image} 
                  symbol={pool.coinA.symbol} 
                />
              )}
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
  image,
  symbol,
}: {
  rewardsDistributed: number;
  image: string;
  symbol: string;
}) => {
  return (
    <div className="w-full flex justify-between items-center gap-2">
      <b className="text-white text-xs">DISTRIBUTED 24H: </b>
      <div className="flex justify-between items-center gap-2">
        <span className="text-white text-xs">
          {(Number(rewardsDistributed) / 10 ** 9).toLocaleString(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}
        </span>

        <Avatar
          src={image}
          alt={symbol}
          className="w-5 h-5 aspect-square rounded-full token-icon"
        />
      </div>
    </div>
  );
};

const RewardsBalance = ({
  rewardBalance,
  image,
  symbol,
}: {
  rewardBalance: string;
  image: string;
  symbol: string;
}) => {
  return (
    <div className="w-full flex justify-between items-center gap-2">
      <b className="text-white text-xs">BALANCE: </b>
      <div className="flex justify-between items-center gap-2">
        <span className="text-white text-xs">
          {(Number(rewardBalance) / Math.pow(10, 9)).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <Avatar
          src={image}
          alt={symbol}
          className="w-5 h-5 aspect-square rounded-full token-icon"
        />
      </div>
    </div>
  );
};

const VolumeInformation = ({
  totalVolume,
  image,
  symbol,
}: {
  totalVolume: number;
  image: string;
  symbol: string;
}) => {
  return (
    <div className="w-full flex justify-between items-center gap-2 mt-1">
      <b className="text-white text-xs">VOLUME 24H: </b>
      <div className="flex items-center gap-2">
        <span className="text-white text-xs">
          {Number(totalVolume).toLocaleString(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}
        </span>
        <Avatar
          src={image}
          alt={symbol}
          className="w-5 h-5 aspect-square rounded-full token-icon"
        />
      </div>
    </div>
  );
};
