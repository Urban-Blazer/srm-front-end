// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCurrentWallet, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME, CONFIG_ID } from "../config";
import TokenSelector from "@components/TokenSelector"
import CopyIcon from "@svg/copy-icon.svg";
import TransactionModal from "@components/TransactionModal";
import Image from "next/image";
import { predefinedCoins } from "../data/coins";

const provider = new SuiClient({ url: GETTER_RPC });

const SUI_REWARD_BALANCE = 50 * Math.pow(10, 9);  // 50 SUI
const USDC_REWARD_BALANCE = 250 * Math.pow(10, 6); // 250 USDC
const SRM_REWARD_BALANCE = 5 * Math.pow(10, 9);  // 5 SRM

export default function Swap() {
    const wallet = useCurrentWallet()?.currentWallet;
    const account = useCurrentAccount();
    const walletConnected = !!wallet && !!account;
    const walletAddress = account?.address || null;
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
    const [priceImpact, setPriceImpact] = useState<number>(0);
    const [parsedSellAmount, setParsedSellAmount] = useState<number | null>(null);
    const [parsedBuyAmount, setParsedBuyAmount] = useState<number | null>(null);
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const getImpactColor = (impact: number) =>
        impact >= 15 ? "text-red-600" : impact >= 5 ? "text-yellow-500" : "text-gray-700";

    // ✅ Debounce Timer Ref
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
    };

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
        setParsedSellAmount(null);
        setParsedBuyAmount(null);
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
        setParsedSellAmount(null);
        setParsedBuyAmount(null);
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
                    const sell = isSell ? Number(amount) : Number(response.sellAmount);
                    const buy = isSell ? Number(response.buyAmount) : Number(amount);

                    setParsedSellAmount(sell);
                    setParsedBuyAmount(buy);

                    setBuyAmount(isSell ? response.buyAmount : amount);
                    setSellAmount(isSell ? amount : response.sellAmount);

                    // Calculate price impact only when all required data is available
                    if (
                        poolStats &&
                        poolMetadata &&
                        sell != null &&
                        buy != null &&
                        isAtoB != null
                    ) {
                        const reserveInRaw = isAtoB ? poolStats.balance_a : poolStats.balance_b;
                        const reserveOutRaw = isAtoB ? poolStats.balance_b : poolStats.balance_a;
                        const reserveInDecimals = isAtoB ? poolMetadata.coinA.decimals : poolMetadata.coinB.decimals;
                        const reserveOutDecimals = isAtoB ? poolMetadata.coinB.decimals : poolMetadata.coinA.decimals;

                        const impact = calculatePriceImpact(
                            sell,
                            poolStats,
                            reserveInRaw,
                            reserveOutRaw,
                            reserveInDecimals,
                            reserveOutDecimals
                        );

                        setPriceImpact(impact);
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

        if ( !walletConnected || !sellToken || !buyToken || !sellAmount || !poolId || isAtoB === null || !poolMetadata) {
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
            const { data: sellTokenCoins } = await provider.getCoins({
                owner: userAddress,
                coinType: sellToken.typeName,
            });

            const sellTokenBalance = await provider.getBalance({
                owner: walletAddress,
                coinType: sellToken.typeName,
            });

            console.log({ sellTokenBalance, sellTokenCoins })

            if (sellTokenCoins.length === 0) {
                alert("⚠️ No single coin object has enough balance to cover the sell amount.");
                console.error("❌ No sufficient Coin Object found:", { sellTokenCoins });
                return;
            }

            const needsGasBuffer = sellToken.typeName === "0x2::sui::SUI";
            const requiredBalance = needsGasBuffer ? sellAmountU64 + BigInt(900_000) : sellAmountU64;

            if (BigInt(sellTokenBalance.totalBalance) < requiredBalance) {
                alert("⚠️ Not enough balance to cover the sell amount.");
                console.error("❌ Not enough balance to cover the sell amount:", { sellTokenBalance });
                return;
            }

            console.log("🔍 Extracted Coins with Balance:", sellTokenCoins);

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

            // ✅ Build Transaction Block
            const txb = new TransactionBlock();
            
            let usedCoin;

            if (isSellingSui) {

                const [splitSui] = txb.splitCoins(txb.gas, [txb.pure(sellAmountU64)]);
                usedCoin = splitSui;

                addLog("⚡️ Using txb.gas to split sell amount (SUI sell).");

            } else {
                let accumulated = 0;
                const coinsToUse: typeof sellTokenCoins = [];
                for (const coin of sellTokenCoins) {
                    accumulated += Number(coin.balance);
                    coinsToUse.push(coin);
                    if (accumulated >= sellAmountU64) break;
                }

                if (coinsToUse.length === 0) {
                    console.error(`No $${coin} coins found in your wallet`);
                    ctx.reply(`No $${coin} coins found in your wallet`);
                    return;
                }

                if (coinsToUse.length === 1) {
                    usedCoin = txb.splitCoins(
                        txb.object(coinsToUse[0].coinObjectId),
                        [txb.pure.u64(sellAmountU64)]
                    );
                } else {
                    // Si se requieren varias monedas, se hace merge de ellas
                    const firstCoin = coinsToUse[0];
                    const remainingCoins = coinsToUse.slice(1).map(coin => txb.object(coin.coinObjectId));

                    txb.mergeCoins(txb.object(firstCoin.coinObjectId), remainingCoins);
                    const [splitSui] = txb.splitCoins(
                        txb.object(firstCoin.coinObjectId),
                        [txb.pure.u64(sellAmountU64)]
                    );

                    usedCoin = splitSui;
                }

            }

            txb.setGasBudget(50_000_000);

            // 📌 Determine the correct swap function
            const swapFunction = isAtoB
                ? `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_a_for_b_with_coins_and_transfer_to_sender`
                : `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_b_for_a_with_coins_and_transfer_to_sender`;
            console.log({ usedCoin })
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

            let executeResponse;

            await new Promise<void>((resolve, reject) => {
                signAndExecuteTransaction(
                    {
                        transaction: txb.serialize(),
                        chain: 'sui:mainnet', // Or 'sui:devnet' depending on env
                    },
                    {
                        onSuccess: (result) => {
                            executeResponse = result;
                            resolve();
                        },
                        onError: (error) => {
                            console.error("❌ Claim transaction failed:", error);
                            addLog(`❌ Transaction failed: ${error.message}`);
                            alert("⚠️ Claim transaction failed. See console for details.");
                            reject(error);
                        },
                    }
                );
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

    const calculateEffectiveAmountIn = (amountIn: number, stats: any) => {
        const totalFeeBps =
            Number(stats.lp_builder_fee || 0) +
            Number(stats.burn_fee || 0) +
            Number(stats.creator_royalty_fee || 0) +
            Number(stats.rewards_fee || 0) +
            100; // Assume base fee of 1%

        const netAmountBps = 10000 - totalFeeBps;
        return (amountIn * netAmountBps) / 10000;
    };

    const calculatePriceImpact = (
        amountInHuman: number,
        stats: any,
        reserveInRaw: number,
        reserveOutRaw: number,
        reserveInDecimals: number,
        reserveOutDecimals: number
    ): number => {
        const effectiveIn = calculateEffectiveAmountIn(amountInHuman, stats);
        if (effectiveIn <= 0 || reserveInRaw <= 0 || reserveOutRaw <= 0) return 0;

        const reserveIn = reserveInRaw / Math.pow(10, reserveInDecimals);
        const reserveOut = reserveOutRaw / Math.pow(10, reserveOutDecimals);

        const amountOut = (effectiveIn * reserveOut) / (reserveIn + effectiveIn);
        const expectedOut = effectiveIn * (reserveOut / reserveIn);

        return ((expectedOut - amountOut) / expectedOut) * 100;
    };


    return (
        <div className="relative z-0 min-h-screen">
            {/* 🔥 Background Video - Behind Everything */}
            <div className="fixed inset-0 -z-20">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover min-h-screen"
                >
                    <source src="/background.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        <div className="min-h-screen flex flex-col md:flex-row justify-center items-center p-4 pb-20 overflow-y-auto">

            {/* Swap Interface */}
            <div className="w-full max-w-sm md:max-w-md bg-white shadow-lg rounded-xl p-6 relative">
                <div className="flex flex-col space-y-4 pb-24">
                    <h1 className="text-xl font-bold text-center">Swap Tokens</h1>

                    {/* Max Slippage Input */}
                    <div className="bg-gray-100 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <label className="text-royalPurple font-medium"><strong>Max Slippage</strong></label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="50"
                                    value={maxSlippage}
                                    onChange={(e) => setMaxSlippage(parseFloat(e.target.value))}
                                    className="bg-white text-deepTeal text-right font-semibold px-3 py-1 border border-gray-300 rounded-lg w-20 outline-none"
                                />
                                <span className="text-deepTeal"><strong>%</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* Sell Input */}
                    <div className="bg-gray-100 p-4 rounded-lg relative">
                        <div className="flex justify-between items-center">
                            <label htmlFor="sellAmount" className="block text-royalPurple"><strong>Sell</strong></label>
                            {sellToken && <span className="text-sm text-deepTeal"><strong style={{ color: "#6A1B9A" }}>Balance:</strong> <strong style={{ color: "#0D3B3E" }}>
                                {(
                                    Math.floor((Number(sellBalance) / Math.pow(10, sellToken.decimals ?? 9)) * 1e4) / 1e4
                                ).toLocaleString(undefined, {
                                    minimumFractionDigits: 4,
                                    maximumFractionDigits: 4,
                                })}
                            </strong>
                        </span>}
                        </div>

                            <div className="flex items-center gap-2">
                            <input
                                id="sellAmount"
                                name="sellAmount"
                                type="number"
                                    className="flex-grow bg-transparent text-lg md:text-2xl font-semibold text-black w-0 outline-none"
                                placeholder="0"
                                value={sellAmount}
                                onChange={handleSellAmountChange}
                                disabled={fetchingQuote}
                            />
                            {/* Sell Token Selection Button */}
                            <button
                                    className="flex items-center bg-white border rounded-lg px-3 py-2 shadow hover:bg-softMint"
                                onClick={() => setDropdownOpen(dropdownOpen === "sell" ? null : "sell")}
                            >
                                {sellToken ? (
                                    <div className="flex items-center">
                                            <img src={sellToken.logo} alt={sellToken.symbol} width={20} height={20} className="w-6 h-6 mr-2 sm:w-8 sm:h-8 rounded-full" />
                                            <span className="text-deepTeal font-medium whitespace-nowrap"><strong>{sellToken.symbol}</strong></span>
                                    </div>
                                ) : (
                                            <span className="text-deepTeal font-medium whitespace-nowrap"><strong>Select Token</strong></span>
                                )}
                            </button>
                        </div>

                        {/* Open Token Selector Modal for Sell */}
                        {dropdownOpen === "sell" && (
                            <TokenSelector
                                onSelectToken={(token) => handleSelectToken(token, "sell")}
                                onClose={() => setDropdownOpen(null)}
                            />
                        )}
                    </div>

                        {/* Percentage Quick Select Buttons */}
                        <div className="flex space-x-2">
                            {[25, 50, 75, 100].map((percent) => (
                                <button
                                    key={percent}
                                    onClick={() => handlePercentageClick(percent)}
                                    className="button-secondary px-3 py-1 rounded-md text-sm transition"
                                >
                                    {percent}%
                                </button>
                            ))}
                        </div>

                    {/* Swap Arrow */}
                    <div className="flex justify-center">
                        <button
                            className="bg-gray-200 p-2 rounded-full transition hover:bg-softMint"
                            onClick={handleSwapTokens}
                        >
                            ⬇️
                        </button>
                    </div>

                    {/* Buy Input */}
                    <div className="bg-gray-100 p-4 rounded-lg relative">
                        <div className="flex justify-between items-center">
                            <label htmlFor="buyAmount" className="block text-royalPurple"><strong>Buy</strong></label>
                            {buyToken && <span className="text-sm text-deepTeal"><strong style={{ color: "#6A1B9A" }}>Balance:</strong> <strong style={{ color: "#0D3B3E" }}>
                                {(
                                    Math.floor((Number(buyBalance) / Math.pow(10, buyToken.decimals ?? 9)) * 1e4) / 1e4
                                ).toLocaleString(undefined, {
                                    minimumFractionDigits: 4,
                                    maximumFractionDigits: 4,
                                })}
                            </strong>
                        </span>}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="buyAmount"
                                name="buyAmount"
                                type="number"
                                className="flex-grow bg-transparent text-lg md:text-2xl font-semibold text-black w-0 outline-none"
                                placeholder="0"
                                value={buyAmount}
                                onChange={handleBuyAmountChange}
                                disabled={fetchingQuote}
                            />
                            {/* Buy Token Selection Button */}
                            <button
                                    className="flex items-center bg-white border rounded-lg px-3 py-2 shadow hover:bg-softMint"
                                onClick={() => setDropdownOpen(dropdownOpen === "buy" ? null : "buy")}
                            >
                                {buyToken ? (
                                    <div className="flex items-center">
                                            <img src={buyToken.logo} alt={buyToken.symbol} width={20} height={20} className="w-6 h-6 mr-2 sm:w-8 sm:h-8 rounded-full" />
                                        <span className="text-deepTeal font-medium whitespace-nowrap"><strong>{buyToken.symbol}</strong></span>
                                    </div>
                                ) : (
                                        <span className="text-deepTeal font-medium whitespace-nowrap"><strong>Select Token</strong></span>
                                )}
                            </button>
                        </div>

                        {/* Open Token Selector Modal for Buy */}
                        {dropdownOpen === "buy" && (
                            <TokenSelector
                                onSelectToken={(token) => handleSelectToken(token, "buy")}
                                onClose={() => setDropdownOpen(null)}
                            />
                        )}
                    </div>

                        {Math.abs(priceImpact) >= 5 && (
                            <div className={`text-center font-semibold text-sm mt-2 ${getImpactColor(priceImpact)}`}>
                                {Math.abs(priceImpact) >= 15
                                    ? `❌ Swap blocked: Price impact too high (${priceImpact.toFixed(2)}%)`
                                    : `⚠️ High Price Impact: ${priceImpact.toFixed(2)}%`}
                            </div>
                        )}

                    {/* Swap Button */}
                    <button
                        className={`button-secondary w-full text-white p-3 rounded-lg ${walletConnected && sellToken && buyToken ? "bg-royalPurple" : "bg-gray-300 cursor-not-allowed"
                            }`}
                            onClick={!walletConnected ? () => wallet?.connect() : () => handleSwap(1)}
                            disabled={
                                fetchingQuote ||
                                !walletConnected ||
                                !sellToken ||
                                !buyToken ||
                                isProcessing ||
                                Math.abs(priceImpact) >= 15
                            }
                    >
                            {fetchingQuote
                                ? "Fetching Quote..."
                                : !walletConnected
                                    ? "Connect Wallet"
                                    : Math.abs(priceImpact) >= 15
                                        ? "Swap Disabled – High Impact"
                                        : "Swap"}
                    </button>
                    <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} isProcessing={isProcessing} />
                </div>
            </div>

            {/* Pool Information Card */}
            <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 mt-6 lg:mt-0 lg:ml-6">
                <h1 className="text-lg font-bold mb-4">Pool Information</h1>

                {poolLoading ? (
                    <p className="text-royalPurple">Loading pool data...</p>
                ) : poolId ? (
                    <>
                        {/* ✅ Pool ID with Copy Button */}
                        <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg overflow-x-auto">
                            <p className="text-deepTeal truncate">
                                <strong style={{ color: "#6A1B9A" }}>Pool ID:</strong> <strong style={{ color: "#0D3B3E" }}>{poolId}</strong>
                            </p>
                            <div className="flex items-center space-x-2">
                                    {copiedText === poolId && <span className="text-royalPurple text-sm"><strong>Copied!</strong></span>}
                                <button
                                    onClick={() => handleCopy(poolId)}
                                    className="bg-gray-300 p-2 rounded-lg hover:bg-softMint transition"
                                >
                                    <CopyIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* ✅ Prevent rendering if `poolStats` or `poolMetadata` is missing */}
                        {poolStats && poolMetadata ? (
                                <div className="mt-4 space-y-3 max-h-[400px] md:max-h-[500px] overflow-y-auto pb-20">
                                {/* ✅ Display Coin A Metadata with Balance */}
                                <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg text-deepTeal">
                                    <div className="flex items-center space-x-3">
                                        {poolMetadata?.coinA?.image && (
                                                <img src={poolMetadata?.coinA?.image} alt={poolMetadata?.coinA?.symbol} width={20} height={20} className="w-8 h-8 rounded-full" />
                                        )}
                                        <p className="text-lg font-semibold">
                                            {poolMetadata?.coinA?.symbol}
                                            {coinAPrice && (
                                                <span className="text-sm text-royalPurple ml-2">
                                                    (${coinAPrice.toFixed(4)})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                        <p className="text-lg font-semibold">
                                            {Math.floor(
                                                Number(poolStats?.balance_a || 0) /
                                                Math.pow(10, Number(poolMetadata?.coinA?.decimals || 0))
                                            ).toLocaleString()}
                                        </p>
                                </div>

                                {/* ✅ Display Coin B Metadata with Balance */}
                                <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg text-deepTeal">
                                    <div className="flex items-center space-x-3">
                                        {poolMetadata?.coinB?.image && (
                                                <img src={poolMetadata?.coinB?.image} alt={poolMetadata?.coinB?.symbol} width={20} height={20} className="w-8 h-8 rounded-full" />
                                        )}
                                        <p className="text-lg font-semibold">
                                            {poolMetadata?.coinB?.symbol}
                                            {coinBPrice !== undefined && (
                                                <span className="text-sm text-royalPurple ml-2">
                                                    (${Number(coinBPrice).toFixed(8)})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                        <p className="text-lg font-semibold">
                                            {Math.floor(
                                                Number(poolStats?.balance_b || 0) /
                                                Math.pow(10, Number(poolMetadata?.coinB?.decimals || 0))
                                            ).toLocaleString()}
                                        </p>
                                </div>

                                {/* ✅ Pool Stats Section */}
                                <div className="text-deepTeal space-y-2">
                                    {/* ✅ LP Locked Balance Now Always Visible */}
                                        <p><strong style={{ color: "#6A1B9A" }}>Burnt LP:</strong> <strong style={{ color: "#0D3B3E" }}>
                                            {(
                                                Number(poolStats?.locked_lp_balance || 0) / 1e9
                                            ).toLocaleString(undefined, {
                                                minimumFractionDigits: 4,
                                                maximumFractionDigits: 4,
                                            })} LP
                                        </strong>
                                        </p>
                                        <p><strong style={{ color: "#6A1B9A" }}>Burnt Coins:</strong> <strong style={{ color: "#0D3B3E" }}>
                                            {(
                                                Math.floor(
                                                    Number(poolStats?.burn_balance_b || 0) /
                                                    Math.pow(10, Number(poolMetadata?.coinB?.decimals || 0)) * 1e4
                                                ) / 1e4
                                            ).toLocaleString(undefined, {
                                                minimumFractionDigits: 4,
                                                maximumFractionDigits: 4,
                                            })} {poolMetadata?.coinB?.symbol}
                                        </strong>
                                        </p>
                                        <p><strong style={{ color: "#6A1B9A" }}>Reward Balance:</strong> <strong style={{ color: "#0D3B3E" }}>
                                            {(
                                                Math.floor(
                                                    Number(poolStats?.reward_balance_a || 0) /
                                                    Math.pow(10, Number(poolMetadata?.coinA?.decimals || 0)) * 1e4
                                                ) / 1e4
                                            ).toLocaleString(undefined, {
                                                minimumFractionDigits: 4,
                                                maximumFractionDigits: 4,
                                            })} {poolMetadata?.coinA?.symbol}
                                        </strong>
                                        </p>

                                    {/* ✅ Correctly formatted fees as percentages */}
                                    <p><strong style={{ color: "#6A1B9A" }}>LP Builder Fee:</strong> <strong style={{ color: "#0D3B3E" }}>{((poolStats?.lp_builder_fee || 0) / 100).toFixed(2)} %</strong></p>
                                    <p><strong style={{ color: "#6A1B9A" }}>Reward Fee:</strong> <strong style={{ color: "#0D3B3E" }}>{((poolStats?.rewards_fee || 0) / 100).toFixed(2)} %</strong></p>
                                    <p><strong style={{ color: "#6A1B9A" }}>Burn Fee:</strong> <strong style={{ color: "#0D3B3E" }}>{((poolStats?.burn_fee || 0) / 100).toFixed(2)} %</strong></p>
                                    <p><strong style={{ color: "#6A1B9A" }}>Creator Royalty Fee:</strong> <strong style={{ color: "#0D3B3E" }}>{((poolStats?.creator_royalty_fee || 0) / 100).toFixed(2)} %</strong></p>
                                    
                                    {/* ✅ Dev Wallet with Copy Button */}
                                    <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg overflow-x-auto">
                                        <p className="text-deepTeal truncate">
                                                <strong style={{ color: "#6A1B9A" }}>Creator Royalty Wallet:</strong> <strong style={{ color: "#0D3B3E" }}>{poolStats?.creator_royalty_wallet || ""}</strong>
                                        </p>
                                        <div className="flex items-center space-x-2">
                                                {copiedText === poolStats?.creator_royalty_wallet && <span className="text-royalPurple text-sm"><strong>Copied!</strong></span>}
                                            <button
                                                onClick={() => handleCopy(poolStats?.creator_royalty_wallet || "")}
                                                className="bg-gray-300 p-2 rounded-lg hover:bg-softMint transition"
                                            >
                                                <CopyIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-500 mt-4">Pool Does Not Exist</p>
                        )}
                    </>
                ) : (
                        <p className="text-royalPurple">Pool Does Not Exist: Select new coins</p>
                )}
            </div>

        </div>

        </div>
    );
}
