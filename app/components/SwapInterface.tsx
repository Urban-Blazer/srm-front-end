import TransactionModal from "@components/TransactionModal";
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from "@mysten/sui.js/transactions"; // for building tx
import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG_ID, DEX_MODULE_NAME, PACKAGE_ID } from "../config";
import Image from "next/image";
import { predefinedCoins } from "../data/coins";
import { PoolStats, SwapInterfaceProps } from "@/app/types";
import InputCurrency, { formatWithCommas } from "./InputCurrency";
import SelectTokenModal from "./SelectTokenModal";
import useAccountBalances from "../hooks/useAccountBalances";
import SRMSwapIcon from "./UI/SRMSwapIcon";
import { isBuyAtom } from "@data/store";
import { useAtom } from "jotai";
import useQuote from "../hooks/useQuote";
import { Spinner } from "./Spinner";


const SUI_REWARD_BALANCE = 100 * Math.pow(10, 9);  // 100 SUI
const USDC_REWARD_BALANCE = 250 * Math.pow(10, 6); // 250 USDC
const SRM_REWARD_BALANCE = 5 * Math.pow(10, 9);     // 5 SRM (adjust if needed)

export default function SwapInterface({
    poolId,
    coinA,
    coinB,
    poolStats,
}: SwapInterfaceProps) {
    const provider = useSuiClient();
    const [isBuy, setIsBuy] = useAtom(isBuyAtom);
    const [coinABalance, setCoinABalance] = useState<number>(0);
    const [coinBBalance, setCoinBBalance] = useState<number>(0);
    const [amountIn, setAmountIn] = useState<string>("");
    const [digest, setDigest] = useState<string>("");
    const [amountOut, setAmountOut] = useState<string>("");
    const [fetchingQuote, setFetchingQuote] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const [slippage, setSlippage] = useState<number>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [transactionProgress, setTransactionProgress] = useState<{ image: string; text: string; } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTimer, setModalTimer] = useState<NodeJS.Timeout | null>(null);
    const account = useCurrentAccount();
    const wallet = useCurrentWallet()?.currentWallet;
    const walletAddress = account?.address;
    const [priceImpact, setPriceImpact] = useState<number>(0);
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const getImpactColor = (impact: number) =>
        impact >= 15 ? "text-red-500" : impact >= 5 ? "text-yellow-400" : "text-slate-300";

    
    const [queryParams, setQueryParams] = useState<URLSearchParams | undefined>(undefined);
    const { data: quote, isLoading, refetch, isPending, isRefetching } = useQuote(queryParams, amountIn, 10000);
    
    const isAnyLoading = isLoading || isRefetching;
  const { obj: accountBalancesObj } = useAccountBalances();

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]);
    };

    const fetchBalance = useCallback(async (token: any, setBalance: (balance: number) => void) => {
        if (!walletAddress || !token || !token?.symbol) return; // 

        try {
            const { totalBalance } = await provider.getBalance({
                owner: walletAddress,
                coinType: token.typeName,
            });

            setBalance(Number(totalBalance));
        } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            setBalance(0);
        }
    },[provider, walletAddress]);

    useEffect(() => {
        setAmountIn('');
        setAmountOut('');
    },[isBuy]);

    useEffect(() => {
    const calculatePriceImpact = (
        amountInHuman: number,
        poolStats: PoolStats,
        reserveInRaw: number,
        reserveOutRaw: number,
        reserveInDecimals: number,
        reserveOutDecimals: number
    ): number => {
        const effectiveIn = calculateEffectiveAmountIn(amountInHuman, poolStats);
        if (effectiveIn <= 0 || reserveInRaw <= 0 || reserveOutRaw <= 0) return 0;

        const reserveIn = reserveInRaw / Math.pow(10, reserveInDecimals);
        const reserveOut = reserveOutRaw / Math.pow(10, reserveOutDecimals);

        const amountOut = (effectiveIn * reserveOut) / (reserveIn + effectiveIn);
        const expectedOutNoImpact = effectiveIn * (reserveOut / reserveIn);

        const priceImpact = ((expectedOutNoImpact - amountOut) / expectedOutNoImpact) * 100;

        return priceImpact;
    }

    const handleGetQuote = (amount: string, isSell: boolean) => {
        if (!queryParams || !poolId || !coinA || !coinB || !poolStats || !quote) {
            console.error('Missing required information for quote');
            return;
        }
        if(isPending){
            return;
        }

        const data = quote;

        if (data) {
            const inputToken = isSell
                ? (isBuy ? coinA : coinB)
                : (isBuy ? coinB : coinA);

            const inputAmountRaw = Math.floor(Number(amount) * Math.pow(10, inputToken.decimals));
            const inputAmountHuman = inputAmountRaw / Math.pow(10, inputToken.decimals);

            const reserveInRaw = isSell
                ? (isBuy ? poolStats.balance_a : poolStats.balance_b)
                : (isBuy ? poolStats.balance_b : poolStats.balance_a);

            const reserveOutRaw = isSell
                ? (isBuy ? poolStats.balance_b : poolStats.balance_a)
                : (isBuy ? poolStats.balance_a : poolStats.balance_b);

            const reserveInDecimals = isSell
                ? (isBuy ? coinA.decimals : coinB.decimals)
                : (isBuy ? coinB.decimals : coinA.decimals);

            const reserveOutDecimals = isSell
                ? (isBuy ? coinB.decimals : coinA.decimals)
                : (isBuy ? coinA.decimals : coinB.decimals);

            const impact = calculatePriceImpact(
                inputAmountHuman,
                poolStats,
                reserveInRaw,
                reserveOutRaw,
                reserveInDecimals,
                reserveOutDecimals
            );

            setPriceImpact(impact);
            let _amount;

            if (isSell && data.buyAmount) {
                _amount = formatWithCommas(Number(data.buyAmount).toFixed(4));
                setAmountOut(_amount);
            } else if (!isSell && data.sellAmount) {
                _amount = formatWithCommas(Number(data.sellAmount).toFixed(4));
                setAmountIn(_amount);
            }
        }
    };
        console.log('quote', quote, isPending, queryParams);
        if(!quote || isPending){
            console.log('Missing required information for quote', quote, isPending);
            return;
        }
        handleGetQuote(amountIn, true);
    },[quote, isPending, queryParams, amountIn, poolId, coinA, coinB, poolStats, isBuy]);

    useEffect(() => {
        const fetchBalances = async () => {
            if (walletAddress && coinA) {
                await fetchBalance(coinA, setCoinABalance);
            }
            if (walletAddress && coinB) {
                await fetchBalance(coinB, setCoinBBalance);
            }
        };

        fetchBalances();
    }, [coinA, coinB, fetchBalance, walletAddress]);

    const handleAmountInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('handleAmountInChange', e.target.value);
        if(e.target.value === '' || Number(e.target.value) === 0 ){
            setQueryParams(undefined);
            setAmountIn('');
            setAmountOut('');
            return;
        }
        setQueryParams(undefined);
        const value = e.target.value;
        setAmountIn(value);
        if (value && !isNaN(Number(value.replace(/,/g, "")))) {
            debouncedGetQuote(value.replace(/,/g, ""), true);
        }
    };

    const debouncedGetQuote = useCallback((amount: string, isSell: boolean) => {



    const getQueryParams = async (amount: string, isSell: boolean) => {
        if (!poolId || !coinA || !coinB || !poolStats) {
            console.error('Missing required information for quote');
            return;
        }
        setPriceImpact(0);
        if (isNaN(Number(amount)) || Number(amount) <= 0) return;

        setFetchingQuote(true);

        try {
            const relevantToken = isSell ? (isBuy ? coinA : coinB) : (isBuy ? coinB : coinA);
            const amountU64 = Math.floor(Number(amount) * Math.pow(10, relevantToken.decimals ?? 9));

            const queryParams = new URLSearchParams({
                poolId,
                amount: amountU64.toString(),
                isSell: isSell.toString(),
                isAtoB: isBuy.toString(),
                outputDecimals: (isSell
                    ? (isBuy ? coinB.decimals : coinA.decimals)
                    : (isBuy ? coinA.decimals : coinB.decimals)
                ).toString(),
                balanceA: poolStats.balance_a.toString(),
                balanceB: poolStats.balance_b.toString(),
                lpBuilderFee: poolStats.lp_builder_fee.toString(),
                burnFee: poolStats.burn_fee.toString(),
                creatorRoyaltyFee: poolStats.creator_royalty_fee.toString(),
                rewardsFee: poolStats.rewards_fee.toString(),
            });

            setQueryParams(queryParams);
            console.log('getQueryParams', amount, isSell, queryParams);
            refetch();
        } catch (error) {
            console.error("Error fetching quote:", error);
            setPriceImpact(0);
        } finally {
            setFetchingQuote(false);
        }
    };

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        console.log('debouncedGetQuote', amount, isSell);
        debounceTimer.current = setTimeout(() => {
            getQueryParams(amount, isSell);
        }, 300);
    }, [coinA, coinB, isBuy, poolId, poolStats, refetch]);

    const handleQuickSelect = (percent: number) => {
        let suiReserved = 0;
        if(isBuy){
            suiReserved = 55_000_000;   
        }
        const balance = (isBuy ? coinABalance : coinBBalance) - suiReserved;
        const decimals = isBuy ? coinA?.decimals ?? 9 : coinB?.decimals ?? 9;
        const formattedBalance = (balance > 0 ? balance : 0) / Math.pow(10, decimals);

        const amount = (formattedBalance * (percent / 100)).toString();
        setAmountIn(formatWithCommas(Number(amount).toFixed(4)));
        debouncedGetQuote(amount, true);
    };

    const handleSwap = async () => {
        if (!walletAddress || !poolId || !coinA || !coinB || !amountIn || !amountOut || !provider) {
            alert("Missing required information for swap.");
            return;
        }

        if (priceImpact >= 15) {
            console.error("Swap blocked: Price impact exceeds 15%");
            return;
        }

        if (!wallet) {
            console.error(" Wallet not connected.");
            return;
        }

        setLogs([]);
        setIsProcessing(true);
        setTransactionProgress({        
            image: '/images/txn_loading.png',
            text: '',
        });
        setIsModalOpen(true);

        try {
            const sellToken = isBuy ? coinA : coinB;
            const buyToken = isBuy ? coinB : coinA;

            const sellDecimals = sellToken.decimals ?? 9;
            const buyDecimals = buyToken.decimals ?? 9;

            const sellAmountU64 = BigInt(Math.floor(Number(amountIn.replace(/,/g, "")) * Math.pow(10, sellDecimals)));
            const expectedOutU64 = BigInt(Math.floor(Number(amountOut.replace(/,/g, "")) * Math.pow(10, buyDecimals)));

            const maxSlippageInt = BigInt(Math.floor(Number(slippage) * 100));
            const minOutU64 = expectedOutU64 - (expectedOutU64 * maxSlippageInt / BigInt(10000));
            if (minOutU64 <= 0n) {
                alert("Slippage too high, adjust your slippage setting.");
                setIsProcessing(false);
                return;
            }

            addLog("🔍 Fetching owned coins...");

            const { data: sellTokenCoins } = await provider.getCoins({
                owner: walletAddress,
                coinType: sellToken.typeName,
            });

            const sellTokenBalance = await provider.getBalance({
                owner: walletAddress,
                coinType: sellToken.typeName,
            });

            if (sellTokenCoins.length === 0) {
                addLog("❌ No sufficient Coin Object found");
                console.error("❌ No sufficient Coin Object found:", { sellTokenCoins });
                setTransactionProgress({        
                    image: '/images/txn_failed.png',
                    text: '',
                });
                return;
            }

            const needsGasBuffer = sellToken.typeName === "0x2::sui::SUI";
            const requiredBalance = needsGasBuffer ? sellAmountU64 + BigInt(900_000) : sellAmountU64;

            if (BigInt(sellTokenBalance.totalBalance) < requiredBalance) {
                addLog("❌ No enough balance to cover the sell amount");
                console.error("❌ No enough balance to cover the sell amount:", { sellTokenBalance });
                setTransactionProgress({        
                    image: '/images/txn_failed.png',
                    text: '',
                });
                return;
            }

            const txb = new TransactionBlock();
            let usedCoin;

            const SUI_TYPE = "0x2::sui::SUI";
            const isSellingSui = sellToken.typeName === SUI_TYPE;
            
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
                    addLog("❌ No $${coinA} coins found in your wallet.");
                    console.error(`No $${coinA} coins found in your wallet`);
                    setTransactionProgress({        
                        image: '/images/txn_failed.png',
                        text: '',
                    });
                    return;
                }

                if (coinsToUse.length === 1) {
                    usedCoin = txb.splitCoins(
                        txb.object(coinsToUse[0].coinObjectId),
                        [txb.pure.u64(sellAmountU64)]
                    );
                } else {
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

            const swapFunction = isBuy
                ? `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_a_for_b_with_coins_and_transfer_to_sender`
                : `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_b_for_a_with_coins_and_transfer_to_sender`;

            const typeArguments = [coinA.typeName, coinB.typeName];
            txb.moveCall({
                target: swapFunction,
                typeArguments,
                arguments: [
                    txb.object(poolId),
                    txb.object(CONFIG_ID),
                    usedCoin,
                    txb.pure.u64(sellAmountU64),
                    txb.pure.u64(minOutU64),
                    txb.object("0x6"),
                ],
            });

            addLog("🚀 Signing and submitting transaction...");
            let executeResponse: any;

            await new Promise<void>((resolve, reject) => {
                signAndExecuteTransaction(
                    {
                        transaction: txb.serialize(),
                        chain: 'sui:mainnet',
                    },
                    {
                        onSuccess: (result) => {
                            executeResponse = result;
                            resolve();
                        },
                        onError: (error) => {
                            setTransactionProgress({        
                                image: '/images/txn_failed.png',
                                text: '',
                            });
                            console.error("❌ Swap failed during execution:", error);
                            addLog(`❌ Swap failed: ${error.message}`);
                            // alert("⚠️ Swap failed. See console for details.");
                            reject(error);
                        },
                    }
                );
            });

            const txnDigest = executeResponse?.digest;
            
            if (!txnDigest) {
                throw new Error("Transaction digest missing after submit.");
            }

            setDigest(txnDigest);

            addLog(`🔍 Transaction submitted: ${txnDigest}`);
            addLog("⏳ Waiting for confirmation...");

            const confirmed = await fetchTransactionWithRetry(txnDigest);

            if (!confirmed) {
                throw new Error("Transaction not confirmed after submission.");
            }

            addLog("✅ Swap completed successfully!");

            setTransactionProgress({        
                image: '/images/txn_successful.png',
                text: '',
            });

            const rewardBalance = Number(poolStats?.reward_balance_a ?? 0);
            const suiTypeName = predefinedCoins.find((coin) => coin.symbol === "SUI")?.typeName;
            const usdcTypeName = predefinedCoins.find((coin) => coin.symbol === "USDC")?.typeName;
            const srmTypeName = predefinedCoins.find((coin) => coin.symbol === "MOCKSUI")?.typeName;
            const poolCoinATypeName = coinA?.typeName;

            let shouldUpdateIsActive = false;

            if (poolCoinATypeName === suiTypeName && rewardBalance >= SUI_REWARD_BALANCE) {
                shouldUpdateIsActive = true;
            } else if (poolCoinATypeName === usdcTypeName && rewardBalance >= USDC_REWARD_BALANCE) {
                shouldUpdateIsActive = true;
            } else if (poolCoinATypeName === srmTypeName && rewardBalance >= SRM_REWARD_BALANCE) {
                shouldUpdateIsActive = true;
            }

            if (shouldUpdateIsActive) {
                await updateIsActiveWithRetry(poolId, 3);
            } else {
                console.log("❌ Skipping isActive update due to insufficient reward balance.");
            }

            await fetchBalance(coinA, setCoinABalance);
            await fetchBalance(coinB, setCoinBBalance);

        } catch (error: any) {
            console.error("Swap failed:", error.message);
            addLog(`❌ Swap failed: ${error.message}`);
            setTransactionProgress({        
                image: '/images/txn_failed.png',
                text: '',
            });
        } finally {
            setIsProcessing(false);
            if(modalTimer){ 
                clearTimeout(modalTimer);
                setModalTimer(null);
            }
            setModalTimer(setTimeout(()=>{
                setIsModalOpen(false); 
                setDigest('');
            }, 15000))
        }
    };

    const fetchTransactionWithRetry = async (txnDigest: string, retries = 8, delay = 4000) => {
        await new Promise(res => setTimeout(res, 3000)); // ⏳ Initial delay

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                addLog(`🔍 Checking transaction status (Attempt ${attempt})...`);

                const txnDetails = await provider.getTransactionBlock({
                    digest: txnDigest,
                    options: { showEffects: true, showEvents: true },
                });

                if (txnDetails?.effects?.status?.status === "success") {
                    addLog("✅ Transaction confirmed on-chain!");
                    return txnDetails;
                } else if (txnDetails?.effects?.status?.status === "failure") {
                    const errorMessage = txnDetails.effects.status.error || "Unknown error";

                    const moveAbortMatch = errorMessage.match(
                        /MoveAbort\(MoveLocation \{ module: ModuleId \{ address: .*?, name: Identifier\("([^"]+)"\) \}, function: \d+, instruction: \d+, function_name: Some\("([^"]+)"\) \}, (\d+)\)/
                    );

                    if (moveAbortMatch) {
                        const moduleName = moveAbortMatch[1];
                        const functionName = moveAbortMatch[2];
                        const abortCode = parseInt(moveAbortMatch[3]);

                        console.error(`❌ MoveAbort in ${moduleName}::${functionName} - Code: ${abortCode}`);
                        addLog(`❌ MoveAbort in ${moduleName}::${functionName} - Code: ${abortCode}`);

                        if (abortCode === 3) alert("⚠️ Swap failed: Excessive slippage.");
                        else if (abortCode === 4) alert("⚠️ Swap failed: Not enough liquidity.");
                        else alert(`⚠️ Swap failed in ${moduleName}::${functionName} with code ${abortCode}`);
                    } else {
                        alert(`❌ Transaction failed: ${errorMessage}`);
                    }

                    return null;
                }

            } catch (error: any) {
                if (error.message.includes("Could not find the referenced transaction")) {
                    console.warn(`⏳ Transaction not indexed yet. Retrying (Attempt ${attempt})`);
                } else {

                    addLog(`Unexpected error fetching transaction: ${error.message}`);
                    console.error(`❌ Error fetching transaction (Attempt ${attempt}):`, error);
                    return null;
                }
            }

            await new Promise(res => setTimeout(res, delay)); // Wait before retry
        }

        addLog("❌ Transaction confirmation timed out.");
        return null;
    };

    const updateIsActiveWithRetry = async (poolId: string, maxRetries = 3) => {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const response = await fetch("/api/update-pool-activity", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ poolId: String(poolId) }) 
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
                addLog(`❌ Failed to update isActive (Attempt ${attempt + 1}) - ${error.message}`);

                // ✅ If the error is a 409 Conflict, exit gracefully
                if (error.message.includes("HTTP 409")) {
                    console.error("❌ Pool did not meet conditions, stopping retries.");
                    return; 
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

    function calculateEffectiveAmountIn(
        amountIn: number,
        poolStats: PoolStats
    ): number {
        const totalFeesBP =
            100 +
            Number(poolStats.burn_fee) +
            Number(poolStats.creator_royalty_fee) +
            Number(poolStats.lp_builder_fee) +
            Number(poolStats.rewards_fee);

        const netAmountBP = 10_000 - totalFeesBP;

        if (netAmountBP < 0) {
            console.warn("⚠️ Total fees exceed 100%. Returning 0.");
            return 0;
        }

        return (amountIn * netAmountBP) / 10_000;
    }

    return (
        <div className="py-6 w-full max-w-md mx-auto space-y-6 h-full">
            {/* Toggle Buy / Sell */}
            <div className="flex justify-center space-x-4 mb-4">
                <button
                    onClick={() => setIsBuy(true)}
                    className={`px-4 py-2 rounded-none text-sm font-semibold ${isBuy ? 'bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75' : 'bg-[#14110c] hover:bg-slate-600 text-slate-100'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setIsBuy(false)}
                    className={`px-4 py-2 rounded-none text-sm font-semibold ${!isBuy ? 'bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:text-[#61F98A] hover:opacity-75' : 'bg-[#14110c] hover:bg-slate-600 text-slate-100'
                        }`}
                >
                    Sell
                </button>
            </div>

            {/* FROM Section */}
            <div className="space-y-1">
                {/* Label + Coin info */}
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <div className="flex items-center gap-2">
                        <span>From:</span>
                        {isBuy ? (
                            <>
                                {coinA?.image && <Image src={coinA.image} alt={coinA.symbol} width={16} height={16} className="rounded-full" />}
                                <span className="text-slate-300 text-xs">{coinA?.symbol}</span>
                            </>
                        ) : (
                            <>
                                {coinB?.image && <Image src={coinB.image} alt={coinB.symbol} width={16} height={16} className="rounded-full" />}
                                <span className="text-slate-300 text-xs">{coinB?.symbol}</span>
                            </>
                        )}
                    </div>
                    <div>
                        Balance: {isBuy
                            ? (coinABalance / Math.pow(10, coinA?.decimals ?? 9)).toLocaleString(undefined, {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                            })
                            : (coinBBalance / Math.pow(10, coinB?.decimals ?? 9)).toLocaleString(undefined, {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                            })
                        }
                    </div>
                </div>

                {/* Input box */}
                <div className="flex justify-between items-center bg-[#14110c] px-3 py-2">
                    <InputCurrency
                        className="max-w-[240px] flex-1 p-2 outline-none bg-transparent text-3xl sm:text-2xl overflow-hidden grow disabled:text-[#868098]"
                        placeholder="0"
                        value={amountIn}
                        onChange={handleAmountInChange}
                    />
                    <SelectTokenModal
                      className="flex-1 text-end flex justify-end"
                      token={(isBuy ? coinA : coinB) ?? undefined}
                      pivotTokenId={(isBuy ? coinB?.typeName : coinA?.typeName) ?? ''}
                      accountBalancesObj={accountBalancesObj}
                      isIn={true}
                    />
                </div>
            </div>


            {/* Quick % Buttons */}
            <div className="flex justify-between mt-2 mb-4">
                {['25', '50', '75', '100'].map((percent) => (
                    <button
                        key={percent}
                        onClick={() => handleQuickSelect(parseInt(percent))}
                        className="flex-1 text-md mx-1 bg-[#14110c] hover:bg-slate-600 rounded-none px-3 py-1 text-slate-300"
                    >
                        {percent}%
                    </button>
                ))}
            </div>
            <div className="flex justify-center">
                {/* Swap Icon: onclick rotate icon 180 */}
                {isAnyLoading ? (
                    <Spinner />
                ) : (
                    <SRMSwapIcon className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform duration-250 hover:rotate-180 active:rotate-180" onClick={() => setIsBuy(!isBuy)} />
                )}
            </div>

            {/* TO Section */}
            <div className="space-y-1">
                {/* Label + Coin info */}
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <div className="flex items-center gap-2">
                        <span>To:</span>
                        {isBuy ? (
                            <>
                                {coinB?.image && <Image src={coinB.image} alt={coinB.symbol} width={16} height={16} className="rounded-full" />}
                                <span className="text-slate-300 text-xs">{coinB?.symbol}</span>
                            </>
                        ) : (
                            <>
                                {coinA?.image && <Image src={coinA.image} alt={coinA.symbol} width={16} height={16} className="rounded-full" />}
                                <span className="text-slate-300 text-xs">{coinA?.symbol}</span>
                            </>
                        )}
                    </div>
                    <div>
                        Balance: {isBuy
                            ? (coinBBalance / Math.pow(10, coinB?.decimals ?? 9)).toLocaleString(undefined, {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                            })
                            : (coinABalance / Math.pow(10, coinA?.decimals ?? 9)).toLocaleString(undefined, {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                            })
                        }
                    </div>
                </div>

                {/* Input box */}
                <div className="flex justify-between items-center bg-[#14110c] px-3 py-2">
                    <InputCurrency
                        className="max-w-[240px] flex-1 p-2 outline-none bg-transparent text-3xl sm:text-2xl overflow-hidden grow disabled:text-[#868098]"
                        placeholder="0"
                        value={amountOut}
                        disabled
                    />
                    <SelectTokenModal
                      className="flex-1 text-end flex justify-end"
                      token={(isBuy ? coinB : coinA) ?? undefined}
                      pivotTokenId={(isBuy ? coinA?.typeName : coinB?.typeName) ?? ''}
                      accountBalancesObj={accountBalancesObj}
                      isIn={false}
                    />
                </div>
            </div>

            {/* Slippage Setting */}
            <div className="flex items-center justify-end text-slate-400 text-xs mt-4 gap-4">
                <span>Slippage</span>
                <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={slippage}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                            setSlippage(NaN); 
                        } else {
                            const parsed = parseFloat(value);
                            if (!isNaN(parsed)) {
                                setSlippage(parsed);
                            }
                        }
                    }}
                    className="bg-transparent w-16 text-center text-slate-100 outline-none border border-slate-600 py-1
                    appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span>%</span>
            </div>
            {priceImpact <= 5 && (
                <div className={`${getImpactColor(priceImpact)} text-sm text-center mb-2 font-semibold`}>
                    Price Impact Low ({priceImpact.toFixed(2)}%)
                </div>
            )}
            {priceImpact >= 5 && (
                <div className={`${getImpactColor(priceImpact)} text-sm text-center mb-2 font-semibold`}>
                    {priceImpact >= 15
                        ? `❌ Swap blocked: Price impact exceeds 15% (${priceImpact.toFixed(2)}%)`
                        : `⚠️ Price Impact High (${priceImpact.toFixed(2)}%)`}
                </div>
            )}

            {/* Execute Swap Button */}
            <button
                onClick={handleSwap}
                disabled={fetchingQuote || !amountIn || !amountOut || isProcessing || Math.abs(priceImpact) >= 15}

                className={`mt-6 w-full rounded-none ${isProcessing || priceImpact >= 15
                    ? 'bg-gray-500 cursor-not-allowed'
                    : isBuy
                        ? 'bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75' // bg-green-600 hover:bg-green-500
                        : 'bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:text-[#5E21A1] hover:opacity-75'
                    } text-white py-3 font-semibold text-lg transition disabled:opacity-50`}
            >
                {isProcessing
                    ? "Processing..."
                    : Math.abs(priceImpact) >= 15
                        ? "Swap Disabled – High Impact"
                        : Math.abs(priceImpact) >= 5
                            ? "Swap Anyway"
                            : isBuy
                                ? "Buy"
                                : "Sell"}
            </button>
            <TransactionModal open={isModalOpen} transactionProgress={transactionProgress ?? undefined} onClose={() => {
                setIsModalOpen(false);
                if(modalTimer){
                    clearTimeout(modalTimer);
                    setModalTimer(null);
                }
            }} logs={logs} isProcessing={isProcessing} digest={digest} />

        </div>
    );
}