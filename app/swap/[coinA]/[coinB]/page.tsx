"use client";

import { usePoolSearch } from "@/app/hooks/usePoolSearch";
import { usePoolStats } from "@/app/hooks/usePoolStats";
import { PoolSearchResult } from "@/app/types";
import Chart from "@components/Chart";
// import Chart from "@components/Chart";
import ChartHolder from "@components/ChartHolder";
import Holders from "@components/Holders";
import PairStats from "@components/PairStats";
import PoolInfoV2 from "@components/PoolInfoV2";
import PoolsBar from "@components/PoolsBar";
import RecentTransactions from "@components/RecentTransactions";
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
            className="h-full min-h-[300px]"
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


    const chartProps = useMemo(
        () => ({ poolId: poolId ?? undefined, coinASymbol: coinA?.symbol }),
        [poolId, coinA?.symbol]
    );

    // 7) Efecto: cuando cambian los params, disparamos búsqueda
    useEffect(() => {
        setQuery(normalizedB);
    }, [normalizedB]);

    // 8) Efecto: auto-selección del par
    useEffect(() => {

    const handleSelectedPool = (result: PoolSearchResult) => {
        setSelectedPair(result)
        setPoolId(result.poolId)
    }
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
    }, [results, searching, searchingPending, normalizedA, normalizedB, setSelectedPair]);

    // ——— Returns condicionales después de todos los hooks ———

    if (error) {
        return (
            <div role="alert" className="p-6 text-red-500">
                Woops! Something went wrong.
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
                    <div className="flex flex-col gap-6 col-span-12 md:col-span-5 lg:col-span-4 h-full pb-10">
                        <SwapInterface
                            poolId={poolId}
                            coinA={coinA}
                            coinB={coinB}
                            poolStats={poolStats}
                        />
                    </div>
                    <div className={`w-full flex flex-col gap-6 col-span-12 md:col-span-7 lg:col-span-8 justify-center ${!poolId || poolId === null ? 'items-center' : ''}`}>
                        <Chart poolId={chartProps.poolId} coinASymbol={chartProps.coinASymbol}>
                        <PairStats
                                poolId={poolId}
                                coinA={coinA}
                                coinB={coinB}
                                poolStats={poolStats}
                                variant="mcap"
                                />
                        </Chart>
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
                            {coinA && coinB && poolId && (
                                <RecentTransactions
                                    poolId={poolId}
                                    websocketUrl={websocketUrl}
                                    coinA={coinA}
                                    coinB={coinB}
                                />
                            )}
                        </CustomTabPanel>
                        <CustomTabPanel value={value} index={3}>
                            {coinA && coinB && poolId && (
                                <Holders coinType={coinB.typeName} poolId={poolId} />
                            )}
                        </CustomTabPanel>
                    </div>

                    <div className="flex flex-col gap-6 col-span-12 mt-16" />
                </div>
            </div>
        </div>
    );
};

export default SwapParams;
