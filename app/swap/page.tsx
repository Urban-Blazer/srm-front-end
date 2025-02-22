"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC, PACKAGE_ID, QUOTE_MODULE_NAME, CONFIG_ID } from "../config";
import TokenSelector from "@components/tokenSelector"
import CopyIcon from "@svg/copy-icon.svg";

const provider = new SuiClient({ url: GETTER_RPC });

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
    const [maxSlippage, setMaxSlippage] = useState("0.5"); // Default slippage at 0.5%
    const [isAtoB, setIsAtoB] = useState<boolean | null>(null); // Track if swapping A -> B or B -> A
    const [fetchingQuote, setFetchingQuote] = useState(false); // Track loading state for quote

    // ✅ Debounce Timer Ref
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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

    useEffect(() => {
        const initWallet = async () => {
            try {
                if (!walletAdapterRef.current) {
                    const adapter = await NightlyConnectSuiAdapter.build({
                        appMetadata: {
                            name: "Sui DEX",
                            description: "DEX for trading tokens on Sui",
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

            console.log("🌐 Raw Pool Metadata Response:", data); // 🔍 Debugging Step

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
                    dev_royalty_fee: fields.dev_royalty_fee || 0,
                    dev_wallet: fields.dev_wallet || "",
                    locked_lp_balance: fields.locked_lp_balance || 0,
                    lp_builder_fee: fields.lp_builder_fee || 0,
                    reward_balance_a: fields.reward_balance_a || 0,
                    rewards_fee: fields.rewards_fee || 0,
                });
            } else {
                console.warn("Missing pool fields:", poolObject);
                setPoolStats({
                    balance_a: 0, balance_b: 0, burn_balance_b: 0, burn_fee: 0,
                    dev_royalty_fee: 0, dev_wallet: "", locked_lp_balance: 0,
                    lp_builder_fee: 0, reward_balance_a: 0, rewards_fee: 0
                });
            }
        } catch (error) {
            console.error("Error fetching pool stats:", error);
            setPoolStats({
                balance_a: 0, balance_b: 0, burn_balance_b: 0, burn_fee: 0,
                dev_royalty_fee: 0, dev_wallet: "", locked_lp_balance: 0,
                lp_builder_fee: 0, reward_balance_a: 0, rewards_fee: 0
            });
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

            setBalance(Number(totalBalance) / 1_000_000_000); // Convert from MIST (10⁹)
            console.log(`${token.symbol} Balance:`, Number(totalBalance) / 1_000_000_000);
        } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            setBalance(0);
        }
    };

    // ✅ Fetch balances whenever `sellToken` or `buyToken` changes
    useEffect(() => {
        if (sellToken && !fetchingQuote) fetchBalance(sellToken, setSellBalance);
    }, [sellToken, walletAddress, fetchingQuote]);

    useEffect(() => {
        if (buyToken && !fetchingQuote) fetchBalance(buyToken, setBuyBalance);
    }, [buyToken, walletAddress, fetchingQuote]);

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

        if (!poolId || isAtoB === null || !amount || !sellToken || !buyToken || !poolStats) return;

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

            const amountU64 = Number(amount) > 0 ? Math.floor(Number(amount) * 1_000_000_000) : 0;

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
                devRoyaltyFee: poolStats.dev_royalty_fee?.toString() || "0",
                rewardsFee: poolStats.rewards_fee?.toString() || "0",
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

    return (
        <div className="min-h-screen flex flex-col lg:flex-row justify-center items-center bg-gray-100 p-4 pb-20 overflow-y-auto">

            {/* Swap Interface */}
            <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 relative">
                <div className="flex flex-col space-y-4 pb-24">
                    <h2 className="text-xl font-bold text-center">Swap Tokens</h2>

                    {/* Max Slippage Input */}
                    <div className="bg-gray-100 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <label className="text-gray-600 font-medium">Max Slippage</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={maxSlippage}
                                    onChange={(e) => setMaxSlippage(parseFloat(e.target.value))}
                                    className="bg-white text-black text-right font-semibold px-3 py-1 border border-gray-300 rounded-lg w-20 outline-none"
                                />
                                <span className="text-gray-500">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Sell Input */}
                    <div className="bg-gray-100 p-4 rounded-lg relative">
                        <div className="flex justify-between items-center">
                            <label htmlFor="sellAmount" className="block text-gray-500">Sell</label>
                            {sellToken && <span className="text-sm text-gray-600">Balance: {sellBalance}</span>}
                        </div>

                        <div className="flex items-center justify-between">
                            <input
                                id="sellAmount"
                                name="sellAmount"
                                type="number"
                                className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                placeholder="0"
                                value={sellAmount}
                                onChange={handleSellAmountChange}
                                disabled={fetchingQuote}
                            />
                            {/* Sell Token Selection Button */}
                            <button
                                className="flex items-center justify-between w-32 bg-white border rounded-lg px-3 py-2 shadow hover:bg-gray-100"
                                onClick={() => setDropdownOpen(dropdownOpen === "sell" ? null : "sell")}
                            >
                                {sellToken ? (
                                    <div className="flex items-center">
                                        <img src={sellToken.logo} alt={sellToken.symbol} className="w-5 h-5 mr-2" />
                                        <span className="text-black font-medium">{sellToken.symbol}</span>
                                    </div>
                                ) : (
                                    <span className="text-black font-medium">Select Token</span>
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

                    {/* Swap Arrow */}
                    <div className="flex justify-center">
                        <button
                            className="bg-gray-200 p-2 rounded-full transition hover:bg-gray-300"
                            onClick={handleSwapTokens}
                        >
                            ⬇️
                        </button>
                    </div>

                    {/* Buy Input */}
                    <div className="bg-gray-100 p-4 rounded-lg relative">
                        <div className="flex justify-between items-center">
                            <label htmlFor="buyAmount" className="block text-gray-500">Buy</label>
                            {buyToken && <span className="text-sm text-gray-600">Balance: {buyBalance}</span>}
                        </div>

                        <div className="flex items-center justify-between">
                            <input
                                id="buyAmount"
                                name="buyAmount"
                                type="number"
                                className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                placeholder="0"
                                value={buyAmount}
                                onChange={handleBuyAmountChange}
                                disabled={fetchingQuote}
                            />
                            {/* Buy Token Selection Button */}
                            <button
                                className="flex items-center justify-between w-32 bg-white border rounded-lg px-3 py-2 shadow hover:bg-gray-100"
                                onClick={() => setDropdownOpen(dropdownOpen === "buy" ? null : "buy")}
                            >
                                {buyToken ? (
                                    <div className="flex items-center">
                                        <img src={buyToken.logo} alt={buyToken.symbol} className="w-5 h-5 mr-2" />
                                        <span className="text-black font-medium">{buyToken.symbol}</span>
                                    </div>
                                ) : (
                                    <span className="text-black font-medium">Select Token</span>
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

                    {/* Swap Button */}
                    <button
                        className={`w-full text-white p-3 rounded-lg ${walletConnected && sellToken && buyToken ? "bg-black" : "bg-gray-300 cursor-not-allowed"
                            }`}
                        onClick={!walletConnected ? () => walletAdapter?.connect() : () => console.log("Swap Executed")}
                        disabled={fetchingQuote || walletConnected && (!sellToken || !buyToken)}
                    >
                        {fetchingQuote ? "Fetching Quote..." : walletConnected ? "Swap" : "Connect Wallet"}
                    </button>
                </div>
            </div>

            {/* Pool Information Card */}
            <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 mt-6 lg:mt-0 lg:ml-6">
                <h2 className="text-lg font-bold mb-4 text-black">Pool Information</h2>

                {poolLoading ? (
                    <p className="text-gray-500">Loading pool data...</p>
                ) : poolId ? (
                    <>
                        {/* ✅ Pool ID with Copy Button */}
                        <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg overflow-x-auto">
                            <p className="text-black truncate">
                                <strong>Pool ID:</strong> {poolId}
                            </p>
                            <button
                                onClick={() => navigator.clipboard.writeText(poolId)}
                                className="p-2 rounded-lg hover:bg-gray-200 transition"
                            >
                                <CopyIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ✅ Prevent rendering if `poolStats` or `poolMetadata` is missing */}
                        {poolStats && poolMetadata ? (
                            <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pb-20">
                                {/* ✅ Display Coin A Metadata with Balance */}
                                <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg text-black">
                                    <div className="flex items-center space-x-3">
                                        {poolMetadata?.coinA?.image && (
                                            <img src={poolMetadata?.coinA?.image} alt={poolMetadata?.coinA?.symbol} className="w-8 h-8 rounded-full" />
                                        )}
                                        <p className="text-lg font-semibold">
                                            {poolMetadata?.coinA?.symbol} ({poolMetadata?.coinA?.name})
                                        </p>
                                    </div>
                                    <p className="text-lg font-semibold">
                                        {(
                                            Number(poolStats?.balance_a || 0) /
                                            Math.pow(10, Number(poolMetadata?.coinA?.decimals || 0))
                                        ).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: Number(poolMetadata?.coinA?.decimals || 2),
                                        })}
                                    </p>
                                </div>

                                {/* ✅ Display Coin B Metadata with Balance */}
                                <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg text-black">
                                    <div className="flex items-center space-x-3">
                                        {poolMetadata?.coinB?.image && (
                                            <img src={poolMetadata?.coinB?.image} alt={poolMetadata?.coinB?.symbol} className="w-8 h-8 rounded-full" />
                                        )}
                                        <p className="text-lg font-semibold">
                                            {poolMetadata?.coinB?.symbol} ({poolMetadata?.coinB?.name})
                                        </p>
                                    </div>
                                    <p className="text-lg font-semibold">
                                        {(
                                            Number(poolStats?.balance_b || 0) /
                                            Math.pow(10, Number(poolMetadata?.coinB?.decimals || 0))
                                        ).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: Number(poolMetadata?.coinB?.decimals || 2),
                                        })}
                                    </p>
                                </div>

                                {/* ✅ Pool Stats Section */}
                                <div className="text-black space-y-2">
                                    {/* ✅ LP Locked Balance Now Always Visible */}
                                    <p><strong>Pool Locked LP:</strong> {poolStats?.locked_lp_balance?.toLocaleString() || "0"}</p>
                                    
                                    <p><strong>Pool Locked Coins:</strong> {(
                                        Number(poolStats?.burn_balance_b || 0) /
                                        Math.pow(10, Number(poolMetadata?.coinB?.decimals || 0))
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: Number(poolMetadata?.coinB?.decimals || 2),
                                    })} {poolMetadata?.coinB?.symbol}</p>

                                    <p><strong>Reward Balance:</strong> {(
                                        Number(poolStats?.reward_balance_a || 0) /
                                        Math.pow(10, Number(poolMetadata?.coinA?.decimals || 0))
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: Number(poolMetadata?.coinA?.decimals || 2),
                                    })} {poolMetadata?.coinA?.symbol}</p>

                                    {/* ✅ Correctly formatted fees as percentages */}
                                    <p><strong>LP Builder Fee:</strong> {((poolStats?.lp_builder_fee || 0) / 100).toFixed(2)}%</p>
                                    <p><strong>Reward Fee:</strong> {((poolStats?.rewards_fee || 0) / 100).toFixed(2)}%</p>
                                    <p><strong>Burn Fee:</strong> {((poolStats?.burn_fee || 0) / 100).toFixed(2)}%</p>
                                    <p><strong>Deployer Royalty Fee:</strong> {((poolStats?.dev_royalty_fee || 0) / 100).toFixed(2)}%</p>
                                    
                                    {/* ✅ Dev Wallet with Copy Button */}
                                    <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg overflow-x-auto">
                                        <p className="text-black truncate">
                                            <strong>Deployer Royalty Wallet:</strong> {poolStats?.dev_wallet || ""}
                                        </p>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(poolStats?.dev_wallet || "")}
                                            className="p-2 rounded-lg hover:bg-gray-200 transition"
                                        >
                                            <CopyIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-500 mt-4">Pool Data Not Available</p>
                        )}
                    </>
                ) : (
                    <p className="text-red-500">Pool Does Not Exist</p>
                )}
            </div>

        </div>
    );
}
