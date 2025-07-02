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
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import Link from "next/link";
import { FC, useMemo, useState } from "react";
import usePoolRanking from "../hooks/usePoolRanking";
import { usePoolsWithStats } from "../hooks/usePoolsWithStats";
import Avatar from "./Avatar";
import { Spinner } from "./Spinner";
import Image from "next/image";
import { usePredefinedCoins } from "../hooks/usePredefinedCoins";
import { CoinMeta } from "../types";
import { Tooltip } from "@mui/material";

interface PoolsBarProps {
  featuredCoinBSymbol?: string;
  initialExpanded?: boolean;
}

type SortField =
  | "totalVolume"
  | "rewardsDistributed"
  | "rewardsBalance"
  | "timestamp";
type SortDirection = "asc" | "desc";

interface SortedPool {
  poolId: string;
  coinA: {
    symbol: string;
    image: string;
    typeName: string;
  };
  coinB: {
    symbol: string;
    image: string;
    typeName: string;
  };
  coin: CoinMeta;
  rewardsDistributed: number;
  totalVolume?: number;
  buyVolume?: number;
  sellVolume?: number;
  isSRM?: boolean;
  isFeatured?: boolean;
  rewardBalance?: string;
  timestamp?: number;
}

const PoolsBar: FC<PoolsBarProps> = ({
  featuredCoinBSymbol,
  initialExpanded,
}) => {
  // States for sorting and expanding
  const [expanded, setExpanded] = useState(
    initialExpanded === undefined ? false : initialExpanded
  );
  const [sortField, setSortField] = useState<SortField>("totalVolume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [range, setRange] = useState<"24h" | "7d" | "all">("24h");
  // Track copied state for each coin typeName separately
  const [copiedTypeNames, setCopiedTypeNames] = useState<Record<string, boolean>>({});

  const selectedPair = useAtomValue(emptyPairAtom);
  const { coins: predefinedCoins } = usePredefinedCoins();

  // Fetch pools data from usePoolsWithStats - this gives us the basic pool info and rewards
  const {
    pools,
    isPending: isPoolsPending,
    error: poolsError,
  } = usePoolsWithStats({
    featuredCoinBSymbol,
    limit: 32, // Request more pools so we have enough for the expanded view
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

      const coin = predefinedCoins.find(
        (coin) => coin.typeName === pool.coinB.typeName
      );

      return {
        ...pool,
        coin,
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
        timestamp: rankingPool ? rankingPool.timestamp : 0,
        rewardBalance: pool.rewardBalance,
      } as SortedPool;
    });
  }, [pools, poolRankingData, featuredCoinBSymbol, predefinedCoins]);

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
        } else if (sortField === "timestamp") {
          fieldA = a.timestamp || 0;
          fieldB = b.timestamp || 0;
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
    const displayLimit = expanded ? (initialExpanded ? 32 : 8) : 4;

    if (expanded && featuredPool) {
      // In expanded mode, featured pool is second after SRM
      if (result.length === 1)
        result.push(featuredPool); // After SRM
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
  }, [combinedPools, sortField, sortDirection, expanded, initialExpanded]);

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

  const handleCopyTypeName = (coin: CoinMeta, event: React.MouseEvent) => {
    // Prevent the event from propagating up to the parent Link
    event.stopPropagation();
    event.preventDefault();
    
    // Set this specific coin's typeName as copied
    const typeName = coin?.typeName ?? "";
    setCopiedTypeNames(prev => ({ ...prev, [typeName]: true }));
    navigator.clipboard.writeText(typeName);
    
    // Reset this specific coin's copied state after 3 seconds
    setTimeout(() => {
      setCopiedTypeNames(prev => ({ ...prev, [typeName]: false }));
    }, 3000);
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
            {initialExpanded && (
              <button
                onClick={() => toggleSort("timestamp")}
                className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                  sortField === "timestamp" ? "text-[#61F98A]" : "text-white"
                }`}
              >
                Creation
                {sortField === "timestamp" &&
                  (sortDirection === "asc" ? (
                    <ArrowUpIcon size={14} />
                  ) : (
                    <ArrowDownIcon size={14} />
                  ))}
              </button>
            )}
          </div>
          {initialExpanded === undefined && (
            <>
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
            </>
          )}
        </div>
      </div>
      {initialExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300 mb-4 md:py-4 md:px-16">
          {sortedPools.slice(0, 2).map((pool) => (
            <div
              key={pool.poolId}
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
              <Link
                href={`/swap/${pool.coinA.symbol}/${pool.coinB.symbol}`}
                className="w-full flex flex-col gap-2 justify-between items-start"
              >
                <div className="w-full flex justify-between items-start">
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
                    {pool.coinB?.typeName && (
                      <Tooltip title="Copy CA">
                        <button
                          onClick={(e) =>
                            handleCopyTypeName(pool.coinB as CoinMeta, e)
                          }
                          className="tooltip"
                          data-tip="Copy CA"
                          aria-label="Copy CA"
                        >
                          {copiedTypeNames[pool.coinB?.typeName || ""] ? (
                            <CheckIcon size={12} className="text-green-500" />
                          ) : (
                            <CopyIcon size={12} className="text-white" />
                          )}
                        </button>
                      </Tooltip>
                    )}
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
              </Link>
              {pool.coin && <Socials coin={pool.coin} />}
            </div>
          ))}
        </div>
      )}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-300">
        {sortedPools.slice(initialExpanded ? 2 : 0).map((pool) => (
          <div
            key={pool.poolId}
            className={`w-full flex flex-col h-full p-4 text-white ${
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
            <Link
              href={`/swap/${pool.coinA.symbol}/${pool.coinB.symbol}`}
              className="w-full flex flex-col gap-2 justify-between items-start"
            >
              <div className="w-full flex justify-between items-start">
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
                  {pool.coinB?.typeName && (
                    <Tooltip title="Copy CA">
                      <button
                        onClick={(e) =>
                          handleCopyTypeName(pool.coinB as CoinMeta, e)
                        }
                        className="tooltip"
                        data-tip="Copy CA"
                        aria-label="Copy CA"
                      >
                        {copiedTypeNames[pool.coinB?.typeName || ""] ? (
                          <CheckIcon size={12} className="text-green-500" />
                        ) : (
                          <CopyIcon size={12} className="text-white" />
                        )}
                      </button>
                    </Tooltip>
                  )}
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
            </Link>
            {pool.coin && <Socials coin={pool.coin} />}
          </div>
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
          className="w-4 h-4 aspect-square rounded-full token-icon"
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
          className="w-4 h-4 aspect-square rounded-full token-icon"
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
    <div className="w-full flex justify-between items-center gap-2">
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
          className="w-4 h-4 aspect-square rounded-full token-icon"
        />
      </div>
    </div>
  );
};

export const Socials = ({ coin }: { coin?: CoinMeta }) => {
  return (
    <div className="w-full flex items-start gap-2">
      {coin?.socials?.website && (
        <a
          href={coin?.socials?.website}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/images/WEB.svg"
            alt="Website"
            width={20}
            height={20}
            className="rounded-full"
            priority
          />
        </a>
      )}
      {coin?.socials?.telegram && (
        <a
          href={coin?.socials?.telegram}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/images/TELEGRAM.svg"
            alt="Telegram"
            width={20}
            height={20}
            className="rounded-full"
            priority
          />
        </a>
      )}
      {coin?.socials?.x && (
        <a href={coin?.socials?.x} target="_blank" rel="noopener noreferrer">
          <Image
            src="/images/X2.svg"
            alt="X"
            width={20}
            height={20}
            className="rounded-full"
            priority
          />
        </a>
      )}
      {coin?.socials?.discord && (
        <a
          href={coin?.socials?.discord}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/images/DISCORD.svg"
            alt="Discord"
            width={20}
            height={20}
            className="rounded-full"
            priority
          />
        </a>
      )}
    </div>
  );
};
