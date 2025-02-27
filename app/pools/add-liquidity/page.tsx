"use client";
import { useReducer, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StepIndicator from "@components/AddLiquidityStepIndicator"; // ✅ Step Indicator
import { predefinedCoins } from "@data/coins";
import { SuiClient } from "@mysten/sui.js/client";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME, CONFIG_ID } from "../../config";
import TransactionModal from "@components/TransactionModal";
import { useSearchParams } from "next/navigation";

const provider = new SuiClient({ url: GETTER_RPC });

const initialState = {
    selectedCoin: predefinedCoins[0], // CoinA
    customCoin: "", // CoinB (user input)
    poolData: null, // Stores Pool ID & Coin Metadata
    dropdownCoinMetadata: null, // ✅ Stores metadata for dropdown-selected coin
    customCoinMetadata: null, // ✅ Stores metadata for custom coin
    depositDropdownCoin: "", // ✅ Amount of CoinA user wants to deposit
    depositCustomCoin: "", // ✅ Amount of CoinB user wants to deposit
    loading: false,
    step: 1, // ✅ Default to Step 1
    poolChecked: false, // ✅ Track if the pool check was done
    dropdownOpen: false, // ✅ Track dropdown state
    poolStats: null,
    liquidityData: null,
    slippageTolerance: 0.5,
};

function reducer(state: any, action: any) {
    switch (action.type) {
        case "SET_METADATA":
            return {
                ...state,
                dropdownCoinMetadata: action.payload.dropdown,
                customCoinMetadata: action.payload.custom
            };
        case "SET_DEPOSIT_DROPDOWN":
            return { ...state, depositDropdownCoin: action.payload };
        case "SET_DEPOSIT_CUSTOM":
            return { ...state, depositCustomCoin: action.payload };
        case "SET_STEP":
            return { ...state, step: action.payload };
        case "SET_POOL_DATA":
            return { ...state, poolData: action.payload, poolChecked: true };
        case "SET_LOADING":
            return { ...state, loading: action.payload };
        case "TOGGLE_DROPDOWN":
            return { ...state, dropdownOpen: !state.dropdownOpen };
        case "SET_COIN":
            return { ...state, selectedCoin: action.payload, dropdownOpen: false };
        case "SET_CUSTOM_COIN":
            return { ...state, customCoin: action.payload };
        case "SET_POOL_STATS":
            return { ...state, poolStats: action.payload };
        case "SET_LIQUIDITY_DATA":
            return { ...state, liquidityData: action.payload };
        case "SET_SLIPPAGE":
            return { ...state, slippageTolerance: action.payload };
        default:
            return state;
    }
}

