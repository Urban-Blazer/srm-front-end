// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { TransactionBlock } from "@mysten/sui.js/transactions"; // for building tx
import { PACKAGE_ID, DEX_MODULE_NAME, CONFIG_ID } from "../config";
import TransactionModal from "@components/TransactionModal";
import { predefinedCoins } from "../data/coins";


interface SwapInterfaceProps {
    poolId: string | null;
    coinA: CoinMeta | null;
    coinB: CoinMeta | null;
    provider: SuiClient;
    walletAddress: string | null;
    poolStats: PoolStats | null;
    walletAdapter: NightlyConnectSuiAdapter;
}

interface CoinMeta {
    decimals: number;
    image?: string;
    symbol: string;
    typeName: string;
}

interface PoolStats {
    balance_a: number;
    balance_b: number;
    burn_fee: number;
    creator_royalty_fee: number;
    creator_royalty_wallet: string;
    locked_lp_balance: number;
    lp_builder_fee: number;
    reward_balance_a: number;
    rewards_fee: number;
}

const defaultPoolStats: PoolStats = {
    balance_a: 0,
    balance_b: 0,
    burn_fee: 0,
    creator_royalty_fee: 0,
    creator_royalty_wallet: "",
    locked_lp_balance: 0,
    lp_builder_fee: 0,
    reward_balance_a: 0,
    rewards_fee: 0,
};

const SUI_REWARD_BALANCE = 100 * Math.pow(10, 9);  // 100 SUI
const USDC_REWARD_BALANCE = 250 * Math.pow(10, 6); // 250 USDC
const SRM_REWARD_BALANCE = 5 * Math.pow(10, 9);     // 5 SRM (adjust if needed)

