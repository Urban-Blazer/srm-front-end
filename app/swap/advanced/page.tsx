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
    const [sellToken, setSellToken] = useState(null);
    const [buyToken, setBuyToken] = useState(null);
    const [sellAmount, setSellAmount] = useState("");
    const [buyAmount, setBuyAmount] = useState("");
    const [sellBalance, setSellBalance] = useState(0);
    const [buyBalance, setBuyBalance] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState<"sell" | "buy" | null>(null);
    const [maxSlippage, setMaxSlippage] = useState("1.0"); // Default slippage at 1.0%
    const [isAtoB, setIsAtoB] = useState<boolean | null>(null); // Track if swapping A -> B or B -> A
    const [fetchingQuote, setFetchingQuote] = useState(false); // Track loading state for quote
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false); // Track processing state
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [coinAPrice, setCoinAPrice] = useState<number | null>(null);
    const [coinBPrice, setCoinBPrice] = useState<number | null>(null);

    //Dashboard variables
    const [searchPairPoolId, setSearchPairPoolId] = useState<string | null>(null);
    const [searchPairCoinA, setSearchPairCoinA] = useState<any>(null);
    const [searchPairCoinB, setSearchPairCoinB] = useState<any>(null);

    // ✅ Debounce Timer Ref
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
    };

    // ✅ Initialize Wallet Connection
    const walletAdapterRef = useRef<NightlyConnectSuiAdapter | null>(null);

    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Store Pool Information
    const [poolId, setPoolId] = useState<string | null>(null);
    const [poolLoading, setPoolLoading] = useState(false);
    const [poolData, setPoolData] = useState<any>(null);
    const [poolMetadata, setPoolMetadata] = useState<any>(null);
    const [poolStats, setPoolStats] = useState<any>(null);

    useEffect(() => {
        console.log("✅ UI Updated - New Buy Amount:", buyAmount);
    }, [buyAmount]);

    useEffect(() => {
        console.log("✅ UI Updated - New Sell Amount:", sellAmount);
    }, [sellAmount]);

    useEffect(() => {
        if (isProcessing) {
            setIsModalOpen(true); // ✅ Ensures modal opens when processing starts
        }
    }, [isProcessing]); // ✅ Reacts when `isProcessing` changes

    // ✅ Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchPairSelect = (result) => {
        console.log("🔍 Pair Selected from Search:", result);
        setSearchPairPoolId(result.poolId);
        setSearchPairCoinA(result.coinA);
        setSearchPairCoinB(result.coinB);
    };

    const handlePercentageClick = (percentage: number) => {
        if (!sellToken || sellBalance <= 0) return;

        const decimals = sellToken.decimals ?? 9;

        // Step 1: Convert atomic balance to human-readable value
        const balanceReadable = Number(sellBalance) / Math.pow(10, decimals);

        // Step 2: Calculate the percentage
        const amount = balanceReadable * (percentage / 100);

        // Step 3: Format the value
        const formattedAmount = (Math.floor(amount * 1e4) / 1e4).toFixed(4);

        // Step 4: Set and fetch quote
        setSellAmount(formattedAmount);

        if (poolId && isAtoB !== null && poolStats && sellToken && buyToken) {
            debouncedGetQuote(formattedAmount, true);
        }
    };

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

    // ✅ Fetch Pool Metadata when CoinA and CoinB selected
    useEffect(() => {
        if (sellToken && buyToken) {
            fetchPoolMetadata(sellToken, buyToken);
        }
    }, [sellToken, buyToken]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    // ✅ Fetch Pool Metadata
    const fetchPoolMetadata = async (sellToken, buyToken) => {
        if (!sellToken || !buyToken) return;

        setPoolLoading(true);
        setPoolId(null);
        setPoolMetadata(null);
        setPoolStats(null);
        setIsAtoB(null);

        const tokenPairKey = `${sellToken.typeName}-${buyToken.typeName}`;

        try {
            const response = await fetch(`/api/get-pool-id?tokenPair=${encodeURIComponent(tokenPairKey)}`);
            const data = await response.json();

            console.log("🌐 Raw Pool Metadata Response:", data);

            if (data?.poolId) {
                console.log("✅ Pool ID found:", data.poolId);
                setPoolId(data.poolId);

                // 🚨 Check if metadata exists before setting state
                if (!data.coinA_metadata || !data.coinB_metadata) {
                    console.warn("🚨 Pool metadata missing from API response!");
                    return;
                }

                const metadata = {
                    coinA: data.coinA_metadata,
                    coinB: data.coinB_metadata,
                };

                console.log("✅ Setting Pool Metadata:", metadata);
                setPoolMetadata(metadata);

                // 🚀 Ensure `poolMetadata` is fully set before checking `isAtoB`
                setTimeout(() => {
                    console.log("💡 Checking `isAtoB` condition after metadata fetch:");
                    console.log("  - SellToken TypeName:", sellToken.typeName);
                    console.log("  - Metadata CoinA TypeName:", metadata.coinA?.typeName);
                    console.log("  - Metadata CoinB TypeName:", metadata.coinB?.typeName);

                    // ✅ Now we can safely determine `isAtoB`
                    const newIsAtoB = sellToken.typeName === metadata.coinA?.typeName;
                    setIsAtoB(newIsAtoB);

                    console.log("🔄 Updated isAtoB:", newIsAtoB);
                }, 200); // Delay ensures metadata is set
            } else {
                console.log("⚠️ Pool does not exist for:", tokenPairKey);
                setPoolId(null);
                setPoolMetadata(null);
                setIsAtoB(null);
            }
        } catch (error) {
            console.error("❌ Error fetching pool metadata:", error);
            setPoolId(null);
            setPoolMetadata(null);
            setIsAtoB(null);
        }

        setPoolLoading(false);
    };


    // ✅ Fetch Pool Stats when Pool ID updates
    useEffect(() => {
        if (poolId) {
            fetchPoolStats(poolId);
        }
    }, [poolId]);

    // ✅ Fetch Pool Stats
    const fetchPoolStats = async (poolObjectId) => {
        if (!poolObjectId) return;

        setPoolStats(null);
        console.log("Fetching Pool Stats with ID:", poolObjectId);

        try {
            const poolObject = await provider.getObject({
                id: poolObjectId,
                options: { showContent: true },
            });

            console.log("Pool Object Response:", poolObject);

            if (poolObject?.data?.content?.fields) {
                const fields = poolObject.data.content.fields;

                // ✅ Ensure values are always defined
                setPoolStats({
                    balance_a: fields.balance_a || 0,
                    balance_b: fields.balance_b || 0,
                    burn_balance_b: fields.burn_balance_b || 0,
                    burn_fee: fields.burn_fee || 0,
                    creator_royalty_fee: fields.creator_royalty_fee || 0,
                    creator_royalty_wallet: fields.creator_royalty_wallet || "",
                    locked_lp_balance: fields.locked_lp_balance || 0,
                    lp_builder_fee: fields.lp_builder_fee || 0,
                    reward_balance_a: fields.reward_balance_a || 0,
                    rewards_fee: fields.rewards_fee || 0,
                });
            } else {
                console.warn("Missing pool fields:", poolObject);
                setPoolStats({
                    balance_a: 0, balance_b: 0, burn_balance_b: 0, burn_fee: 0,
                    creator_royalty_fee: 0, creator_royalty_wallet: "", locked_lp_balance: 0,
                    lp_builder_fee: 0, reward_balance_a: 0, rewards_fee: 0
                });
            }
        } catch (error) {
            console.error("Error fetching pool stats:", error);
            setPoolStats({
                balance_a: 0, balance_b: 0, burn_balance_b: 0, burn_fee: 0,
                creator_royalty_fee: 0, creator_royalty_wallet: "", locked_lp_balance: 0,
                lp_builder_fee: 0, reward_balance_a: 0, rewards_fee: 0
            });
        }
    };

    const fetchCoinAPrice = async (symbol: "SUIUSD" | "USDCUSD") => {
        try {
            const response = await fetch(`/api/get-coina-price?symbol=${symbol}`);
            const data = await response.json();
            return data?.price ?? null;
        } catch (error) {
            console.error("Error fetching Coin A price:", error);
            return null;
        }
    };

    // ✅ Fetch Token Balances when a Token is Selected
    const fetchBalance = async (token, setBalance) => {
        if (!walletAddress || !token) return;

        try {
            console.log(`Fetching balance for ${token.symbol}...`);
            const { totalBalance } = await provider.getBalance({
                owner: walletAddress,
                coinType: token.typeName,
            });

            setBalance(Number(totalBalance));
        } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            setBalance(0);
        }
    };

    // ✅ Fetch balances whenever `sellToken` or `buyToken` changes
    useEffect(() => {
        if (sellToken && !fetchingQuote) fetchBalance(sellToken, setSellBalance);
        // ts-ignore
    }, [sellToken, walletAddress, fetchingQuote]);

    useEffect(() => {
        if (buyToken && !fetchingQuote) fetchBalance(buyToken, setBuyBalance);
    }, [buyToken, walletAddress, fetchingQuote]);

    useEffect(() => {
        const fetchPrice = async () => {
            if (!poolMetadata?.coinA?.typeName || !predefinedCoins.length) return;

            const suiTypeName = predefinedCoins.find(c => c.symbol === "SUI")?.typeName;
            const usdcTypeName = predefinedCoins.find(c => c.symbol === "USDC")?.typeName;

            if (poolMetadata.coinA.typeName === suiTypeName) {
                const price = await fetchCoinAPrice("SUIUSD");
                setCoinAPrice(price);
            } else if (poolMetadata.coinA.typeName === usdcTypeName) {
                const price = await fetchCoinAPrice("USDCUSD");
                setCoinAPrice(price);
            } else {
                setCoinAPrice(null);
            }
        };

        if (poolMetadata && poolStats) {
            fetchPrice();
        }
    }, [poolMetadata, poolStats]);

    useEffect(() => {
        if (!coinAPrice || !poolStats || !poolMetadata) return;

        const balanceA = Number(poolStats.balance_a);
        const balanceB = Number(poolStats.balance_b);
        const coinADecimals = Number(poolMetadata.coinA.decimals || 0);
        const coinBDecimals = Number(poolMetadata.coinB.decimals || 0);

        if (balanceA === 0 || balanceB === 0) {
            setCoinBPrice(null);
            return;
        }

        const normalizedA = balanceA / Math.pow(10, coinADecimals);
        const normalizedB = balanceB / Math.pow(10, coinBDecimals);

        const priceB = (coinAPrice * normalizedA) / normalizedB;
        setCoinBPrice(priceB);
    }, [coinAPrice, poolStats, poolMetadata]);

    // ✅ Handle Token Selection
    const handleSelectToken = async (token, type) => {
        let newSellToken = sellToken;
        let newBuyToken = buyToken;

        if (type === "sell") {
            if (buyToken && buyToken.symbol === token.symbol) {
                newBuyToken = null;
                setBuyToken(null);
                setBuyBalance(0);
            }
            newSellToken = token;
            setSellToken(token);
        } else {
            if (sellToken && sellToken.symbol === token.symbol) {
                newSellToken = null;
                setSellToken(null);
                setSellBalance(0);
            }
            newBuyToken = token;
            setBuyToken(token);
        }

        if (newSellToken && newBuyToken) {
            await fetchPoolMetadata(newSellToken, newBuyToken);
        }

        // ✅ Reset input fields to zero
        setSellAmount("");
        setBuyAmount("");

        setDropdownOpen(null);
    };

    // ✅ Handle Sell Amount Change with Debounce
    const handleSellAmountChange = (e) => {
        const amount = e.target.value;
        setSellAmount(amount);

        if (!poolId || isAtoB === null || !sellToken || !buyToken || !poolStats || isNaN(Number(amount)) || Number(amount) <= 0) {
            return;
        }

        // ✅ Ensure poolStats contains balances
        if (!poolStats.balance_a || !poolStats.balance_b) {
            console.warn("Skipping quote fetch due to missing pool balances");
            return;
        }

        debouncedGetQuote(amount, true);
    };

    // ✅ Handle Buy Amount Change with Debounce
    const handleBuyAmountChange = (e) => {
        const amount = e.target.value;
        setBuyAmount(amount);

        if (!poolId || isAtoB === null || !amount || !sellToken || !buyToken || !poolStats) return;

        // ✅ Ensure poolStats contains balances
        if (!poolStats.balance_a || !poolStats.balance_b) {
            console.warn("Skipping quote fetch due to missing pool balances");
            return;
        }

        // ✅ Prevent sending zero or negative values
        if (Number(amount) <= 0) {
            setSellAmount(""); // Reset sellAmount if input is invalid
            return;
        }

        console.log("🔍 Reverse Swap Debug:");
        console.log("  - Buy Amount:", amount);
        console.log("  - isAtoB:", isAtoB);
        console.log("  - Pool ID:", poolId);
        console.log("  - Balance A:", poolStats.balance_a);
        console.log("  - Balance B:", poolStats.balance_b);

        // ✅ Explicitly pass `isSell = false` for reverse quote
        debouncedGetQuote(amount, false);
    };

    // ✅ Debounce function: Fetch quote and format number correctly
    const debouncedGetQuote = useCallback(async (amount: string, isSell: boolean) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            if (!poolId || isAtoB === null || !amount || !sellToken || !buyToken || !poolStats) return;

            if (Number(amount) <= 0) {
                return;
            }

            setFetchingQuote(true);
            try {
                const response = await getSwapQuote(poolId, amount, isSell, isAtoB, poolStats);

                if (response) {
                    console.log("✅ Updated Swap Quote:", response);

                    if (isSell) {
                        setBuyAmount(response.buyAmount);
                        console.log("✅ Updated Buy Amount:", response.buyAmount);
                    } else {
                        setSellAmount(response.sellAmount);
                        console.log("✅ Updated Sell Amount:", response.sellAmount);
                    }

                }
            } catch (error) {
                console.error("Error fetching quote:", error);
            } finally {
                setFetchingQuote(false);
            }
        }, 300);
    }, [poolId, isAtoB, sellToken, buyToken, poolStats]);

    const getSwapQuote = async (
        poolId: string,
        amount: string,
        isSell: boolean,
        isAtoB: boolean,
        poolStats: any
    ) => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return null;

        setFetchingQuote(true);

        try {

            console.log("🛑 Before Conversion - amount:", amount);

            const relevantToken = isSell ? sellToken : buyToken;
            const amountU64 = Number(amount) > 0
                ? Math.floor(Number(amount) * Math.pow(10, relevantToken.decimals))
                : 0;

            console.log("🛑 After Conversion - amount:", amountU64);

            // ✅ Construct query to match `quote.move` argument order
            const queryParams = new URLSearchParams({
                poolId,
                amount: amountU64.toString(),
                isSell: isSell.toString(),
                isAtoB: isAtoB.toString(),
                balanceA: poolStats.balance_a?.toString() || "0",
                balanceB: poolStats.balance_b?.toString() || "0",
                swapFee: poolStats.swap_fee?.toString() || "0",
                lpBuilderFee: poolStats.lp_builder_fee?.toString() || "0",
                burnFee: poolStats.burn_fee?.toString() || "0",
                creatorRoyaltyFee: poolStats.creator_royalty_fee?.toString() || "0",
                rewardsFee: poolStats.rewards_fee?.toString() || "0",

                // 🆕 Send output token decimals to the API
                outputDecimals: (isSell ? buyToken.decimals : sellToken.decimals).toString(),
            });

            // ✅ Fetch Quote API
            const response = await fetch(`/api/get-quote?${queryParams}`);
            const data = await response.json();

            if (data?.buyAmount || data?.sellAmount) {
                console.log("🔄 Swap Quote Received:", data);
                return isSell
                    ? { buyAmount: data.buyAmount }  // ✅ Extract correctly
                    : { sellAmount: data.sellAmount }; // ✅ Extract correctly
            } else {
                console.log("No valid swap quote received.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching swap quote:", error);
            return null;
        } finally {
            setFetchingQuote(false);
        }
    };

    // ✅ Swap Tokens Function
    const handleSwapTokens = async () => {
        if (sellToken && buyToken) {
            const newSellToken = buyToken;
            const newBuyToken = sellToken;

            setSellToken(newSellToken);
            setBuyToken(newBuyToken);

            // Swap balances
            setSellBalance(buyBalance);
            setBuyBalance(sellBalance);

            // Reset Swap Amounts
            setSellAmount("");
            setBuyAmount("");

            console.log("🔄 Swapping Tokens...");
            console.log("  - New SellToken:", newSellToken.typeName);
            console.log("  - New BuyToken:", newBuyToken.typeName);

            // ✅ Fetch new metadata **before** updating `isAtoB`
            await fetchPoolMetadata(newSellToken, newBuyToken);

            // ✅ Ensure we update `isAtoB` only if metadata is valid
            setTimeout(() => {
                if (!poolMetadata || !poolMetadata.coinA || !poolMetadata.coinB) {
                    console.warn("🚨 Pool metadata missing, cannot update isAtoB!");
                    return;
                }

                const updatedIsAtoB = newSellToken?.typeName === poolMetadata?.coinA?.typeName;
                setIsAtoB(updatedIsAtoB);

                console.log("🔄 Corrected isAtoB After Swap:", updatedIsAtoB);
            }, 300); // Delay ensures metadata is fetched
        }
    };

    const handleSwap = async (attempt = 1) => {
        setLogs([]); // Clear previous logs
        setIsProcessing(true); // 🔥 Set processing state
        setIsModalOpen(true); // Open modal

        await new Promise(resolve => setTimeout(resolve, 50)); // ✅ Small delay to force re-render
        addLog(`⚡ Initiating Swap... (Attempt ${attempt})`);
        console.log(`⚡ Initiating Swap... (Attempt ${attempt})`);

        if (!walletAdapter || !walletConnected || !sellToken || !buyToken || !sellAmount || !poolId || isAtoB === null || !poolMetadata) {
            alert("🚨 Swap execution failed: Missing required parameters.");
            return;
        }

        try {
            const userAddress = walletAddress!;
            addLog(`👛 Using wallet address: ${userAddress}`);

            // ✅ Fetch correct type arguments from poolMetadata
            const typeArguments = [poolMetadata.coinA.typeName, poolMetadata.coinB.typeName];

            // ✅ Use correct decimals for sell and buy tokens
            const sellDecimals =
                poolMetadata.coinA.typeName === sellToken.typeName
                    ? poolMetadata.coinA.decimals
                    : poolMetadata.coinB.decimals;

            const buyDecimals =
                poolMetadata.coinA.typeName === buyToken.typeName
                    ? poolMetadata.coinA.decimals
                    : poolMetadata.coinB.decimals;

            const sellAmountU64 = BigInt(Math.floor(Number(sellAmount) * Math.pow(10, sellDecimals)));
            const expectedOutU64 = BigInt(Math.floor(Number(buyAmount) * Math.pow(10, buyDecimals)));

            const maxSlippageInt = BigInt(Math.floor(Number(maxSlippage) * 100)); // e.g. 1.0 => 100 bps
            const minOutU64 = expectedOutU64 - (expectedOutU64 * maxSlippageInt / BigInt(10000));

            if (minOutU64 <= 0n) {
                alert("🚨 Slippage is too high. Adjust your settings.");
                return;
            }

            // 🔍 Fetch owned coin objects (matching the sell token)
            const { data: ownedObjects } = await provider.getOwnedObjects({
                owner: userAddress,
                filter: { StructType: "0x2::coin::Coin" },
                options: { showType: true, showContent: true },
            });

            addLog("🔍 Owned objects fetched.");
            console.log("🔍 Owned objects:", ownedObjects);

            // ✅ Extract coin data & filter based on type
            const coins = ownedObjects
                .map((obj) => {
                    const rawType = obj.data?.type;
                    if (!rawType || !rawType.startsWith("0x2::coin::Coin<")) return null;

                    return {
                        objectId: obj.data?.objectId,
                        type: rawType.replace("0x2::coin::Coin<", "").replace(">", "").trim(),
                        balance: obj.data?.content?.fields?.balance
                            ? BigInt(obj.data?.content?.fields?.balance)
                            : BigInt(0),
                        digest: obj.data?.digest,
                        version: obj.data?.version,
                    };
                })
                .filter(Boolean); // Remove null values

            console.log("🔍 Extracted Coins with Balance:", coins);

            // ✅ Find a coin of the correct type with enough balance
            const matchingCoin = coins.find(
                (c) => c.type === sellToken.typeName && c.balance >= sellAmountU64
            );

            if (!matchingCoin) {
                alert("⚠️ No single coin object has enough balance to cover the sell amount.");
                console.error("❌ No sufficient Coin Object found:", { sellAmountU64, coins });
                return;
            }

            addLog(`✅ Using Coin ID: ${matchingCoin.objectId}`);
            console.log(`✅ Using Coin ID: ${matchingCoin.objectId}, Balance: ${matchingCoin.balance.toString()}`);

            // ✅ Validate reward balance before deciding to update isActive
            const rewardBalance = Number(poolStats?.reward_balance_a ?? 0);

            // ✅ Retrieve trusted typeNames for SUI and USDC from predefinedCoins
            const suiTypeName = predefinedCoins.find((coin) => coin.symbol === "SUI")?.typeName;
            const usdcTypeName = predefinedCoins.find((coin) => coin.symbol === "USDC")?.typeName;
            const srmTypeName = predefinedCoins.find((coin) => coin.symbol === "MOCKSUI")?.typeName;
            const poolCoinATypeName = poolMetadata?.coinA?.typeName;

            let shouldUpdateIsActive = false;

            // ✅ Check `sellToken.typeName` against predefined SUI/USDC typeNames
            if (poolCoinATypeName === suiTypeName && rewardBalance >= SUI_REWARD_BALANCE) {
                shouldUpdateIsActive = true;
            } else if (poolCoinATypeName === usdcTypeName && rewardBalance >= USDC_REWARD_BALANCE) {
                shouldUpdateIsActive = true;
            } else if (poolCoinATypeName === srmTypeName && rewardBalance >= SRM_REWARD_BALANCE) {
                shouldUpdateIsActive = true;
            }

            console.log(`🔍 Checking isActive condition:
                - Pool CoinA Type: ${poolCoinATypeName}
                - SUI Type: ${suiTypeName}
                - USDC Type: ${usdcTypeName}
                - SRM Type: ${srmTypeName}
                - Reward Balance: ${rewardBalance}
                - shouldUpdateIsActive: ${shouldUpdateIsActive}`);

            const suiType = "0x2::sui::SUI";
            const isSellingSui = sellToken.typeName === suiType;
            const onlyOneSui = coins.filter((c) => c.type === suiType).length === 1;
            const singleSuiCoin = coins.find((c) => c.type === suiType);

            // ✅ Build Transaction Block
            const txb = new TransactionBlock();

            let usedCoin;

            if (isSellingSui && onlyOneSui) {
                if (singleSuiCoin.balance > sellAmountU64 + BigInt(250_000_000)) {
                    txb.setGasPayment([
                        {
                            objectId: singleSuiCoin.objectId,
                            digest: singleSuiCoin.digest,
                            version: singleSuiCoin.version,
                        },
                    ]);
                    txb.setGasOwner(userAddress);

                    const [splitSui] = txb.splitCoins(txb.gas, [txb.pure(sellAmountU64)]);
                    usedCoin = splitSui;

                    addLog("⚡️ Using txb.gas to split sell amount (SUI sell).");
                } else {
                    alert("⚠️ Not enough SUI to cover gas + sell amount.");
                    setIsProcessing(false);
                    return;
                }
            } else {
                const coinObject = txb.object(matchingCoin.objectId);
                const [splitCoin] = txb.splitCoins(coinObject, [txb.pure.u64(sellAmountU64)]);
                usedCoin = splitCoin;
            }

            txb.setGasBudget(250_000_000);

            // 📌 Determine the correct swap function
            const swapFunction = isAtoB
                ? `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_a_for_b_with_coins_and_transfer_to_sender`
                : `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_b_for_a_with_coins_and_transfer_to_sender`;

            // 🚀 Construct the transaction block
            txb.moveCall({
                target: swapFunction,
                typeArguments,
                arguments: [
                    txb.object(poolId, { mutable: true }),
                    txb.object(CONFIG_ID),
                    usedCoin, // ✅ Pass the split coin (not the full object)
                    txb.pure.u64(sellAmountU64),
                    txb.pure.u64(minOutU64),
                    txb.object("0x6"), // Clock object
                ],
            });

            // ✅ Sign Transaction
            addLog("✍️ Signing transaction...");
            console.log("✍️ Signing transaction...");
            const signedTx = await walletAdapter.signTransactionBlock({
                transactionBlock: txb,
                account: userAddress,
                chain: "sui:mainnet",
            });

            addLog("✅ Transaction Signed!");
            console.log("✅ Transaction Signed:", signedTx);

            // ✅ Submit Transaction
            addLog("🚀 Submitting transaction...");
            console.log("🚀 Submitting transaction...");
            const executeResponse = await provider.executeTransactionBlock({
                transactionBlock: signedTx.transactionBlockBytes, // Correct parameter
                signature: signedTx.signature,
                options: { showEffects: true, showEvents: true },
            });

            addLog("✅ Transaction Executed!");
            console.log("✅ Transaction Executed:", executeResponse);

            // ✅ Extract the transaction digest
            const txnDigest = executeResponse.digest;
            addLog(`🔍 Tracking transaction digest: ${txnDigest}`);
            console.log("🔍 Tracking transaction digest:", txnDigest);

            if (!txnDigest) {
                console.error("❌ Transaction digest is missing!");
                alert("Transaction submission failed. Check the console.");
                return;
            }

            // ✅ Wait for Transaction Confirmation with Retry
            addLog("🕒 Waiting for confirmation...");
            console.log("🕒 Waiting for confirmation...");
            let txnDetails = await fetchTransactionWithRetry(txnDigest);

            if (!txnDetails) {
                alert("Transaction not successful please retry");
                return;
            }

            // ✅ Call update API only if conditions are met
            if (shouldUpdateIsActive) {
                console.log(`🔹 Updating isActive for pool ${poolId}...`);
                await updateIsActiveWithRetry(poolId, 3);
            } else {
                console.log("❌ Skipping isActive update due to insufficient reward balance.");
            }

            // 🔄 Refresh balances after the swap
            await fetchBalance(sellToken, setSellBalance);
            await fetchBalance(buyToken, setBuyBalance);
            await fetchPoolStats(poolId);
            setIsProcessing(false); // ✅ Ensure modal does not close early

        } catch (error) {
            addLog(`❌ Swap Failed (Attempt ${attempt}): ${error.message}`);
            console.error(`❌ Swap Failed (Attempt ${attempt}):`, error);

            if (attempt < 3) {
                console.log(`🔁 Retrying Swap... (Attempt ${attempt + 1})`);
                setTimeout(() => handleSwap(attempt + 1), 2000); // Retry after 2 seconds
            } else {
                alert("❌ Swap failed after multiple attempts. Check console for details.");
            }
        } finally {
            setIsProcessing(false); // ✅ Ensure modal does not close early
        }
    };

    const updateIsActiveWithRetry = async (poolId: string, maxRetries = 3) => {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                console.log("🔍 Sending `poolId`:", poolId, "Type:", typeof poolId);

                const response = await fetch("/api/update-pool-activity", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ poolId: String(poolId) }) // ✅ Ensure `poolId` is always a string
                });

                // ✅ Handle 409 Conflict Gracefully
                if (response.status === 409) {
                    console.log(`⚠️ Pool ${poolId} did not meet conditions for update (isActive already set or processing).`);
                    return; // ✅ Exit without retrying
                }

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${result.error || "Unknown error"}`);
                }

                console.log(`✅ isActive API Response (Attempt ${attempt + 1}):`, result);
                addLog(result.message);
                return; // ✅ Exit on success

            } catch (error: any) {
                console.error(`❌ Failed to update isActive (Attempt ${attempt + 1}):`, error);
                addLog(`⚠️ Failed to update isActive (Attempt ${attempt + 1}) - ${error.message}`);

                // ✅ If the error is a 409 Conflict, exit gracefully
                if (error.message.includes("HTTP 409")) {
                    console.log("⚠️ Pool did not meet conditions, stopping retries.");
                    return; // ✅ Stop retrying, no need to update
                }

                attempt++;

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff (2s, 4s, 8s)
                    console.log(`⏳ Retrying isActive update in ${delay / 1000} seconds...`);
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }

        console.error("❌ Max retries reached: isActive update failed.");
        addLog("❌ Max retries reached: isActive update failed.");
    };

    const fetchTransactionWithRetry = async (txnDigest, retries = 10, delay = 5000) => {
        await new Promise((res) => setTimeout(res, 3000)); // ⏳ Delay before first check

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                addLog(`🔍 Checking transaction status... (Attempt ${attempt})`);
                console.log(`🔍 Checking transaction status... (Attempt ${attempt})`);

                const txnDetails = await provider.getTransactionBlock({
                    digest: txnDigest,
                    options: { showEffects: true, showEvents: true },
                });

                // ✅ If transaction succeeded
                if (txnDetails?.effects?.status?.status === "success") {
                    addLog("✅ Transaction Successfully Confirmed!");
                    console.log("✅ Transaction Successfully Confirmed!", txnDetails);
                    return txnDetails;
                }

                // ❌ If transaction failed, extract Move abort error code
                if (txnDetails?.effects?.status?.status === "failure") {
                    const errorMessage = txnDetails.effects.status.error || "Unknown error occurred.";

                    // 🔍 Extract MoveAbort details
                    const moveErrorMatch = errorMessage.match(
                        /MoveAbort\(MoveLocation \{ module: ModuleId \{ address: ([^,]+), name: Identifier\("([^"]+)"\) \}, function: (\d+), instruction: (\d+), function_name: Some\("([^"]+)"\) \}, (\d+)\)/
                    );

                    if (moveErrorMatch) {
                        const moduleAddress = moveErrorMatch[1];  // Address of the module (not needed for display)
                        const moduleName = moveErrorMatch[2];      // Module name (e.g., "srmV1")
                        const functionIndex = moveErrorMatch[3];   // Function index in module (not usually needed)
                        const instructionIndex = moveErrorMatch[4]; // Instruction index in function
                        const functionName = moveErrorMatch[5];     // Function name (e.g., "swap_a_for_b")
                        const abortCode = parseInt(moveErrorMatch[6]); // Abort Code (e.g., 3)

                        console.error(`❌ Move Abort in module ${moduleName} (Function: ${functionName}), Code ${abortCode}`);
                        addLog(`❌ Move Abort in module ${moduleName}, Code ${abortCode}`);

                        // 🔹 **Map Error Codes to User-Friendly Messages**
                        let userErrorMessage = `Swap failed in ${moduleName}::${functionName} with code ${abortCode}.`;

                        if (abortCode === 3) userErrorMessage = "⚠️ Swap failed: Excessive slippage.";
                        if (abortCode === 4) userErrorMessage = "⚠️ Not enough liquidty available for the swap.";
                        if (abortCode === 1001) userErrorMessage = "⚠️ Swap failed due to price impact.";

                        alert(userErrorMessage);
                        return null; // Stop retrying, exit function
                    }

                    console.error("❌ Transaction Failed:", errorMessage);
                    addLog(`❌ Transaction Failed: ${errorMessage}`);
                    alert(`Swap failed: ${errorMessage}`); // Show user-friendly message
                    return null; // Stop retrying, exit function
                }

                // ⏳ If transaction is still pending, retry
                console.warn(`⚠️ Transaction not confirmed yet (Attempt ${attempt})`, txnDetails);
            } catch (error) {
                if (error.message.includes("Could not find the referenced transaction")) {
                    console.warn(`⏳ Transaction not yet indexed. Retrying... (Attempt ${attempt})`);
                } else {
                    console.error(`❌ Error fetching transaction (Attempt ${attempt}):`, error);
                    alert(`Error fetching transaction: ${error.message}`);
                    return null; // Stop retrying, return error
                }
            }

            await new Promise((res) => setTimeout(res, delay)); // ⏳ Wait before retrying
        }

        console.error("❌ Transaction failed after multiple attempts.");
        addLog("❌ Transaction failed after multiple attempts.");
        alert("Transaction failed after multiple attempts. Please check your swap settings.");
        return null;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);

        // Hide the message after 2 seconds
        setTimeout(() => setCopiedText(null), 2000);
    };
    return (
        <div className="flex flex-col min-h-screen text-white bg-gray-950">

            {/* 🔁 Ticker Row */}
            <div className="w-full border-b border-gray-800">
                <Ticker />
            </div>

            {/* 🔍 Search + Pair Stats */}
            <div className="p-4 border-b border-gray-800">
                <div className="max-w-screen-xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-4 space-y-4 lg:space-y-0">
                        {/* Shrink SearchBar on desktop */}
                        <div className="w-full lg:w-1/3">
                            <SearchBar onSelectPair={handleSearchPairSelect} />
                        </div>

                        {/* Expand PairStats beside it */}
                        <div className="w-full lg:flex-1">
                            <PairStats
                                poolId={searchPairPoolId}
                                coinA={searchPairCoinA}
                                coinB={searchPairCoinB}
                            />
                        </div>
                    </div>
                </div>
            </div>


            {/* 💧 Pool Info | 📈 Chart | 🔄 Swap */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 max-w-screen-xl mx-auto">
                <div>
                    <PoolInfo poolMetadata={poolMetadata} poolStats={poolStats} />
                </div>
                <div>
                    <Chart sellToken={sellToken} buyToken={buyToken} />
                </div>
                <div>
                    <SwapInterface
                        sellToken={sellToken}
                        buyToken={buyToken}
                        sellAmount={sellAmount}
                        buyAmount={buyAmount}
                        handleSellAmountChange={handleSellAmountChange}
                        handleBuyAmountChange={handleBuyAmountChange}
                        handleSelectToken={handleSelectToken}
                        handleSwap={handleSwap}
                        handleSwapTokens={handleSwapTokens}
                        isProcessing={isProcessing}
                        walletConnected={walletConnected}
                        maxSlippage={maxSlippage}
                        setMaxSlippage={setMaxSlippage}
                        sellBalance={sellBalance}
                        buyBalance={buyBalance}
                    />
                </div>
            </div>

            {/* 🧾 Recent Transactions | 💼 Wallet Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-screen-xl mx-auto">
                <div>
                    <RecentTransactions
                        poolId={poolId}
                        walletAddress={walletAddress}
                        sellToken={sellToken}
                        buyToken={buyToken}
                    />
                </div>
                <div>
                    <WalletInfo
                        walletAddress={walletAddress}
                        walletConnected={walletConnected}
                        sellToken={sellToken}
                        buyToken={buyToken}
                        sellBalance={sellBalance}
                        buyBalance={buyBalance}
                    />
                </div>
            </div>

            {/* ✅ Transaction Modal */}
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                logs={logs}
                isProcessing={isProcessing}
            />
        </div>
    );
}