"use client";
import { selectedRangeAtom } from "@data/store";
import { useAtom } from "jotai";
import usePairStats from "../hooks/usePairStats";
import { PairStatsProps, rangeMap } from "../types";
import { SRM_COIN_SUPPLY, SRM_COINTYPE } from "../config";
import useQuote from "../hooks/useQuote";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import useCoinPrice from "../hooks/useCoinPrice";
import { Spinner } from "./Spinner";

export default  function PairStats({ poolId, coinA, coinB, poolStats }: PairStatsProps) {
    const [selectedRange, setSelectedRange] = useAtom(selectedRangeAtom);
    const { data: buy100SuiQuote } = useQuote(new URLSearchParams({
        poolId: poolId!,
        amount: (100 * Number(MIST_PER_SUI)).toString(),
        isSell: 'true',
        isAtoB: 'true',
        outputDecimals: coinB?.decimals.toString() ?? "9",
        balanceA: poolStats?.balance_a.toString(),
        balanceB: poolStats?.balance_b.toString(),
        lpBuilderFee: poolStats?.lp_builder_fee.toString(),
        burnFee: poolStats?.burn_fee.toString(),
        creatorRoyaltyFee: poolStats?.creator_royalty_fee.toString(),
        rewardsFee: poolStats?.rewards_fee.toString(),
    }));

    
    const {pairStats: stats, isLoading} = usePairStats(poolId!, rangeMap[selectedRange]);
    const {pairStats: statsLifetime, isLoading: isStatsLifetimeLoading} = usePairStats(poolId!, "lifetime");
    
    const { data: coinAPriceUSD } = useCoinPrice("SUI");
    console.log({statsLifetime, buy100SuiQuote, coinAPriceUSD})

    const coinADecimals = coinA?.decimals ?? 0;
    const coinBDecimals = coinB?.decimals ?? 0;

    return (
        <div className="w-full border border-gray-800 p-4 shadow-md">
            <div className="flex justify-between items-center mb-4">
                <div className="flex">
                    {(isLoading || isStatsLifetimeLoading) && (
                        <Spinner/>
                    )}
                </div>
                <select
                    className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-1 focus:outline-none"
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-300">
                    <Stat label="Buy Tx" value={stats?.buyTx} type="tx" />
                    <Stat label="Buy Volume" value={stats?.buyVolume} decimals={coinADecimals} imageUrl={coinA?.image} />
                    <Stat label="Sell Tx" value={stats?.sellTx} type="tx" />
                    <Stat label="Sell Volume" value={stats?.sellVolume} decimals={coinADecimals} imageUrl={coinA?.image} />
                    <Stat label="Total Volume" value={stats?.totalVolume} decimals={coinADecimals} imageUrl={coinA?.image} />
                    <Stat label="Burned Coins" value={stats?.burnedCoins} decimals={coinBDecimals} imageUrl={coinB?.image} />
                    <Stat label="Creator Royalty" value={stats?.creatorRoyalty} decimals={coinADecimals} imageUrl={coinA?.image} />
                    <Stat label="Rewards Distributed" value={stats?.rewardsDistributed} decimals={coinADecimals} imageUrl={coinA?.image} />
                    {coinB?.typeName === SRM_COINTYPE && statsLifetime && (
                        <Stat label="Circulating Supply" value={SRM_COIN_SUPPLY - (statsLifetime?.burnedCoins ?? 0)} decimals={coinBDecimals} imageUrl={coinB?.image} />
                    )}
                    {
                        coinB?.typeName === SRM_COINTYPE && 
                        buy100SuiQuote?.buyAmount && 
                        statsLifetime && (
                            <Stat label="Market Cap (SUI)" value={(100 / +buy100SuiQuote?.buyAmount) * (SRM_COIN_SUPPLY - (statsLifetime?.burnedCoins ?? 0))} decimals={coinBDecimals} imageUrl={coinA?.image} />
                    )}
                    {
                        coinB?.typeName === SRM_COINTYPE && 
                        buy100SuiQuote?.buyAmount && 
                        coinAPriceUSD && statsLifetime && (
                            <Stat label="Market Cap ($USDC)" value={((100 / +buy100SuiQuote?.buyAmount)* coinAPriceUSD) * (SRM_COIN_SUPPLY - (statsLifetime?.burnedCoins ?? 0))} decimals={coinBDecimals} />
                    )}
                </div>
            

        </div>
    );
};

const Stat = ({
    label,
    value = 0,
    decimals = 2,
    type = "decimal",
    imageUrl,
}: {
    label: string;
    value?: number;
    decimals?: number;
    type?: "tx" | "decimal";
    imageUrl?: string;
}) => {
    const formattedValue =
        type === "tx"
            ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
            : (value / Math.pow(10, decimals)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

    return (
        <div className="flex flex-col">
            <span className="text-gray-400 text-xs">{label}</span>
            <span className="text-white font-medium flex items-center gap-1">
                {formattedValue}
                {imageUrl && <img src={imageUrl} alt="" className="w-4 h-4 rounded-full inline-block" />}
            </span>
        </div>
    );
}