export default function SwapInterface({
    poolId,
    coinA,
    coinB,
    provider,
    walletAddress,
    poolStats,
    walletAdapter,
}: SwapInterfaceProps) {
    
    const [isBuy, setIsBuy] = useState(true);
    const [coinABalance, setCoinABalance] = useState<number>(0);
    const [coinBBalance, setCoinBBalance] = useState<number>(0);
    const [amountIn, setAmountIn] = useState<string>("");
    const [amountOut, setAmountOut] = useState<string>("");
    const [fetchingQuote, setFetchingQuote] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const [slippage, setSlippage] = useState<number>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]);
    };

    const fetchBalance = async (token: any, setBalance: (balance: number) => void) => {
        if (!walletAddress || !token) return; // ✅ Check for walletAddress

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
    }, [coinA, coinB, walletAddress]);

    const handleAmountInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmountIn(value);
        if (value && !isNaN(Number(value))) {
            debouncedGetQuote(value, true);
        }
    };

    const handleAmountOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmountOut(value);
        if (value && !isNaN(Number(value))) {
            debouncedGetQuote(value, false); // false = buying CoinB
        }
    };

    // ✅ First define fetchQuote
    const fetchQuote = useCallback(async (amount: string, isSell: boolean) => {
        console.log("🏁 fetchQuote called:", { poolId, coinA, coinB, poolStats, amount, isSell });

        if (!poolId || !coinA || !coinB || !poolStats) return;
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
            console.log("⚡ Fetching quote with params:", queryParams.toString());

            const response = await fetch(`/api/get-quote?${queryParams}`);
            const data = await response.json();

            if (data) {
                if (isSell && data.buyAmount) {
                    setAmountOut(Number(data.buyAmount).toFixed(4));
                } else if (!isSell && data.sellAmount) {
                    setAmountIn(Number(data.sellAmount).toFixed(4));
                }
            }
        } catch (error) {
            console.error("Error fetching quote:", error);
        } finally {
            setFetchingQuote(false);
        }
    }, [poolId, coinA, coinB, poolStats, isBuy]);

    // ✅ THEN define debouncedGetQuote
    const debouncedGetQuote = useCallback((amount: string, isSell: boolean) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            fetchQuote(amount, isSell);
        }, 300);
    }, [fetchQuote]);

    const handleQuickSelect = (percent: number) => {
        const balance = isBuy ? coinABalance : coinBBalance;
        const decimals = isBuy ? coinA?.decimals ?? 9 : coinB?.decimals ?? 9;
        const formattedBalance = balance / Math.pow(10, decimals);

        const amount = (formattedBalance * (percent / 100)).toString();
        setAmountIn(amount);
        debouncedGetQuote(amount, true);
    };

    const handleSwap = async () => {
        if (!walletAddress || !poolId || !coinA || !coinB || !amountIn || !amountOut || !provider) {
            alert("Missing required information for swap.");
            return;
        }

        setLogs([]);
        setIsProcessing(true);
        setIsModalOpen(true);

        try {
            const sellToken = isBuy ? coinA : coinB;
            const buyToken = isBuy ? coinB : coinA;

            const sellDecimals = sellToken.decimals ?? 9;
            const buyDecimals = buyToken.decimals ?? 9;

            const sellAmountU64 = BigInt(Math.floor(Number(amountIn) * Math.pow(10, sellDecimals)));
            const expectedOutU64 = BigInt(Math.floor(Number(amountOut) * Math.pow(10, buyDecimals)));

            const maxSlippageInt = BigInt(Math.floor(Number(slippage) * 100));
            const minOutU64 = expectedOutU64 - (expectedOutU64 * maxSlippageInt / BigInt(10000));

            if (minOutU64 <= 0n) {
                alert("Slippage too high, adjust your slippage setting.");
                setIsProcessing(false);
                return;
            }

            addLog("🔍 Fetching owned coins...");

            const { data: ownedObjects } = await provider.getOwnedObjects({
                owner: walletAddress,
                filter: { StructType: "0x2::coin::Coin" },
                options: { showType: true, showContent: true },
            });

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
                .filter(Boolean);

            const matchingCoin = coins.find(
                (c) => c?.type === sellToken.typeName && c.balance >= sellAmountU64
            );

            if (!matchingCoin) {
                alert("No coin with enough balance to complete the swap.");
                setIsProcessing(false);
                return;
            }

            addLog(`✅ Coin selected: ${matchingCoin.objectId}`);

            // ✅ Determine if pool should be activated
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

            console.log(`🔍 isActive check:
            - Pool CoinA: ${poolCoinATypeName}
            - Reward Balance: ${rewardBalance}
            - Should Update: ${shouldUpdateIsActive}`);

            const txb = new TransactionBlock();
            let usedCoin;

            const SUI_TYPE = "0x2::sui::SUI";
            const isSellingSui = sellToken.typeName === SUI_TYPE;
            const suiCoins = coins.filter((c) => c.type === SUI_TYPE);
            const onlyOneSui = suiCoins.length === 1;
            const singleSuiCoin = suiCoins[0];

            if (isSellingSui && onlyOneSui) {
                if (singleSuiCoin.balance > sellAmountU64 + BigInt(250_000_000)) {
                    txb.setGasPayment([{
                        objectId: singleSuiCoin.objectId,
                        digest: singleSuiCoin.digest,
                        version: singleSuiCoin.version,
                    }]);
                    txb.setGasOwner(walletAddress);

                    const [splitSui] = txb.splitCoins(txb.gas, [txb.pure(sellAmountU64)]);
                    usedCoin = splitSui;

                    addLog("⚡️ Using txb.gas to split sell amount (SUI sell).");
                } else {
                    alert("⚠️ Not enough SUI to cover gas + sell amount.");
                    setIsProcessing(false);
                    setIsModalOpen(false);
                    return;
                }
            } else {
                const coinObject = txb.object(matchingCoin.objectId);
                const [splitCoin] = txb.splitCoins(coinObject, [txb.pure.u64(sellAmountU64)]);
                usedCoin = splitCoin;
            }

            txb.setGasBudget(250_000_000);

            const swapFunction = isBuy
                ? `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_a_for_b_with_coins_and_transfer_to_sender`
                : `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_b_for_a_with_coins_and_transfer_to_sender`;

            const typeArguments = [coinA.typeName, coinB.typeName];

            txb.moveCall({
                target: swapFunction,
                typeArguments,
                arguments: [
                    txb.object(poolId, { mutable: true }),
                    txb.object(CONFIG_ID),
                    usedCoin,
                    txb.pure.u64(sellAmountU64),
                    txb.pure.u64(minOutU64),
                    txb.object("0x6"),
                ],
            });

            addLog("✍️ Signing transaction...");
            const signedTx = await walletAdapter.signTransactionBlock({
                transactionBlock: txb,
                account: walletAddress,
                chain: "sui:mainnet",
            });

            addLog("🚀 Submitting transaction...");
            const executeResponse = await provider.executeTransactionBlock({
                transactionBlock: signedTx.transactionBlockBytes,
                signature: signedTx.signature,
                options: { showEffects: true, showEvents: true },
            });

            const txnDigest = executeResponse.digest;

            if (!txnDigest) {
                throw new Error("Transaction digest missing after submit.");
            }

            addLog(`🔍 Transaction submitted: ${txnDigest}`);
            addLog("⏳ Waiting for confirmation...");

            const confirmed = await fetchTransactionWithRetry(txnDigest);

            if (!confirmed) {
                throw new Error("Transaction not confirmed after submission.");
            }

            addLog("✅ Swap completed successfully!");

            if (shouldUpdateIsActive) {
                console.log(`🔹 Updating isActive for pool ${poolId}...`);
                await updateIsActiveWithRetry(poolId, 3);
            } else {
                console.log("❌ Skipping isActive update due to insufficient reward balance.");
            }

            // 🛠 Refresh Balances
            await fetchBalance(coinA, setCoinABalance);
            await fetchBalance(coinB, setCoinBBalance);

            alert("Swap executed and confirmed!");

        } catch (error: any) {
            console.error("Swap failed:", error.message);
            addLog(`❌ Swap failed: ${error.message}`);
            alert(`Swap failed: ${error.message}`);
        } finally {
            setIsProcessing(false);
            setIsModalOpen(false);
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
                    console.error(`❌ Error fetching transaction (Attempt ${attempt}):`, error);
                    alert(`Unexpected error fetching transaction: ${error.message}`);
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

    return (
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-auto space-y-6">
            {/* Toggle Buy / Sell */}
            <div className="flex justify-center space-x-4 mb-4">
                <button
                    onClick={() => setIsBuy(true)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${isBuy ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setIsBuy(false)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${!isBuy ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
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
                                {coinA?.image && <img src={coinA.image} alt={coinA.symbol} className="w-4 h-4 rounded-full" />}
                                <span className="text-slate-300 text-xs">{coinA?.symbol}</span>
                            </>
                        ) : (
                            <>
                                {coinB?.image && <img src={coinB.image} alt={coinB.symbol} className="w-4 h-4 rounded-full" />}
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
                <div className="flex items-center bg-slate-700 rounded px-3 py-2">
                    <input
                        type="number"
                        placeholder="0.0"
                        value={amountIn}
                        onChange={handleAmountInChange}
                        className="bg-transparent text-slate-100 w-full outline-none text-lg text-right
             appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
            </div>


            {/* Quick % Buttons */}
            <div className="flex justify-between mt-2 mb-4">
                {['25', '50', '75', '100'].map((percent) => (
                    <button
                        key={percent}
                        onClick={() => handleQuickSelect(parseInt(percent))}
                        className="flex-1 text-xs mx-1 bg-slate-700 hover:bg-slate-600 rounded-full px-3 py-1 text-slate-300"
                    >
                        {percent}%
                    </button>
                ))}
            </div>

            {/* TO Section */}
            <div className="space-y-1">
                {/* Label + Coin info */}
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <div className="flex items-center gap-2">
                        <span>To:</span>
                        {isBuy ? (
                            <>
                                {coinB?.image && <img src={coinB.image} alt={coinB.symbol} className="w-4 h-4 rounded-full" />}
                                <span className="text-slate-300 text-xs">{coinB?.symbol}</span>
                            </>
                        ) : (
                            <>
                                {coinA?.image && <img src={coinA.image} alt={coinA.symbol} className="w-4 h-4 rounded-full" />}
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
                <div className="flex items-center bg-slate-700 rounded px-3 py-2">
                    <input
                        type="number"
                        placeholder="0.0"
                        value={amountOut}
                        onChange={handleAmountOutChange}
                        className="bg-transparent text-slate-100 w-full outline-none text-lg text-right
             appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
            </div>

            {/* Slippage Setting */}
            <div className="flex items-center justify-between text-slate-400 text-xs mt-4">
                <span>Slippage</span>
                <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={slippage}
                    onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) setSlippage(value);
                    }}
                    className="bg-transparent w-16 text-center text-slate-100 outline-none border border-slate-600 rounded py-1
                    appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span>%</span>
            </div>

            {/* Execute Swap Button */}
            <button
                onClick={handleSwap}
                disabled={fetchingQuote || !amountIn || !amountOut || isProcessing}
                className={`mt-6 w-full ${isBuy ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} 
    text-white py-3 rounded-lg font-semibold text-lg transition disabled:opacity-50`}
            >
                {isProcessing ? "Processing..." : isBuy ? "Buy" : "Sell"}
            </button>
            <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} isProcessing={isProcessing} />

        </div>
    );
}
