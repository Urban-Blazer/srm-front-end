"use client";

import { usePoolSearch } from "@/app/hooks/usePoolSearch";
import { usePoolStats } from "@/app/hooks/usePoolStats";
import { PoolSearchResult } from "@/app/types";
import Chart from "@components/Chart";
import Holders from "@components/Holders";
import PairStats from "@components/PairStats";
import PoolInfoV2 from "@components/PoolInfoV2";
import PoolsBar, { Socials } from "@components/PoolsBar";
import RecentTransactions from "@components/RecentTransactions";
import SearchBar from "@components/SearchBar";
import SwapInterface from "@components/SwapInterface";
import { emptyPairAtom } from "@data/store";
import { Tabs, Tab, Box } from "@mui/material";
import { useAtom } from "jotai";
import Link from "next/link";
import { FC, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Avatar from "@components/Avatar";
import { usePredefinedCoins } from "@/app/hooks/usePredefinedCoins";

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
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
      {value === index && <>{children}</>}
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
  const { coins: predefinedCoins } = usePredefinedCoins();
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
  const coin = selectedPair && predefinedCoins.find((coin) => coin.typeName === selectedPair.coinB.typeName);

  const [poolId, setPoolId] = useState<string | null>(null);
  const {
    poolStats,
    isLoading: statsLoading,
    isPending: statsPending,
    error,
  } = usePoolStats(poolId);

  const isAnyLoading = searching || searchingPending;

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
      setSelectedPair(result);
      setPoolId(result.poolId);
    };
    if (searching || searchingPending) return;
    if (results.length === 0) {
      console.warn("No matching pair found");
      return;
    }

    const candidate = results.find((result) => {
      const aSym = result.coinA.symbol.toLowerCase();
      const aType = result.coinA.typeName.toLowerCase();
      const bSym = result.coinB.symbol.toLowerCase();
      const bType = result.coinB.typeName.toLowerCase();
      return (
        (aSym === normalizedA || aType === normalizedA) &&
        (bSym === normalizedB || bType === normalizedB)
      );
    });
    if (!candidate) {
      console.warn("No matching pair found");
      return;
    }
    const aSym = candidate.coinA.symbol.toLowerCase();
    const aType = candidate.coinA.typeName.toLowerCase();
    const bSym = candidate.coinB.symbol.toLowerCase();
    const bType = candidate.coinB.typeName.toLowerCase();

    if (
      (aSym === normalizedA || aType === normalizedA) &&
      (bSym === normalizedB || bType === normalizedB)
    ) {
      console.log({ searching, searchingPending, results, candidate });
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
    setSelectedPair,
  ]);

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
          <div className="flex flex-col gap-6 col-span-12 md:col-span-5 lg:col-span-4 h-full pb-10">
            <SearchBar />
          </div>
          <div className="flex flex-col gap-6 col-span-12 md:col-span-6 h-full pb-10">
            {coinB?.image ? (
          <div
            className="relative w-full max-w-[300px] sm:max-w-full flex items-center justify-center sm:justify-start"
          >
            <Avatar
              src={coinB?.image}
              alt={coinB?.symbol}
              className="lg:w-9 lg:h-9 w-9 h-9 aspect-square rounded-full token-icon"
            />
            <span className="ml-2 text-white text-lg font-bold mr-6">{coinB?.name}</span>

            {/* socials links icons: web, telegram, twitter, discord */}
            {coin && <Socials coin={coin} />}
          </div>
        ) : (
          <div className="w-[36px] h-[36px] rounded-full animate-pulse bg-gray-900 border border-gray-800 shadow-md p-4" />
        )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="flex flex-col col-span-12 md:col-span-5 lg:col-span-4 h-full pb-10">
            <SwapInterface
              poolId={poolId}
              coinA={coinA}
              coinB={coinB}
              poolStats={poolStats}
            />
          </div>
          <div
            className={`w-full h-full min-h-[600px] md:min-h-[500px] flex flex-col col-span-12 md:col-span-7 lg:col-span-8 ${
              !poolId || poolId === null ? "items-center" : ""
            }`}
          >
            <Chart
              poolId={chartProps.poolId}
              coinASymbol={chartProps.coinASymbol}
              coinA={coinA ?? undefined}
              coinB={coinB ?? undefined}
            >
              <PairStats
                poolId={poolId}
                coinA={coinA!}
                coinB={coinB}
                poolStats={poolStats}
                variant="mcap"
              />
            </Chart>
          </div>
          <div className="flex flex-col mb-6 col-span-12">
            <PoolsBar featuredCoinBSymbol={"TKI"} />
          </div>
          <div className="flex flex-col col-span-12 text-white">
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="PAIR STATS" {...a11yProps(0)} />
                <Tab label="POOL INFO" {...a11yProps(1)} />
                <Tab label="RECENT TXN" {...a11yProps(2)} />
                <Tab label="HOLDERS" {...a11yProps(3)} />
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
