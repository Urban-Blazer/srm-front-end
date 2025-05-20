"use client";
import { selectedRangeAtom } from "@data/store";
import { useAtom } from "jotai";
import usePairStats from "../hooks/usePairStats";
import { Coin, CoinMeta, rangeMap } from "../types";
import { SRM_COIN_SUPPLY, SRM_COINTYPE } from "../config";
import useQuote from "../hooks/useQuote";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import useCoinPrice from "../hooks/useCoinPrice";
import { Spinner } from "./Spinner";
import { Stats } from "@/app/types";
import { useCoinSupply } from "../hooks/useCoinSupply";
import Avatar from "./Avatar";

export interface PairStatsProps {
  poolId: string | null;
  coinA: CoinMeta | null;
  coinB: CoinMeta | null;
  poolStats?: any;
  variant?: "default" | "mcap";
}

export default function PairStats({
  poolId,
  coinA,
  coinB,
  poolStats,
  variant = "default",
}: PairStatsProps) {
  const [selectedRange, setSelectedRange] = useAtom(selectedRangeAtom);
  const { data: buy1SuiQuote } = useQuote(
    new URLSearchParams({
      poolId: poolId!,
      amount: (1 * Number(MIST_PER_SUI)).toString(),
      isSell: "true",
      isAtoB: "true",
      outputDecimals: coinB?.decimals.toString() ?? "9",
      balanceA: poolStats?.balance_a.toString(),
      balanceB: poolStats?.balance_b.toString(),
      lpBuilderFee: poolStats?.lp_builder_fee.toString(),
      burnFee: poolStats?.burn_fee.toString(),
      creatorRoyaltyFee: poolStats?.creator_royalty_fee.toString(),
      rewardsFee: poolStats?.rewards_fee.toString(),
    }),
    (1 * Number(MIST_PER_SUI)).toString()
  );

  const { pairStats: stats, isLoading } = usePairStats(
    poolId!,
    rangeMap[selectedRange]
  );
  const { pairStats: statsLifetime, isLoading: isStatsLifetimeLoading } =
    usePairStats(poolId!, "lifetime");

  const { data: coinAPriceUSD } = useCoinPrice("SUI");
  const { coinSupply } = useCoinSupply(coinB?.typeName);
  console.log("coinSupply", coinSupply);
  const coinADecimals = coinA?.decimals ?? 0;
  const coinBDecimals = coinB?.decimals ?? 0;

  return (
    <div
      className={`w-full border border-gray-800 shadow-md ${
        variant === "mcap" ? "" : "p-4"
      }`}
    >
      {variant === "default" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex">
              {(isLoading || isStatsLifetimeLoading) && <Spinner />}
            </div>
            <select
              className="bg-[#14110c] border border-[#221d14] text-white text-sm px-3 py-1 focus:outline-none"
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
            >
              {Object.keys(rangeMap).map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className={variant === "mcap" ? "flex flex-col sm:flex-row gap-2 text-sm text-gray-300 overflow-scroll" : "grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-300"}>
        {variant === "default" && (
          <>
            <Stat label="Buy Tx" value={stats?.buyTx} type="tx" />
            <Stat
              label="Buy Volume"
              value={stats?.buyVolume}
              decimals={coinADecimals}
              imageUrl={coinA?.image}
            />
            <Stat label="Sell Tx" value={stats?.sellTx} type="tx" />
            <Stat
              label="Sell Volume"
              value={stats?.sellVolume}
              decimals={coinADecimals}
              imageUrl={coinA?.image}
            />
            <Stat
              label="Total Volume"
              value={stats?.totalVolume}
              decimals={coinADecimals}
              imageUrl={coinA?.image}
            />
            <Stat
              label="Burned Coins"
              value={stats?.burnedCoins}
              decimals={coinBDecimals}
              imageUrl={coinB?.image}
            />
            <Stat
              label="Creator Royalty"
              value={stats?.creatorRoyalty}
              decimals={coinADecimals}
              imageUrl={coinA?.image}
            />
            <Stat
              label="Rewards Distributed"
              value={stats?.rewardsDistributed}
              decimals={coinADecimals}
              imageUrl={coinA?.image}
            />
          </>
        )}
        {statsLifetime && coinSupply && (
          <Stat
            label="Circulating Supply"
            value={
              Number(coinSupply?.value) - (statsLifetime?.burnedCoins ?? 0)
            }
            decimals={coinBDecimals}
            imageUrl={coinB?.image}
            variant={variant}
          />
        )}
        {buy1SuiQuote?.buyAmount && statsLifetime && coinSupply && (
          <Stat
            label="Market Cap (SUI)"
            value={
              (1 / +buy1SuiQuote?.buyAmount) *
              (Number(coinSupply?.value) - (statsLifetime?.burnedCoins ?? 0))
            }
            decimals={coinBDecimals}
            imageUrl={coinA?.image}
            variant={variant}
          />
        )}
        {buy1SuiQuote?.buyAmount &&
          coinAPriceUSD &&
          statsLifetime &&
          coinSupply && (
            <Stat
              label="Market Cap ($USDC)"
              value={
                (1 / +buy1SuiQuote?.buyAmount) *
                coinAPriceUSD *
                (Number(coinSupply?.value) - (statsLifetime?.burnedCoins ?? 0))
              }
              decimals={coinBDecimals}
              variant={variant}
            />
          )}
      </div>
    </div>
  );
}

const Stat = ({
  label,
  value = 0,
  decimals = 2,
  type = "decimal",
  imageUrl,
  variant = "default",
}: {
  label: string;
  value?: number;
  decimals?: number;
  type?: "tx" | "decimal";
  imageUrl?: string;
  variant?: "default" | "mcap";
}) => {
  const formattedValue =
    type === "tx"
      ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : (value / Math.pow(10, decimals)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return (
    <div className={`flex ${variant === 'mcap' ? 'p-2 flex-row items-center justify-between gap-2 overflow-scroll' : 'flex-col'}`}>
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-white font-medium flex items-center gap-1">
        {formattedValue}
        {imageUrl && (
          <Avatar
            src={imageUrl}
            alt={label}
            className="w-5 h-5 aspect-square rounded-full token-icon"
          />
        )}
      </span>
    </div>
  );
};
