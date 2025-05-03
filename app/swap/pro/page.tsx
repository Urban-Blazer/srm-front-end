"use client";
import { useState } from "react";
import { usePoolStats } from "@/app/hooks/usePoolStats";
import Chart from "@components/Chart";
import PairStats from "@components/PairStats";
import PoolInfo from "@components/PoolInfo";
import RecentTransactions from "@components/RecentTransactions";
import SearchBar from "@components/SearchBar";
import SwapInterface from "@components/SwapInterface";
import Ticker from "@components/Ticker";


export default function Swap() {
    const websocketUrl = process.env.NEXT_PUBLIC_WS_URL!;

    //Dashboard variables
    const [searchPairPoolId, setSearchPairPoolId] = useState<string | null>(null);
    const [searchPairCoinA, setSearchPairCoinA] = useState<any>(null);
    const [searchPairCoinB, setSearchPairCoinB] = useState<any>(null);
    const { poolStats, isLoading: loadingPoolStats, error } = usePoolStats(searchPairPoolId);

    const handleSearchPairSelect = (result: any) => {
        console.log("🔍 Pair Selected from Search:", result);
        setSearchPairPoolId(result.poolId);
        setSearchPairCoinA(result.coinA);
        setSearchPairCoinB(result.coinB);
    };

    if(error) (<>Woops! something went wrong...</>);

    return (
        <div className="flex flex-col min-h-screen text-white bg-gray-950">

            {/* 🔁 Ticker Row */}
            <div className="w-full border-b border-gray-800">
                <Ticker />
            </div>

            {/* 🔍 Search + Pair Stats */}
            <div className="p-6 border-b border-gray-800 max-w-screen-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2">
                        <SearchBar onSelectPair={handleSearchPairSelect} />
                    </div>
                    <div className="md:col-span-2">
                        <PairStats poolId={searchPairPoolId} coinA={searchPairCoinA} coinB={searchPairCoinB} poolStats={poolStats} />
                    </div>
                </div>
            </div>

            {/* 🧩 Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-screen-2xl mx-auto">

                {/* Right Sidebar */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <div className="bg-gray-900 rounded-lg p-6 shadow-md">
                        <PoolInfo poolId={searchPairPoolId} coinA={searchPairCoinA} coinB={searchPairCoinB} poolStats={poolStats} loading={loadingPoolStats} />
                    </div>
                    <div className="bg-gray-900 rounded-lg p-6 shadow-md">
                        <SwapInterface poolId={searchPairPoolId} coinA={searchPairCoinA} coinB={searchPairCoinB} poolStats={poolStats} />
                    </div>
                </div>

                {/* Main Chart + Recent Transactions */}
                <div className="flex flex-col gap-6 lg:col-span-2">
                    {!searchPairPoolId ? (
                        <>Please select a pool.</>
                    ) : (
                        <>
                            <div className="bg-gray-900 rounded-lg p-6 shadow-md">
                                <Chart poolId={searchPairPoolId} coinASymbol={searchPairCoinA?.symbol} />
                            </div>
                            <div className="bg-gray-900 rounded-lg p-6 shadow-md">
                                <RecentTransactions poolId={searchPairPoolId} websocketUrl={websocketUrl} coinA={searchPairCoinA || { typeName: '', decimals: 9 }} coinB={searchPairCoinB || { typeName: '', decimals: 9 }} />
                            </div>
                        </>
                    )}
                </div>

            </div>

        </div>
    );
}