export default function AddLiquidity() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const router = useRouter();
    const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    const [logs, setLogs] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const searchParams = useSearchParams();
    const coinA = searchParams.get("coinA");
    const coinB = searchParams.get("coinB");

    useEffect(() => {
        if (coinA && coinB) {
            const predefinedCoin = predefinedCoins.find((c) => c.typeName === coinA) || predefinedCoins[0];

            dispatch({ type: "SET_COIN", payload: predefinedCoin });
            dispatch({ type: "SET_CUSTOM_COIN", payload: coinB });

        }
    }, [coinA, coinB]);

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
    };

    // ✅ Initialize Nightly Connect Adapter
    useEffect(() => {
        const initWallet = async () => {
            try {
                const adapter = await NightlyConnectSuiAdapter.build({
                    appMetadata: {
                        name: "Sui DEX",
                        description: "DEX for trading tokens on Sui",
                        icon: "https://your-app-logo-url.com/icon.png",
                    },
                });

                setWalletAdapter(adapter);

                // ✅ Manually request connection before fetching accounts
                await adapter.connect(); // 🔥 Ensure wallet is connected

                // ✅ Fetch accounts after ensuring connection
                const accounts = await adapter.getAccounts();
                console.log("Nightly Connect Accounts:", accounts);

                if (accounts.length > 0) {
                    console.log("Wallet detected:", accounts[0]);
                    setWalletConnected(true);
                    setWalletAddress(accounts[0]); // Set wallet address properly
                } else {
                    console.warn("No accounts found from Nightly Connect.");
                }

                // ✅ Handle wallet connection events
                adapter.on("connect", async (account) => {
                    console.log("Wallet connected:", account);
                    setWalletConnected(true);
                    setWalletAddress(account);
                });

                // ✅ Handle wallet disconnection
                adapter.on("disconnect", () => {
                    console.log("Wallet disconnected");
                    setWalletConnected(false);
                    setWalletAddress(null);
                });

            } catch (error) {
                console.error("Failed to initialize Nightly Connect:", error);
            }
        };

        initWallet();
    }, []);

    // ✅ Fetch Pool Data
    const fetchPoolData = async () => {
        if (!state.customCoin.trim()) {
            alert("Please enter a valid token type for CoinB.");
            return;
        }

        dispatch({ type: "SET_LOADING", payload: true });

        try {
            const tokenPair = `${state.selectedCoin.typeName}-${state.customCoin.trim()}`;
            const res = await fetch(`/api/get-pool-id?tokenPair=${tokenPair}`);
            const data = await res.json();

            if (res.ok) {
                dispatch({
                    type: "SET_POOL_DATA",
                    payload: data,
                });

                // ✅ Ensure custom coin metadata is stored correctly
                dispatch({
                    type: "SET_METADATA",
                    payload: {
                        dropdown: state.selectedCoin,
                        custom: {
                            ...data.coinB_metadata,
                            typeName: state.customCoin.trim(), // Ensure correct typeName
                        },
                    },
                });
            } else {
                dispatch({ type: "SET_POOL_DATA", payload: null });
            }
        } catch (error) {
            console.error("Error fetching pool data:", error);
            alert("Failed to fetch pool info.");
        }

        dispatch({ type: "SET_LOADING", payload: false });
    };

    //Fetch Pool Stats
    const fetchPoolStats = async (poolObjectId) => {
        if (!poolObjectId) return;

        console.log("Fetching Pool Stats with ID:", poolObjectId);
        dispatch({ type: "SET_POOL_STATS", payload: null });

        try {
            const poolObject = await provider.getObject({
                id: poolObjectId,
                options: { showContent: true },
            });

            console.log("Pool Object Response:", poolObject);

            if (poolObject?.data?.content?.fields) {
                const fields = poolObject.data.content.fields;

                dispatch({
                    type: "SET_POOL_STATS",
                    payload: {
                        balance_a: fields.balance_a || 0,
                        balance_b: fields.balance_b || 0,
                        lp_supply: fields.lp_supply?.fields?.value || 0,
                        burn_balance_b: fields.burn_balance_b || 0,
                        burn_fee: fields.burn_fee || 0,
                        dev_royalty_fee: fields.dev_royalty_fee || 0,
                        dev_wallet: fields.dev_wallet || "",
                        locked_lp_balance: fields.locked_lp_balance || 0,
                        lp_builder_fee: fields.lp_builder_fee || 0,
                        reward_balance_a: fields.reward_balance_a || 0,
                        rewards_fee: fields.rewards_fee || 0,
                    },
                });
            } else {
                console.warn("Missing pool fields:", poolObject);
                dispatch({
                    type: "SET_POOL_STATS",
                    payload: {
                        balance_a: 0, balance_b: 0, burn_balance_b: 0, burn_fee: 0,
                        dev_royalty_fee: 0, dev_wallet: "", locked_lp_balance: 0,
                        lp_builder_fee: 0, reward_balance_a: 0, rewards_fee: 0
                    },
                });
            }
        } catch (error) {
            console.error("Error fetching pool stats:", error);
            alert("⚠️ Failed to fetch pool stats. Please try again.");
            dispatch({
                type: "SET_POOL_STATS",
                payload: {
                    balance_a: 0, balance_b: 0, burn_balance_b: 0, burn_fee: 0,
                    dev_royalty_fee: 0, dev_wallet: "", locked_lp_balance: 0,
                    lp_builder_fee: 0, reward_balance_a: 0, rewards_fee: 0
                },
            });
        }
    };

    const calculateMinLP = (depositA_MIST, depositB_MIST, poolStats, slippageTolerance) => {
        if (!poolStats || poolStats.lp_supply === 0) {
            return BigInt(0); // If LP supply is 0, it's the first liquidity provider.
        }

        // ✅ Convert pool balances and LP supply to BigInt (since they are stored as numbers)
        const lpSupply = BigInt(poolStats.lp_supply);
        const poolA = BigInt(poolStats.balance_a);
        const poolB = BigInt(poolStats.balance_b);

        if (poolA === BigInt(0) || poolB === BigInt(0)) {
            return BigInt(0); // Prevent division by zero if pool is empty.
        }

        // ✅ Ensure deposit amounts are also BigInt
        const depositA = BigInt(depositA_MIST);
        const depositB = BigInt(depositB_MIST);

        // ✅ Calculate expected LP tokens for both coins
        const expectedLP_A = (lpSupply * depositA) / poolA;
        const expectedLP_B = (lpSupply * depositB) / poolB;

        // ✅ Find the smaller value (to match the smallest contribution)
        const minExpectedLP = BigInt(Math.min(Number(expectedLP_A), Number(expectedLP_B)));

        // ✅ Convert slippageTolerance into a `BigInt`-compatible scaling factor
        const slippageFactor = BigInt(Math.floor((1 - slippageTolerance / 100) * 1_000_000));

        // ✅ Apply slippage tolerance correctly using only BigInt values
        const minLP = (minExpectedLP * slippageFactor) / BigInt(1_000_000);

        return minLP;
    };

    // ✅ Handle CoinA Deposit Input
    const handleCoinAChange = (value: string) => {
        if (!state.poolStats) return;

        const amountA = parseFloat(value) || 0;
        const balanceA = state.poolStats.balance_a / 1e9; // Convert from MIST
        const balanceB = state.poolStats.balance_b / 1e9; // Convert from MIST

        const amountB = balanceA > 0 ? (amountA * balanceB) / balanceA : 0; // Formula

        dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: value });
        dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: amountB.toFixed(4) });
    };

    // ✅ Handle CoinB Deposit Input
    const handleCoinBChange = (value: string) => {
        if (!state.poolStats) return;

        const amountB = parseFloat(value) || 0;
        const balanceA = state.poolStats.balance_a / 1e9; // Convert from MIST
        const balanceB = state.poolStats.balance_b / 1e9; // Convert from MIST

        const amountA = balanceB > 0 ? (amountB * balanceA) / balanceB : 0; // Formula

        dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: value });
        dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: amountA.toFixed(4) });
    };

    // ✅ Function to Handle Add Liquidity Transaction
    const handleAddLiquidity = async () => {
        setIsModalOpen(true);
        setTimeout(() => setLogs([]), 100); // Slight delay to ensure UI updates

        if (!walletConnected || !walletAddress || !walletAdapter) {
            alert("⚠️ Please connect your wallet first.");
            return;
        }

        try {
            dispatch({ type: "SET_LOADING", payload: true });

            const accounts = await walletAdapter.getAccounts();
            const userAddress = accounts[0]?.address;

            if (!userAddress) {
                alert("⚠️ No accounts found. Please reconnect your wallet.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            if (!state.poolData?.poolId || !state.dropdownCoinMetadata?.typeName || !state.customCoinMetadata?.typeName) {
                alert("⚠️ Missing pool or coin metadata. Please restart the process.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            console.log("✅ Pool ID:", state.poolData.poolId);
            console.log("✅ Coin Types:", state.dropdownCoinMetadata.typeName, state.customCoinMetadata.typeName);

            // ✅ Fetch Owned Coins
            const { data: ownedObjects } = await provider.getOwnedObjects({
                owner: userAddress,
                filter: { StructType: "0x2::coin::Coin" },
                options: { showType: true, showContent: true },
            });

            console.log("🔍 Owned Coin Objects:", ownedObjects);

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
                    };
                })
                .filter(Boolean);

            console.log("🔍 Extracted Coins with Balances:", coins);

            // ✅ Find Matching Coin Objects
            const expectedCoinA = state.dropdownCoinMetadata.typeName;
            const expectedCoinB = state.customCoinMetadata.typeName;
            const coinA = coins.find((c) => c.type === expectedCoinA);
            const coinB = coins.find((c) => c.type === expectedCoinB);

            if (!coinA || !coinB) {
                alert("⚠️ Missing coin objects. Ensure you have the required tokens in your wallet.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            console.log("✅ Selected Coin Objects:", { coinA, coinB });

            // ✅ Convert Deposit Amounts to MIST (Multiply by 1e9)
            const depositA_MIST = BigInt(Math.floor(parseFloat(state.depositDropdownCoin) * 1_000_000_000));
            const depositB_MIST = BigInt(Math.floor(parseFloat(state.depositCustomCoin) * 1_000_000_000));

            console.log("💰 Deposit Amounts (in MIST):", depositA_MIST.toString(), depositB_MIST.toString());

            // ✅ Ensure User Has Enough Balance
            if (coinA.balance < depositA_MIST || coinB.balance < depositB_MIST) {
                alert("⚠️ Insufficient token balance in wallet.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            addLog("✅ Balance Check Passed!");

            // ✅ Get user-selected slippage
            const userSlippageTolerance = state.slippageTolerance || 0.5;

            // ✅ Calculate minimum LP tokens expected
            const minLpOut = calculateMinLP(depositA_MIST, depositB_MIST, state.poolStats, userSlippageTolerance);
            addLog("✅ Calculated min_lp_out:");
            console.log("✅ Calculated min_lp_out:", minLpOut.toString());

            // ✅ Build Transaction Block
            const txb = new TransactionBlock();
            txb.setGasBudget(1_000_000_000);

            txb.moveCall({
                target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::add_liquidity_with_coins_and_transfer_to_sender`,
                typeArguments: [expectedCoinA, expectedCoinB],
                arguments: [
                    txb.object(state.poolData.poolId), // Pool ID
                    txb.object(coinA.objectId), // Coin A Object
                    txb.pure.u64(depositA_MIST),
                    txb.object(coinB.objectId), // Coin B Object
                    txb.pure.u64(depositB_MIST),
                    txb.pure.u64(minLpOut), // Minimum LP Tokens (0 for now)
                ],
            });

            // ✅ Sign Transaction
            addLog("✍️ Signing transaction...");
            const signedTx = await walletAdapter.signTransactionBlock({
                transactionBlock: txb,
                account: userAddress,
                chain: "sui:devnet",
            });

            addLog("✅ Transaction Signed!");

            // ✅ Submit Transaction
            addLog("🚀 Submitting transaction...");
            const executeResponse = await provider.executeTransactionBlock({
                transactionBlock: signedTx.transactionBlockBytes,
                signature: signedTx.signature,
                options: { showEffects: true, showEvents: true },
            });

            addLog("✅ Transaction Submitted!");

            // ✅ Track Transaction Digest
            const txnDigest = executeResponse.digest;
            addLog(`🔍 Transaction Digest: ${txnDigest}`);

            if (!txnDigest) {
                alert("Transaction failed. Please check the console.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            // ✅ Wait for Transaction Confirmation
            addLog("🕒 Waiting for confirmation...");
            let txnDetails = await fetchTransactionWithRetry(txnDigest);

            if (!txnDetails) {
                alert("Transaction not successful. Please retry.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            addLog("✅ Transaction Confirmed!");

            // ✅ Extract LiquidityAdded Event
            // ✅ Extract LiquidityAdded Event
            let liquidityEvent = txnDetails.events?.find((event) =>
                event.type.includes("LiquidityAdded")
            );

            if (!liquidityEvent) {
                console.warn(`⚠️ LiquidityAdded event missing! Retrying...`);
                await new Promise((res) => setTimeout(res, 5000));
                txnDetails = await fetchTransactionWithRetry(txnDigest);
                liquidityEvent = txnDetails?.events?.find((event) => event.type.includes("LiquidityAdded"));
            }

            if (!liquidityEvent) {
                alert("⚠️ Liquidity addition event missing. Please verify manually.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            // ✅ Extract Liquidity Event Data
            const liquidityData = liquidityEvent.parsedJson;
            if (!liquidityData) {
                alert("⚠️ Event detected but no data available.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            console.log("✅ Liquidity Event Data:", liquidityData);

            // ✅ Store LP Minted Data in State
            dispatch({
                type: "SET_LIQUIDITY_DATA",
                payload: {
                    poolId: liquidityData.pool_id, // Pool ID
                    coinA: liquidityData.a, // Coin A Type
                    coinB: liquidityData.b, // Coin B Type
                    depositA: parseFloat(liquidityData.amountin_a) / 1e9, // Convert from MIST
                    depositB: parseFloat(liquidityData.amountin_b) / 1e9, // Convert from MIST
                    lpMinted: parseFloat(liquidityData.lp_minted) / 1e9, // Convert from MIST
                    txnDigest: txnDigest, // Store Transaction Digest
                },
            });

            addLog("✅ Liquidity Successfully Added!");
            dispatch({ type: "SET_STEP", payload: 3 });

        } catch (error) {
            console.error("❌ Transaction failed:", error);
            alert("Transaction failed. Check the console.");
        } finally {
            dispatch({ type: "SET_LOADING", payload: false });
            setTimeout(() => setIsModalOpen(false), 5000);
        }
    };

    const fetchTransactionWithRetry = async (txnDigest, retries = 20, delay = 5000) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🔍 Attempt ${attempt}: Fetching transaction details for digest: ${txnDigest}`);
                const txnDetails = await provider.getTransactionBlock({
                    digest: txnDigest,
                    options: { showEffects: true, showEvents: true },
                });

                if (txnDetails) {
                    console.log("✅ Full Transaction Details:", txnDetails);

                    if (txnDetails.effects && txnDetails.effects.status) {
                        console.log("📡 Transaction Status:", txnDetails.effects.status);

                        if (txnDetails.effects.status.status === "success") {
                            return txnDetails; // ✅ Transaction confirmed
                        } else {
                            console.error("❌ Transaction Failed!", txnDetails.effects.status.error);
                            return null; // ❌ Stop if transaction failed
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`, error);
                await new Promise((res) => setTimeout(res, delay));
            }
        }

        console.error("❌ All retry attempts failed. Transaction might not be indexed yet.");
        return null;  
    }; 


    return (
        <div className="flex h-screen bg-gray-100 p-6 pb-20 overflow-y-auto">
            <StepIndicator step={state.step} setStep={(step) => dispatch({ type: "SET_STEP", payload: step })} />

            <div className="flex-1 bg-white p-8 rounded-lg shadow-lg overflow-y-auto max-h-full">
                <h1 className="text-2xl font-bold mb-6">Create a New Pool</h1>

                {/* Step 1: Select Coins */}
                {state.step === 1 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Select Coin Pair</h2>

                        {/* Dropdown for Predefined Coins */}
                        <div className="mb-4 relative">
                            <label className="block text-gray-700 mb-2">Select First Coin:</label>
                            <button className="w-full flex items-center justify-between p-2 border rounded-lg bg-white text-black"
                                onClick={() => dispatch({ type: "TOGGLE_DROPDOWN" })}
                            >
                                <div className="flex items-center space-x-2">
                                    <img src={state.selectedCoin.logo} alt={state.selectedCoin.symbol} className="w-6 h-6 rounded-full" />
                                    <span>{state.selectedCoin.symbol}</span>
                                </div>
                                <span className="text-gray-600">▼</span>
                            </button>

                            {state.dropdownOpen && (
                                <div className="absolute left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-10">
                                    {predefinedCoins.map((coin) => (
                                        <div key={coin.symbol} className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                                            onClick={() => dispatch({ type: "SET_COIN", payload: coin })}
                                        >
                                            <img src={coin.logo} alt={coin.symbol} className="w-6 h-6 rounded-full" />
                                            <span className="ml-2">{coin.symbol}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Input field for custom coin */}
                        <div className="mb-4">
                            <label className="block text-gray-700">Enter Second Coin Type:</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg text-black placeholder-gray-500"
                                placeholder="Enter coin type (e.g., 0x2::sui::SUI)"
                                value={state.customCoin}
                                onChange={(e) => dispatch({ type: "SET_CUSTOM_COIN", payload: e.target.value })}
                            />
                        </div>

                        {/* Display Pool Info */}
                        <div className="mt-6 p-4 border rounded-lg bg-gray-50 overflow-hidden">
                            {!state.poolChecked ? (
                                <p className="text-gray-600">Select your coin pair</p>
                            ) : state.poolData ? (
                                <div>
                                    <p className="text-black text-sm font-semibold break-all">
                                        Pool ID: <span className="text-gray-700 text-xs">{state.poolData.poolId}</span>
                                    </p>
                                    <div className="flex items-center space-x-4 mt-2">
                                        {/* CoinA */}
                                        <div className="flex items-center space-x-2">
                                            <img
                                                src={state.selectedCoin.logo}
                                                alt={state.selectedCoin.symbol}
                                                className="w-6 h-6 rounded-full"
                                            />
                                            <span className="text-black text-sm font-medium">{state.selectedCoin.symbol}</span>
                                        </div>
                                        <span className="text-gray-500">+</span>
                                            {/* CoinB */}
                                            <div className="flex items-center space-x-2">
                                                <img
                                                    src={state.customCoinMetadata?.image || "/default-coin.png"}
                                                    alt={state.customCoinMetadata?.symbol || "Token"}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                                <span className="text-black text-sm font-medium">
                                                    {state.customCoinMetadata?.symbol ? state.customCoinMetadata.symbol : "Unknown"}
                                                </span>
                                            </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-red-500">Pool not found. Create a new one.</p>
                            )}
                        </div>

                        {/* Fetch Pool Data Button */}
                        <button
                            className="w-full bg-black text-white p-3 rounded-lg mt-4 disabled:opacity-50"
                            onClick={fetchPoolData}
                            disabled={state.loading}
                        >
                            {state.loading ? "Fetching..." : "Get Pool Info"}
                        </button>
                   

                {/* Navigation Button */}
                        <button
                            className="w-full p-3 rounded-lg mt-4"
                            onClick={async () => {
                                if (state.poolData) {
                                    await fetchPoolStats(state.poolData.poolId);

                                    if (!state.poolStats) {
                                        await fetchPoolStats(state.poolData.poolId); // Retry once
                                    }

                                    dispatch({ type: "SET_STEP", payload: 2 });
                                } else {  // ✅ Correctly placed else statement
                                    router.push("/pools/create-pool");
                                }
                            }}
                            disabled={!state.poolChecked}
                            style={{
                                backgroundColor: state.poolChecked ? (state.poolData ? "black" : "blue") : "gray",
                                color: "white",
                            }}
                        >
                            {state.poolData ? "Proceed to Step 2" : "Create a New Pool"}
                        </button>

                    </div>
                )}

                {/* Step 2: Deposit Liquidity */}
                {state.step === 2 && state.dropdownCoinMetadata && state.customCoinMetadata && state.poolStats && (
                    <div className="pb-20 overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-4">Deposit Liquidity</h2>

                        {/* Pool Stats */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Pool Stats</h3>

                            {/* Balances */}
                            <h3 className="text-sm font-semibold text-black">Balances</h3>
                            <p className="text-sm text-gray-700">
                                Balance A: {(state.poolStats.balance_a / 1e9).toFixed(4)}
                            </p>
                            <p className="text-sm text-gray-700">
                                Balance B: {(state.poolStats.balance_b / 1e9).toFixed(4)}
                            </p>
                            <p className="text-sm text-gray-700">
                                Pool Locked Coins: {(state.poolStats.burn_balance_b / 1e9).toFixed(4)}
                            </p>
                            <p className="text-sm text-gray-700">
                                Pool Locked LP: {(state.poolStats.locked_lp_balance / 1e9).toFixed(4)}
                            </p>

                            {/* Fees */}
                            <h3 className="text-sm font-semibold text-black mt-2">Fees</h3>
                            <p className="text-sm text-gray-700">
                                LP Builder Fee: {(state.poolStats.lp_builder_fee / 100).toFixed(2)}%
                            </p>
                            <p className="text-sm text-gray-700">
                                Burn Fee: {(state.poolStats.burn_fee / 100).toFixed(2)}%
                            </p>
                            <p className="text-sm text-gray-700">
                                Rewards Fee: {(state.poolStats.rewards_fee / 100).toFixed(2)}%
                            </p>
                            <p className="text-sm text-gray-700">
                                Creator Fee: {(state.poolStats.dev_royalty_fee / 100).toFixed(2)}%
                            </p>
                        </div>

                        {/* Slippage Tolerance Input */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Slippage Tolerance</h3>
                            <div className="flex items-center space-x-2 mt-2">
                                <input
                                    type="number"
                                    className="bg-white text-black text-2xl font-semibold p-2 rounded-lg w-20 border outline-none"
                                    placeholder="0.5"
                                    value={state.slippageTolerance}
                                    onChange={(e) => {
                                        let newSlippage = parseFloat(e.target.value);
                                        if (isNaN(newSlippage) || newSlippage < 0) newSlippage = 0;
                                        if (newSlippage > 5) newSlippage = 5; // Limit slippage between 0% and 5%
                                        dispatch({ type: "SET_SLIPPAGE", payload: newSlippage });
                                    }}
                                />
                                <span className="text-black text-lg font-medium">%</span>
                            </div>
                            <p className="text-gray-600 text-sm mt-1">
                                Set the maximum slippage tolerance. Lower values reduce risk but increase failure rate.
                            </p>
                        </div>

                        {/* Deposit Inputs */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Deposit Tokens</h3>

                            <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-2">
                                <img
                                    src={state.dropdownCoinMetadata?.image || "/default-coin.png"}
                                    alt={state.dropdownCoinMetadata?.symbol || "Coin A"}
                                    className="w-8 h-8 rounded-full mr-2"
                                />
                                <span className="text-black font-medium mr-2">
                                    {state.dropdownCoinMetadata?.symbol || "Coin A"}
                                </span>
                                <input
                                    type="number"
                                    className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                    placeholder="0"
                                    value={state.depositDropdownCoin}
                                    onChange={(e) => handleCoinAChange(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-2">
                                <img
                                    src={state.customCoinMetadata?.image || "/default-coin.png"}
                                    alt={state.customCoinMetadata?.symbol || "Coin B"}
                                    className="w-8 h-8 rounded-full mr-2"
                                />
                                <span className="text-black font-medium mr-2">
                                    {state.customCoinMetadata?.symbol || "Coin B"}
                                </span>
                                <input
                                    type="number"
                                    className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                    placeholder="0"
                                    value={state.depositCustomCoin}
                                    onChange={(e) => handleCoinBChange(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Add Liquidity Button */}
                        <button
                            className="bg-black text-white p-3 rounded-lg w-full mt-4 disabled:opacity-50"
                            onClick={handleAddLiquidity}
                            disabled={!state.depositDropdownCoin || !state.depositCustomCoin || state.loading}
                        >
                            {state.loading ? "Processing..." : "Add Liquidity ✅"}
                        </button>
                        <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} />

                    </div>
                )}

                {/* Step 3: Liquidity Confirmation */}
                {state.step === 3 && state.liquidityData && (
                    <div className="pb-20 overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-4">Liquidity Successfully Added! 🎉</h2>

                        <div className="bg-green-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Transaction Summary</h3>

                            <p className="text-black text-sm font-semibold">Liquidity Pool:</p>
                            <p className="text-gray-700 text-sm break-all">{state.liquidityData.poolId}</p>

                            <h3 className="text-sm font-semibold text-black mt-2">Your Deposits:</h3>
                            <p className="text-sm text-gray-700">
                                {state.liquidityData.depositA.toFixed(4)} {state.dropdownCoinMetadata?.symbol}
                            </p>
                            <p className="text-sm text-gray-700">
                                {state.liquidityData.depositB.toFixed(4)} {state.customCoinMetadata?.symbol}
                            </p>

                            <h3 className="text-sm font-semibold text-black mt-2">LP Tokens Minted:</h3>
                            <p className="text-sm text-gray-700">{state.liquidityData.lpMinted.toFixed(4)} LP Tokens</p>

                            <h3 className="text-sm font-semibold text-black mt-2">Transaction Digest:</h3>
                            <p className="text-sm text-blue-700 break-all cursor-pointer"
                                onClick={() => window.open(`https://suiexplorer.com/tx/${state.liquidityData.txnDigest}`, "_blank")}
                            >
                                {state.liquidityData.txnDigest}
                            </p>
                        </div>

                        {/* Final Action */}
                        <button
                            className="bg-black text-white p-3 rounded-lg w-full mt-4"
                            onClick={() => router.push("/pools")}
                        >
                            Back to Pools
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
