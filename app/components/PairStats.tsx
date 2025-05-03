"use client";
import { memo, useState } from "react";
import usePairStats from "../hooks/usePairStats";
import { useAtom } from "jotai";
import { selectedRangeAtom } from "@data/store";
import { PairStatsProps, rangeMap } from "../types";


export default  function PairStats({ poolId, coinA, coinB }: PairStatsProps) {
    const [selectedRange, setSelectedRange] = useAtom(selectedRangeAtom);

    const {data: stats, isLoading} = usePairStats(poolId!, rangeMap[selectedRange]);

    const coinADecimals = coinA?.decimals ?? 0;
    const coinBDecimals = coinB?.decimals ?? 0;

    return (
        <div className="w-full bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-md">
            <div className="flex justify-between items-center mb-4">
                <div className="flex">
                    <h2 className="text-lg font-semibold text-white">Pair Stats</h2>
                    {isLoading && (
                        <svg className="w-6 h-6 ml-3 -ml-1 size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                </div>
                <select
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-1 focus:outline-none"
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
