"use client";

import { usePoolSearch } from "@/app/hooks/usePoolSearch";
import { usePoolStats } from "@/app/hooks/usePoolStats";
import { PoolSearchResult } from "@/app/types";
import Chart from "@components/Chart";
import Holders from "@components/Holders";
import PairStats from "@components/PairStats";
import PoolInfoV2 from "@components/PoolInfoV2";
import PoolsBar from "@components/PoolsBar";
import RecentTransactions from "@components/RecentTransactions";
import { Spinner } from "@components/Spinner";
import SwapInterface from "@components/SwapInterface";
import { emptyPairAtom } from "@data/store";
import { Tabs, Tab, Box } from "@mui/material";
import { useAtom } from "jotai";
import { FC, useEffect, useMemo, useState } from "react";


function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}


interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

interface PageProps {
    params: {
        coinA: string;
        coinB: string;
    };
}

const SwapParams: FC<PageProps> = ({ params }) => {
    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    const websocketUrl = process.env.NEXT_PUBLIC_WS_URL!;
    const { coinA: rawA, coinB: rawB } = params;

    const normalizedA = useMemo(
        () => decodeURIComponent(rawA).toLowerCase(),
        [rawA]
    );
    const normalizedB = useMemo(
        () => decodeURIComponent(rawB).toLowerCase(),
        [rawB]
    );

    const [query, setQuery] = useState<string>("");
    const {
        data: results = [],
        isLoading: searching,
        isPending: searchingPending,
    } = usePoolSearch(query);

    const [selectedPair, setSelectedPair] = useAtom(emptyPairAtom);

    const [poolId, setPoolId] = useState<string | null>(null);
    const {
        poolStats,
        isLoading: statsLoading,
        isPending: statsPending,
        error,
    } = usePoolStats(poolId);

    const isAnyLoading =
        searching || searchingPending;

    const coinA = selectedPair?.coinA ?? null;
    const coinB = selectedPair?.coinB ?? null;

    const handleSelectedPool = (result: PoolSearchResult) => {
        setSelectedPair(result)
        setPoolId(result.poolId)
    }

    const chartProps = useMemo(
        () => ({ poolId, coinASymbol: coinA?.symbol }),
        [poolId, coinA?.symbol]
    );

    // 7) Efecto: cuando cambian los params, disparamos búsqueda
    useEffect(() => {
        setQuery(normalizedB);
    }, [normalizedB]);

    // 8) Efecto: auto-selección del par
    useEffect(() => {
        if (searching || searchingPending) return;
        if (results.length === 0) {
            console.warn("No matching pair found");
            return;
        }

        const candidate = results[0];
        const aSym = candidate.coinA.symbol.toLowerCase();
        const aType = candidate.coinA.typeName.toLowerCase();
        const bSym = candidate.coinB.symbol.toLowerCase();
        const bType = candidate.coinB.typeName.toLowerCase();

        if (
            (aSym === normalizedA || aType === normalizedA) &&
            (bSym === normalizedB || bType === normalizedB)
        ) {
            console.log({ searching, searchingPending, results, candidate })
            handleSelectedPool(candidate);
        } else {
            console.warn("First result doesn't match params", candidate);
        }
    }, [
        results,
        searching,
        searchingPending,
        normalizedA,
        normalizedB,
        handleSelectedPool,
    ]);

    // ——— Returns condicionales después de todos los hooks ———

    if (error) {
        return (
            <div role="alert" className="p-6 text-red-500">
                Woops! Something went wrong.
            </div>
        );
    }

    if (isAnyLoading) {
        return (
            <>
                <div
                    className="flex flex-col min-h-screen text-white bg-[#000306] pt-4"
                    aria-busy="true"
                >
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 mx-auto">
                        <div className="flex flex-col gap-6 lg:col-span-4">
                            <div className='relative w-full animate-pulse'>
                                <div className="w-full min-h-[460px] flex bg-gray-900 border border-gray-800 p-4 shadow-md">
                                    <h2 className="text-white text-lg font-semibold mb-2">Swap</h2>
                                    <Spinner />
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-8 w-full">
                            <div className='relative w-full animate-pulse'>
                                <div className="w-full min-h-[460px] bg-gray-900 border border-gray-800 p-4 shadow-md">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex">
                                            <h2 className="text-lg font-semibold text-white">Chart</h2>
                                            <Spinner />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full p-6 border-b border-gray-800 max-w-screen-2xl mx-auto">
                        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="w-full">
                                <div className='relative w-full max-w-lg animate-pulse'>
                                    <div className="w-full min-h-[226px] px-4 py-2 bg-gray-900 text-white border border-gray-700 flex items-center space-x-2">
                                        <div className="flex">
                                            <h2 className="text-lg font-semibold text-white">Loading pool</h2>
                                            <Spinner />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full">
                                <div className='relative w-full max-w-lg animate-pulse'>
                                    <div className="w-full min-h-[226px] px-4 py-2 bg-gray-900 text-white border border-gray-700 flex items-center space-x-2">
                                        <div className="flex">
                                            <h2 className="text-lg font-semibold text-white">Loading pool</h2>
                                            <Spinner />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full">
                                <div className='relative w-full max-w-lg animate-pulse'>
                                    <div className="w-full min-h-[226px] px-4 py-2 bg-gray-900 text-white border border-gray-700 flex items-center space-x-2">
                                        <div className="flex">
                                            <h2 className="text-lg font-semibold text-white">Loading pool</h2>
                                            <Spinner />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full">
                                <div className='relative w-full max-w-lg animate-pulse'>
                                    <div className="w-full min-h-[226px] px-4 py-2 bg-gray-900 text-white border border-gray-700 flex items-center space-x-2">
                                        <div className="flex">
                                            <h2 className="text-lg font-semibold text-white">Loading pool</h2>
                                            <Spinner />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 mx-auto">
                        <div className="flex flex-col gap-6 lg:col-span-12">
                            <div className='relative w-full animate-pulse'>
                                <div className="w-full min-h-[460px] flex bg-gray-900 border border-gray-800 p-4 shadow-md">
                                    <h2 className="text-white text-lg font-semibold mb-2">Pair Stats & Pool Info</h2>
                                    <Spinner />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </>
        );
    }

    if (!poolId) {
        return (
            <div
                className="flex items-center justify-center w-full h-[80vh]"
                aria-busy="true"
            >
                <span>No pool id...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#000306]">
            {/* <div className="w-full p-6 mx-auto max-w-screen-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b border-[#5E21A1] pb-10">
                    <div className="md:col-span-4">
                        <PoolsBar />
                    </div>
                </div>
            </div> */}
            <div className="w-full p-6 border-b border-gray-800 max-w-screen-2xl mx-auto">

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Sidebar */}
                    <div className="flex flex-col gap-6 col-span-12 md:col-span-5 lg:col-span-4 h-full">
                        <SwapInterface
                            poolId={poolId}
                            coinA={coinA}
                            coinB={coinB}
                            poolStats={poolStats}
                        />
                    </div>
                    <div className="flex flex-col gap-6 col-span-12 md:col-span-7 lg:col-span-8">
                        {!poolId || poolId === null ? (
                            <div>Please select a pool.</div>
                        ) : (
                            <>
                                <div className="shadow-md">
                                    {chartProps?.poolId && chartProps?.coinASymbol && (
                                        <Chart poolId={chartProps.poolId} coinASymbol={chartProps.coinASymbol} />
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-6 col-span-12">
                        <PoolsBar />
                    </div>
                    <div className="flex flex-col gap-6 col-span-12">
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={value} onChange={handleChange} aria-label="tabs"
                                variant="scrollable"
                                scrollButtons="auto"
                            >
                                <Tab label="PAIR STATS"  {...a11yProps(0)} />
                                <Tab label="POOL INFO"  {...a11yProps(1)} />
                                <Tab label="RECENT TXN"  {...a11yProps(2)} />
                                <Tab label="HOLDERS"  {...a11yProps(3)} />
                            </Tabs>
                        </Box>
                        <CustomTabPanel value={value} index={0}>
                            <PairStats
                                poolId={poolId}
                                coinA={coinA}
                                coinB={coinB}
                                poolStats={poolStats}
                            />
                        </CustomTabPanel>
                        <CustomTabPanel value={value} index={1}>
                            <PoolInfoV2
                                poolId={poolId}
                                coinA={coinA}
                                coinB={coinB}
                                poolStats={poolStats}
                                loading={statsLoading || statsPending}
                            />
                        </CustomTabPanel>
                        <CustomTabPanel value={value} index={2}>
                            {coinA && coinB && (
                                <RecentTransactions
                                    poolId={poolId}
                                    websocketUrl={websocketUrl}
                                    coinA={coinA}
                                    coinB={coinB}
                                />
                            )}
                        </CustomTabPanel>
                        <CustomTabPanel value={value} index={3}>
                            {coinA && coinB && (
                                <Holders coinType={coinB.typeName} poolId={poolId} />
                            )}
                        </CustomTabPanel>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SwapParams;
