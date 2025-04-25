"use client";
import { useEffect, useState } from "react";

const rangeMap: Record<string, string> = {
    "1 hour": "1h",
    "6 hour": "6h",
    "12 hour": "12h",
    "24 hour": "24h",
    "7 day": "7d",
    "30 day": "30d",
    "Lifetime": "lifetime",
};

interface Stats {
    buyTx: number;
    buyVolume: number;
    sellTx: number;
    sellVolume: number;
    totalVolume: number;
    rewardsDistributed: number;
    burnedCoins: number;
    creatorRoyalty: number;
}

interface CoinMeta {
    decimals: number;
    image?: string;
}

interface Props {
    poolId: string | null;
    coinA: CoinMeta | null;
    coinB: CoinMeta | null;
}

const defaultStats: Stats = {
    buyTx: 0,
    buyVolume: 0,
    sellTx: 0,
    sellVolume: 0,
    totalVolume: 0,
    rewardsDistributed: 0,
    burnedCoins: 0,
    creatorRoyalty: 0,
};

export default function PairStats({ poolId, coinA, coinB }: Props) {
    const [selectedRange, setSelectedRange] = useState("24 hour");
    const [stats, setStats] = useState<Stats>(defaultStats);
    const [loading, setLoading] = useState(false);

    const fetchStats = async () => {
        if (!poolId) {
            setStats(defaultStats);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/pair-stats?poolId=${poolId}&range=${rangeMap[selectedRange]}`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error("❌ Failed to load stats:", err);
            setStats(defaultStats);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [poolId, selectedRange]);

    const coinADecimals = coinA?.decimals ?? 0;
    const coinBDecimals = coinB?.decimals ?? 0;

    return (
        <div className="w-full bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Pair Stats</h2>
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

            {loading && <p className="text-gray-400 text-sm">Loading stats...</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-300">
                <Stat label="Buy Tx" value={stats.buyTx} type="tx" />
                <Stat label="Buy Volume" value={stats.buyVolume} decimals={coinADecimals} imageUrl={coinA?.image} />
                <Stat label="Sell Tx" value={stats.sellTx} type="tx" />
                <Stat label="Sell Volume" value={stats.sellVolume} decimals={coinADecimals} imageUrl={coinA?.image} />
                <Stat label="Total Volume" value={stats.totalVolume} decimals={coinADecimals} imageUrl={coinA?.image} />
                <Stat label="Rewards Distributed" value={stats.rewardsDistributed} decimals={coinADecimals} imageUrl={coinA?.image} />
                <Stat label="Burned Coins" value={stats.burnedCoins} decimals={coinBDecimals} imageUrl={coinB?.image} />
                <Stat label="Creator Royalty" value={stats.creatorRoyalty} decimals={coinADecimals} imageUrl={coinA?.image} />
            </div>
        </div>
    );
}

function Stat({
    label,
    value,
    decimals = 2,
    type = "decimal",
    imageUrl,
}: {
    label: string;
    value: number;
    decimals?: number;
    type?: "tx" | "decimal";
    imageUrl?: string;
}) {
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
                {imageUrl && (
                    <img src={imageUrl} alt="" className="w-4 h-4 rounded-full inline-block" />
                )}
            </span>
        </div>
    );
}