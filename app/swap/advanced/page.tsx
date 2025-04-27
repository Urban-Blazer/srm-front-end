// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME, CONFIG_ID } from "../../config";
import TokenSelector from "@components/TokenSelector"
import CopyIcon from "@svg/copy-icon.svg";
import TransactionModal from "@components/TransactionModal";
import Image from "next/image";
import { predefinedCoins } from "../../data/coins";

// Dashboard

import Ticker from "@components/Ticker";
import SearchBar from "@components/SearchBar";
import PairStats from "@components/PairStats";
import PoolInfo from "@components/PoolInfo";
import Chart from "@components/Chart";
import SwapInterface from "@components/SwapInterface";
import RecentTransactions from "@components/RecentTransactions";
import WalletInfo from "@components/WalletInfo";

const provider = new SuiClient({ url: GETTER_RPC });

const SUI_REWARD_BALANCE = 50 * Math.pow(10, 9);  // 50 SUI
const USDC_REWARD_BALANCE = 50 * Math.pow(10, 6); // 50 USDC
const SRM_REWARD_BALANCE = 5 * Math.pow(10, 9);  // 5 SRM

export default function Swap() {
    const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    //Dashboard variables
    const [searchPairPoolId, setSearchPairPoolId] = useState<string | null>(null);
    const [searchPairCoinA, setSearchPairCoinA] = useState<any>(null);
    const [searchPairCoinB, setSearchPairCoinB] = useState<any>(null);
    const [poolStats, setPoolStats] = useState<any>(null);
    const [loadingPoolStats, setLoadingPoolStats] = useState(false);


    // ✅ Initialize Wallet Connection
    const walletAdapterRef = useRef<NightlyConnectSuiAdapter | null>(null); 

    useEffect(() => {
        const initWallet = async () => {
            try {
                if (!walletAdapterRef.current) {
                    const adapter = await NightlyConnectSuiAdapter.build({
                        appMetadata: {
                            name: "SuiRewards.Me",
                            description: "It's time you got a piece",
                            icon: "https://your-app-logo-url.com/icon.png",
                        },
                    });

                    walletAdapterRef.current = adapter;
                    setWalletAdapter(adapter);

                    await adapter.connect();
                    const accounts = await adapter.getAccounts();

                    if (accounts.length > 0) {
                        setWalletConnected(true);
                        setWalletAddress(accounts[0].address);
                    }

                    adapter.on("connect", (account) => {
                        setWalletConnected(true);
                        setWalletAddress(account.address);
                    });

                    adapter.on("disconnect", () => {
                        setWalletConnected(false);
                        setWalletAddress(null);
                    });
                }
            } catch (error) {
                console.error("Failed to initialize Nightly Connect:", error);
            }
        };

        initWallet();

        return () => {
            walletAdapterRef.current?.off("connect");
            walletAdapterRef.current?.off("disconnect");
        };
    }, []);

    const handleSearchPairSelect = (result) => {
        console.log("🔍 Pair Selected from Search:", result);
        setSearchPairPoolId(result.poolId);
        setSearchPairCoinA(result.coinA);
        setSearchPairCoinB(result.coinB);
    };

    useEffect(() => {
        const fetchPoolStats = async () => {
            if (!searchPairPoolId) return;

            setLoadingPoolStats(true);

            try {
                const poolObject = await provider.getObject({
                    id: searchPairPoolId,
                    options: { showContent: true },
                });

                const content = poolObject?.data?.content;
                if (content && content.dataType === "moveObject" && "fields" in content) {
                    const fields = content.fields;

                    if (fields) {
                        setPoolStats({
                            balance_a: fields.balance_a || 0,
                            balance_b: fields.balance_b || 0,
                            burn_fee: fields.burn_fee || 0,
                            creator_royalty_fee: fields.creator_royalty_fee || 0,
                            creator_royalty_wallet: fields.creator_royalty_wallet || "",
                            locked_lp_balance: fields.locked_lp_balance || 0,
                            lp_builder_fee: fields.lp_builder_fee || 0,
                            reward_balance_a: fields.reward_balance_a || 0,
                            rewards_fee: fields.rewards_fee || 0,
                        });
                    } else {
                        console.warn("⚠️ Missing fields in pool object:", poolObject);
                        setPoolStats(null);
                    }
                }
            } catch (error) {
                console.error("❌ Error fetching pool stats:", error);
                setPoolStats(null);
            } finally {
                setLoadingPoolStats(false);
            }
        };

        fetchPoolStats();
    }, [searchPairPoolId]);


    return (
        <div className="flex flex-col min-h-screen text-white bg-gray-950">

            {/* 🔁 Ticker Row */}
            <div className="w-full border-b border-gray-800">
                <Ticker />
            </div>

            {/* 🔍 Search + Pair Stats */}
            <div className="p-6 border-b border-gray-800 max-w-screen-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <SearchBar onSelectPair={handleSearchPairSelect} />
                    </div>
                    <div className="md:col-span-2">
                        <PairStats poolId={searchPairPoolId} coinA={searchPairCoinA} coinB={searchPairCoinB} />
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
                        <SwapInterface poolId={searchPairPoolId} coinA={searchPairCoinA} coinB={searchPairCoinB} provider={provider} walletAddress={walletAddress} poolStats={poolStats} walletAdapter={walletAdapter} />
                    </div>
                </div>

                {/* Main Chart + Recent Transactions */}
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <div className="bg-gray-900 rounded-lg p-6 shadow-md">
                        <Chart poolId={searchPairPoolId} coinASymbol={searchPairCoinA?.symbol} />
                    </div>
                    <div className="bg-gray-900 rounded-lg p-6 shadow-md">
                        <RecentTransactions poolId={searchPairPoolId} websocketUrl={process.env.NEXT_PUBLIC_WS_URL!} coinA={searchPairCoinA || { typeName: '', decimals: 9 }} coinB={searchPairCoinB || { typeName: '', decimals: 9 }} />
                    </div>
                </div>

            </div>

        </div>
    );
}