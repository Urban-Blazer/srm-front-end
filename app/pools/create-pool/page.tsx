"use client";
import { useReducer, useEffect, useState } from "react";
import StepIndicator from "@components/CreatePoolStepIndicator";
import { SuiClient } from "@mysten/sui.js/client";
import { predefinedCoins } from "@data/coins";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME, FACTORY_ID } from "../../config";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import TransactionModal from "@components/TransactionModal";

const provider = new SuiClient({ url: GETTER_RPC });

const initialState = {
    selectedCoin: predefinedCoins[0],
    customCoin: "",
    step: 1,
    loading: false,
    poolData: null,
    dropdownOpen: false,
    dropdownCoinMetadata: null,
    customCoinMetadata: null,
    lpBuilderFee: 0,
    buybackBurnFee: 0,
    deployerRoyaltyFee: 0,
    rewardsFee: 0,
    deployerRoyaltyWallet: "",
    initialPrice: 0,
    initialPriceMode: "customPerDropdown",
    depositDropdownCoin: "",
    depositCustomCoin: "",
};

function isValidSuiAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(address);
}

function reducer(state: any, action: any) {
    switch (action.type) {
        case "SET_COIN":
            return {
                ...state,
                selectedCoin: action.payload,
                dropdownOpen: false
            };
        case "SET_CUSTOM_COIN":
            return { ...state, customCoin: action.payload };
        case "SET_STEP":
            return { ...state, step: action.payload };
        case "TOGGLE_DROPDOWN":
            return { ...state, dropdownOpen: !state.dropdownOpen };
        case "SET_LOADING":
            return { ...state, loading: action.payload };
        case "SET_METADATA":
            return {
                ...state,
                dropdownCoinMetadata: action.payload.dropdown,
                customCoinMetadata: action.payload.custom
            };
        case "SET_FEES":
            return { ...state, [action.field]: action.value };
        case "SET_WALLET":
            return { ...state, deployerRoyaltyWallet: action.payload };
        case "SET_INITIAL_PRICE":
            return {
                ...state,
                initialPrice: action.payload,
                depositDropdownCoin: "",
                depositCustomCoin: "",
            };
        case "SET_INITIAL_PRICE_MODE":
            return {
                ...state,
                initialPriceMode: action.payload,
                depositDropdownCoin: "",
                depositCustomCoin: "",
            };
        case "SET_DEPOSIT_DROPDOWN":
            return {
                ...state,
                depositDropdownCoin: action.payload,
                depositCustomCoin: state.initialPrice > 0 ? (parseFloat(action.payload) * state.initialPrice).toFixed(6) : "",
            };
        case "SET_DEPOSIT_CUSTOM":
            return {
                ...state,
                depositCustomCoin: action.payload,
                depositDropdownCoin: state.initialPrice > 0 ? (parseFloat(action.payload) / state.initialPrice).toFixed(6) : "",
            };
        case "SET_POOL_DATA": // 🔹 New case to store pool data
            return { ...state, poolData: action.payload };

        default:
            return state;
    }
}

export default function Pools() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    const [logs, setLogs] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const addLog = (message: string) => {
        setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
    };

    // ✅ Allow navigation to previous steps only (not forward skipping)
    const setStep = (step: number) => {
        if (step < state.step) {
            dispatch({ type: "SET_STEP", payload: step });
        }
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


    // ✅ Fetch Coin Metadata
    const fetchMetadata = async () => {
        if (!state.customCoin.trim()) {
            alert("Please enter a valid Coin Type (e.g., 0x2::sui::SUI)");
            return;
        }

        dispatch({ type: "SET_LOADING", payload: true });

        try {
            // 🔍 Fetch metadata for dropdown coin and custom coin
            const [dropdownMetadata, customMetadata] = await Promise.all([
                provider.getCoinMetadata({ coinType: state.selectedCoin?.typeName }),
                provider.getCoinMetadata({ coinType: state.customCoin.trim() }),
            ]);

            console.log("✅ Fetched Metadata:", { dropdownMetadata, customMetadata });

            // 🔥 Ensure typeName exists in metadata before setting state
            if (dropdownMetadata && customMetadata) {
                dispatch({
                    type: "SET_METADATA",
                    payload: {
                        dropdown: { ...dropdownMetadata, typeName: state.selectedCoin?.typeName },
                        custom: { ...customMetadata, typeName: state.customCoin.trim() }
                    },
                });

                console.log("✅ Metadata successfully stored!", {
                    dropdown: { ...dropdownMetadata, typeName: state.selectedCoin?.typeName },
                    custom: { ...customMetadata, typeName: state.customCoin.trim() },
                });

                dispatch({ type: "SET_STEP", payload: 2 });
            } else {
                alert("One or both coin metadata could not be retrieved.");
            }
        } catch (error) {
            console.error("❌ Error fetching coin metadata:", error);
            alert("Failed to fetch coin metadata.");
        }

        dispatch({ type: "SET_LOADING", payload: false });
    };


    // ✅ Create Pool Transaction
    const handleCreatePool = async () => {
        setLogs([]); // Clear previous logs
        setIsModalOpen(true); // Open modal
        console.log("🔍 Checking wallet connection:", walletConnected, walletAddress);

        if (!walletConnected || !walletAddress || !walletAdapter) {
            alert("⚠️ Please connect your wallet first.");
            return;
        }

        try {
            dispatch({ type: "SET_LOADING", payload: true });

            const accounts = await walletAdapter.getAccounts();
            console.log("👛 Wallet accounts from Nightly:", accounts);

            if (accounts.length === 0) {
                alert("⚠️ No accounts found. Please reconnect your wallet.");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            const userAddress = accounts[0].address;
            console.log("✅ Using wallet address:", userAddress);

            // ✅ Validate metadata before proceeding
            if (!state.dropdownCoinMetadata?.typeName || !state.customCoinMetadata?.typeName) {
                alert("⚠️ Coin metadata is missing! Please go back and reselect your tokens.");
                console.error("❌ Metadata is missing!", {
                    dropdownCoinMetadata: state.dropdownCoinMetadata,
                    customCoinMetadata: state.customCoinMetadata,
                });
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            console.log("✅ Expected Coin Types:", state.dropdownCoinMetadata.typeName, state.customCoinMetadata.typeName);

            // ✅ Fetch owned coin objects INCLUDING balance field
            const { data: ownedObjects } = await provider.getOwnedObjects({
                owner: userAddress,
                filter: { StructType: "0x2::coin::Coin" },
                options: { showType: true, showContent: true },
            });

            console.log("🔍 Owned objects:", ownedObjects);

            // ✅ Extract and clean up coin data
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
                .filter(Boolean); // Remove null values

            console.log("🔍 Extracted Coins with Balance:", coins);

            // ✅ Find matching coin objects
            const expectedCoinA = state.dropdownCoinMetadata.typeName;
            const expectedCoinB = state.customCoinMetadata.typeName;
            const coinA = coins.find((c) => c.type === expectedCoinA);
            const coinB = coins.find((c) => c.type === expectedCoinB);

            if (!coinA || !coinB) {
                alert("⚠️ Insufficient tokens in wallet. Coin objects not found.");
                console.error("❌ Missing Coin Objects:", { coinA, coinB });
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            // ✅ Check if balances are present
            if (!coinA.balance || !coinB.balance) {
                alert("⚠️ Insufficient token balance in wallet. Coin objects found but no balance.");
                console.error("❌ Balance Missing:", { coinA, coinB });
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            // ✅ Convert Deposits from Whole Coins → MIST (Multiply by 10⁹)
            const depositDropdownMIST = BigInt(Math.floor(parseFloat(state.depositDropdownCoin) * 1_000_000_000));
            const depositCustomMIST = BigInt(Math.floor(parseFloat(state.depositCustomCoin) * 1_000_000_000));

            console.log("💰 Deposit Amounts in MIST:");
            console.log(`${state.dropdownCoinMetadata.symbol}:`, depositDropdownMIST.toString());
            console.log(`${state.customCoinMetadata.symbol}:`, depositCustomMIST.toString());

            // ✅ Ensure user has enough balance
            if (coinA.balance < depositDropdownMIST || coinB.balance < depositCustomMIST) {
                alert("⚠️ Insufficient token balance in wallet.");
                console.error("❌ Balance Check Failed!");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }
            addLog("✅ Balance Check Passed!");
            console.log("✅ Balance Check Passed!");
            console.log("💰 Selected Coin Objects for Deposit:");
            console.log(`${state.dropdownCoinMetadata.symbol}:`, coinA.objectId, "Balance:", coinA.balance.toString());
            console.log(`${state.customCoinMetadata.symbol}:`, coinB.objectId, "Balance:", coinB.balance.toString());

            // ✅ Build Transaction Block
            const txb = new TransactionBlock();
            txb.setGasBudget(1_000_000_000);

            txb.moveCall({
                target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::create_pool_with_coins_and_transfer_lp_to_sender`,
                typeArguments: [state.dropdownCoinMetadata!.typeName, state.customCoinMetadata!.typeName],
                arguments: [
                    txb.object(FACTORY_ID),
                    txb.object(coinA.objectId),
                    txb.pure.u64(depositDropdownMIST),
                    txb.object(coinB.objectId),
                    txb.pure.u64(depositCustomMIST),
                    txb.pure.u64(Math.round(state.lpBuilderFee * 100)), // Convert % → basis points
                    txb.pure.u64(Math.round(state.buybackBurnFee * 100)),
                    txb.pure.u64(Math.round(state.deployerRoyaltyFee * 100)),
                    txb.pure.u64(Math.round(state.rewardsFee * 100)),
                    txb.pure.address(state.deployerRoyaltyWallet),
                ],
            });

            // ✅ Sign Transaction
            addLog("✍️ Signing transaction...");
            console.log("✍️ Signing transaction...");
            const signedTx = await walletAdapter.signTransactionBlock({
                transactionBlock: txb,
                account: userAddress,
                chain: "sui:devnet",
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
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            // ✅ Wait for Transaction Confirmation with Retry
            addLog("🕒 Waiting for confirmation...");
            console.log("🕒 Waiting for confirmation...");
            let txnDetails = await fetchTransactionWithRetry(txnDigest);

            if (!txnDetails) {
                alert("Transaction not successful please retry");
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            addLog("✅ Transaction Successfully Confirmed");
            console.log("✅ Transaction Successfully Confirmed:", txnDetails);

            // ✅ Extract PoolCreated event
            let poolCreatedEvent = txnDetails.events?.find((event) =>
                event.type.includes("PoolCreated")
            );

            if (!poolCreatedEvent) {
                console.warn(`⚠️ PoolCreated event missing on first attempt! Retrying event extraction...`);
                await new Promise((res) => setTimeout(res, 5000)); // Wait 5s and retry
                txnDetails = await fetchTransactionWithRetry(txnDigest);
                poolCreatedEvent = txnDetails?.events?.find((event) => event.type.includes("PoolCreated"));
            }

            if (!poolCreatedEvent) {
                alert(`Transaction not successful please retry`);
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            // ✅ Extract event data safely
            const poolDataFromEvent = poolCreatedEvent.parsedJson;
            if (!poolDataFromEvent) {
                alert(`PoolCreated event detected, but no data available.`);
                dispatch({ type: "SET_LOADING", payload: false });
                return;
            }

            // ✅ Prepare data for submission
            const poolData = {
                poolId: poolDataFromEvent.pool_id,
                coinA: poolDataFromEvent.a,
                coinB: poolDataFromEvent.b,
                initA: parseFloat(poolDataFromEvent.init_a),
                initB: parseFloat(poolDataFromEvent.init_b),
                lpMinted: parseFloat(poolDataFromEvent.lp_minted),
                lockedLpBalance: parseFloat(poolDataFromEvent.locked_lp_balance),
                lpBuilderFee: parseFloat(poolDataFromEvent.lp_builder_fee),
                burnFee: parseFloat(poolDataFromEvent.burn_fee),
                creatorRoyaltyFee: parseFloat(poolDataFromEvent.creator_royalty_fee),
                rewardsFee: parseFloat(poolDataFromEvent.rewards_fee),
                creatorWallet: poolDataFromEvent.creator_royalty_wallet,

                // ✅ Add Coin A Metadata
                coinA_name: state.dropdownCoinMetadata.name || "Unknown",
                coinA_symbol: state.dropdownCoinMetadata.symbol || "Unknown",
                coinA_description: state.dropdownCoinMetadata.description || "",
                coinA_decimals: state.dropdownCoinMetadata.decimals || 0,
                coinA_image: state.dropdownCoinMetadata.iconUrl || "",

                // ✅ Add Coin B Metadata
                coinB_name: state.customCoinMetadata.name || "Unknown",
                coinB_symbol: state.customCoinMetadata.symbol || "Unknown",
                coinB_description: state.customCoinMetadata.description || "",
                coinB_decimals: state.customCoinMetadata.decimals || 0,
                coinB_image: state.customCoinMetadata.iconUrl || "",
            };

            addLog("📡 Sending pool data to database...");
            console.log("📡 Sending pool data to database:", poolData);

            let dbSuccess = false;
            for (let attempt = 1; attempt <= 10; attempt++) {
                addLog(`📡 Database Attempt ${attempt}...`);
                try {
                    const response = await fetch("/api/add-pool", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(poolData),
                    });

                    if (response.ok) {
                        dbSuccess = true;
                        addLog(`✅ Pool stored successfully in database (Attempt ${attempt})`);
                        console.log(`✅ Pool stored successfully in database (Attempt ${attempt})`);

                        // ✅ Move to Step 5 after success
                        dispatch({ type: "SET_POOL_DATA", payload: poolData });
                        dispatch({ type: "SET_STEP", payload: 5 });
                        break; // Exit retry loop if successful
                    } else {
                        addLog(`⚠️ Database attempt ${attempt} failed. Retrying...`);
                        console.warn(`⚠️ Database attempt ${attempt} failed. Retrying...`);
                    }
                } catch (error) {
                    console.error(`❌ Database submission error (Attempt ${attempt}):`, error);
                }
                await new Promise((res) => setTimeout(res, 5000)); // Wait 5s before retrying
            }

            if (!dbSuccess) {
                alert("⚠️ Pool data failed to store in database after retries.");
            }

            dispatch({ type: "SET_LOADING", payload: false });

        } catch (error) {
            console.error("❌ Transaction failed:", error);

            // 🔍 Detect MoveAbort errors
            const moveErrorMatch = error.message.match(
                /MoveAbort\(MoveLocation \{ module: ModuleId \{ address: ([^,]+), name: Identifier\("([^"]+)"\) \}, function: (\d+), instruction: (\d+), function_name: Some\("([^"]+)"\) \}, (\d+)\)/
            );

            if (moveErrorMatch) {
                const moduleName = moveErrorMatch[2]; // Module name (e.g., "srmV1")
                const functionName = moveErrorMatch[5]; // Function name (e.g., "create_pool")
                const abortCode = parseInt(moveErrorMatch[6]); // Abort Code

                let userErrorMessage = `Pool creation failed in ${moduleName}::${functionName} with code ${abortCode}.`;

                if (abortCode === 1) userErrorMessage = "⚠️ Invalid token pair.";
                if (abortCode === 2) userErrorMessage = "⚠️ Pool already exists.";
                if (abortCode === 5) userErrorMessage = "⚠️ Fee exceeds maximum allowed";
                if (abortCode === 1001) userErrorMessage = "⚠️ Failed due to fee settings.";

            alert(userErrorMessage);
            } else {
            alert("Transaction failed. Check the console for details.");
            }
            dispatch({ type: "SET_LOADING", payload: false });
        } finally {
            setTimeout(() => setIsModalOpen(false), 5000); // Close modal after 5s
        }
    };

    // ✅ Retry function to wait for transaction propagation
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

                    // 🛠️ Log transaction status
                    if (txnDetails.effects && txnDetails.effects.status) {
                        console.log("📡 Transaction Status:", txnDetails.effects.status);
                        if (txnDetails.effects.status.status !== "success") {
                            console.error("❌ Transaction Failed!", txnDetails.effects.status.error);
                            return null; // Stop further processing
                        }
                    }

                    return txnDetails;
                }
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`, error);
                await new Promise(res => setTimeout(res, delay));
            }
        }
        console.error(`❌ All ${retries} attempts failed. Transaction might not be indexed yet.`);
        return null;
    };

    return (
        <div className="flex h-screen bg-gray-100 p-6 overflow-hidden">

            <StepIndicator step={state.step} setStep={setStep} />
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
                            <input type="text" className="w-full p-2 border rounded-lg text-black placeholder-gray-500"
                                placeholder="Enter coin type (e.g., 0x2::sui::SUI)"
                                value={state.customCoin}
                                onChange={(e) => dispatch({ type: "SET_CUSTOM_COIN", payload: e.target.value })}
                            />
                        </div>

                        {/* Continue Button */}
                        <button className="w-full bg-black text-white p-3 rounded-lg mt-4 disabled:opacity-50"
                            onClick={fetchMetadata} disabled={state.loading}
                        >
                            {state.loading ? "Fetching..." : "Continue"}
                        </button>
                    </div>
                )}

                {/* Step 2: Configure Fees & Wallet */}
                {state.step === 2 && state.dropdownCoinMetadata && state.customCoinMetadata && (
                    <div className="flex flex-col flex-1 w-full overflow-y-auto pb-32">
                        <h2 className="text-xl font-semibold mb-4 text-black">Set Pool Fees</h2>

                        {/* Selected Coins Display */}
                        <div className="flex items-center justify-center gap-4 p-4 bg-gray-200 rounded-lg mb-4">
                            <div className="flex items-center space-x-2">
                                <img src={state.dropdownCoinMetadata.iconUrl || ""} alt={state.dropdownCoinMetadata.symbol} className="w-10 h-10 rounded-full" />
                                <span className="text-lg font-semibold text-black">{state.dropdownCoinMetadata.symbol}</span>
                            </div>

                            <span className="text-2xl font-bold text-black">/</span>

                            <div className="flex items-center space-x-2">
                                <img src={state.customCoinMetadata.iconUrl || ""} alt={state.customCoinMetadata.symbol} className="w-10 h-10 rounded-full" />
                                <span className="text-lg font-semibold text-black">{state.customCoinMetadata.symbol}</span>
                            </div>
                        </div>

                        {/* Fee Inputs - Scrollable */}
                        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-150px)] space-y-4 px-4">
                            {[
                                { field: "lpBuilderFee", label: "LP Builder Fee", max: 3 },
                                { field: "buybackBurnFee", label: "Buyback and Burn Fee", max: 5 },
                                { field: "deployerRoyaltyFee", label: "Deployer Royalty Fee", max: 1 },
                                { field: "rewardsFee", label: "Rewards Fee", max: 5 }
                            ].map(({ field, label, max }) => (
                                <div key={field}>
                                    <label className="block text-gray-700">{label} (0.00% - {max.toFixed(2)}%)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg text-black"
                                        min="0"
                                        max={max}
                                        step="0.01"
                                        placeholder={`Enter fee (0.00 - ${max.toFixed(2)})`}
                                        value={state[field] === 0 ? "" : state[field]} // Show empty instead of zero
                                        onBlur={(e) => {
                                            if (e.target.value.trim() === "") {
                                                dispatch({ type: "SET_FEES", field, value: 0 }); // Default to 0 if empty
                                            }
                                        }}
                                        onChange={(e) => {
                                            let value = parseFloat(e.target.value);
                                            if (isNaN(value) || value < 0) value = 0;  // Prevent negatives
                                            if (value > max) value = max;  // Enforce max limit
                                            dispatch({ type: "SET_FEES", field, value });
                                        }}
                                    />
                                </div>
                            ))}

                            {/* Deployer Royalty Wallet Address Validation */}
                            <div>
                                <label className="block text-gray-700">Deployer Royalty Wallet Address *</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded-lg text-black ${state.deployerRoyaltyWallet && !isValidSuiAddress(state.deployerRoyaltyWallet) ? "border-red-500" : ""}`}
                                    placeholder="Enter valid Sui address (0x...)"
                                    value={state.deployerRoyaltyWallet}
                                    onChange={(e) => dispatch({ type: "SET_WALLET", payload: e.target.value })}
                                />
                                {!state.deployerRoyaltyWallet && (
                                    <p className="text-red-500 text-sm mt-1">Wallet address is required.</p>
                                )}
                                {state.deployerRoyaltyWallet && !isValidSuiAddress(state.deployerRoyaltyWallet) && (
                                    <p className="text-red-500 text-sm mt-1">Invalid Sui address. It must start with "0x" and be 66 characters long.</p>
                                )}
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="sticky bottom-0 bg-white p-4 shadow-lg w-full flex justify-between">
                            <button className="bg-gray-500 text-white p-3 rounded-lg"
                                onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}
                            >
                                ← Back to Step 1
                            </button>

                            <button
                                className={`p-3 rounded-lg ${isValidSuiAddress(state.deployerRoyaltyWallet) && state.deployerRoyaltyWallet ? "bg-black text-white" : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
                                disabled={!isValidSuiAddress(state.deployerRoyaltyWallet) || !state.deployerRoyaltyWallet}
                                onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
                            >
                                Proceed to Step 3 →
                            </button>
                        </div>
                    </div>
                )}


                {/* Step 3: Token Deposit */}
                {state.step === 3 && (
                    <div className="flex flex-col flex-1 w-full overflow-y-auto pb-32">

                        <h2 className="text-xl font-semibold mb-4 text-black">Set Deposit Amounts</h2>

                        {/* Selected Coins */}
                        <div className="flex items-center justify-center gap-4 p-4 bg-gray-200 rounded-lg mb-4">
                            <div className="flex items-center space-x-2">
                                <img src={state.dropdownCoinMetadata?.iconUrl || ""} alt={state.dropdownCoinMetadata?.symbol} className="w-10 h-10 rounded-full" />
                                <span className="text-lg font-semibold text-black">{state.dropdownCoinMetadata?.symbol}</span>
                            </div>

                            <span className="text-2xl font-bold text-black">/</span>

                            <div className="flex items-center space-x-2">
                                <img src={state.customCoinMetadata?.iconUrl || ""} alt={state.customCoinMetadata?.symbol} className="w-10 h-10 rounded-full" />
                                <span className="text-lg font-semibold text-black">{state.customCoinMetadata?.symbol}</span>
                            </div>
                        </div>

                        {/* Fee Summary */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Fees</h3>
                            <ul className="space-y-2 text-black">
                                <li><strong>LP Builder Fee:</strong> {state.lpBuilderFee.toFixed(2)}%</li>
                                <li><strong>Buyback and Burn Fee:</strong> {state.buybackBurnFee.toFixed(2)}%</li>
                                <li><strong>Deployer Royalty Fee:</strong> {state.deployerRoyaltyFee.toFixed(2)}%</li>
                                <li><strong>Rewards Fee:</strong> {state.rewardsFee.toFixed(2)}%</li>
                            </ul>
                        </div>

                        {/* Deployer Wallet */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Deployer Wallet</h3>
                            <p className="text-black">{state.deployerRoyaltyWallet || "Not set"}</p>
                        </div>

                        {/* Initial Price Input */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Initial Price</h3>
                            <p className="text-gray-500 mb-2">Set the starting exchange rate between the two tokens you are providing.</p>

                            {/* Toggle Button */}
                            <div className="flex items-center justify-between bg-white p-2 rounded-lg border w-48 mb-2">
                                <button
                                    className={`px-3 py-1 rounded-md ${state.initialPriceMode === "customPerDropdown" ? "bg-black text-white" : "bg-gray-200 text-black"}`}
                                    onClick={() => dispatch({ type: "SET_INITIAL_PRICE_MODE", payload: "customPerDropdown" })}
                                >
                                    {state.dropdownCoinMetadata?.symbol}
                                </button>
                                <button
                                    className={`px-3 py-1 rounded-md ${state.initialPriceMode === "dropdownPerCustom" ? "bg-black text-white" : "bg-gray-200 text-black"}`}
                                    onClick={() => dispatch({ type: "SET_INITIAL_PRICE_MODE", payload: "dropdownPerCustom" })}
                                >
                                    {state.customCoinMetadata?.symbol}
                                </button>
                            </div>

                            {/* Input Field */}
                            <div className="relative">
                                <input
                                    type="number"
                                    className="w-full p-3 border rounded-lg bg-gray-50 text-black text-lg"
                                    placeholder="0"
                                    min="0"
                                    step="0.0001"
                                    value={state.initialPrice || ""}
                                    onChange={(e) => dispatch({ type: "SET_INITIAL_PRICE", payload: parseFloat(e.target.value) || 0 })}
                                />
                                <span className="absolute right-4 top-3 text-gray-500 text-lg">
                                    {state.initialPriceMode === "customPerDropdown"
                                        ? `${state.customCoinMetadata?.symbol} per ${state.dropdownCoinMetadata?.symbol}`
                                        : `${state.dropdownCoinMetadata?.symbol} per ${state.customCoinMetadata?.symbol}`}
                                </span>
                            </div>
                        </div>

                        {/* ✅ Deposit Token Amount Section (NEW) */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Deposit Tokens</h3>
                            <p className="text-gray-500 mb-4">Specify the token amounts for your liquidity contribution.</p>

                            {/* First Token */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                                <input
                                    type="number"
                                    className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                    placeholder="0"
                                    min="0"
                                    step="0.0001"
                                    value={state.depositDropdownCoin}
                                    onChange={(e) => dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: e.target.value })}
                                />
                                <span className="text-lg font-semibold text-black">{state.dropdownCoinMetadata?.symbol}</span>
                            </div>

                            {/* Second Token */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                                <input
                                    type="number"
                                    className="bg-transparent text-2xl font-semibold text-black w-full outline-none"
                                    placeholder="0"
                                    min="0"
                                    step="0.0001"
                                    value={state.depositCustomCoin}
                                    onChange={(e) => dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: e.target.value })}
                                />
                                <span className="text-lg font-semibold text-black">{state.customCoinMetadata?.symbol}</span>
                            </div>
                        </div>
                        {/* Navigation Buttons */}
                        <div className="sticky bottom-0 bg-white p-4 shadow-lg w-full flex justify-between">
                            <button className="bg-gray-500 text-white p-3 rounded-lg"
                                onClick={() => dispatch({ type: "SET_STEP", payload: 2 })}
                            >
                                ← Back to Step 2
                            </button>

                            <button className="bg-black text-white p-3 rounded-lg"
                                onClick={() => dispatch({ type: "SET_STEP", payload: 4 })}
                            >
                                Proceed to Step 4 →
                            </button>
                        </div>
                    </div>
                )}

                {state.step === 4 && (
                    <div className="flex flex-col flex-1 w-full overflow-y-auto pb-32">

                        <h2 className="text-xl font-semibold mb-4 text-black">Review & Create Pool</h2>

                        {/* Coin Pair Summary */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Selected Coins</h3>
                            <div className="flex items-center justify-center gap-4 p-4 bg-gray-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <img src={state.dropdownCoinMetadata?.iconUrl || ""} alt={state.dropdownCoinMetadata?.symbol} className="w-10 h-10 rounded-full" />
                                    <span className="text-lg font-semibold text-black">{state.dropdownCoinMetadata?.symbol}</span>
                                </div>
                                <span className="text-2xl font-bold text-black">/</span>
                                <div className="flex items-center space-x-2">
                                    <img src={state.customCoinMetadata?.iconUrl || ""} alt={state.customCoinMetadata?.symbol} className="w-10 h-10 rounded-full" />
                                    <span className="text-lg font-semibold text-black">{state.customCoinMetadata?.symbol}</span>
                                </div>
                            </div>
                        </div>

                        {/* Fees Summary */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Fees</h3>
                            <ul className="space-y-2 text-black">
                                <li><strong>LP Builder Fee:</strong> {state.lpBuilderFee.toFixed(2)}%</li>
                                <li><strong>Buyback and Burn Fee:</strong> {state.buybackBurnFee.toFixed(2)}%</li>
                                <li><strong>Deployer Royalty Fee:</strong> {state.deployerRoyaltyFee.toFixed(2)}%</li>
                                <li><strong>Rewards Fee:</strong> {state.rewardsFee.toFixed(2)}%</li>
                            </ul>
                        </div>

                        {/* Deployer Wallet */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Deployer Wallet</h3>
                            <p className="text-black">{state.deployerRoyaltyWallet || "Not set"}</p>
                        </div>

                        {/* Initial Price & Deposit Amounts */}
                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Initial Price</h3>
                            <p className="text-black text-lg">
                                1 {state.dropdownCoinMetadata?.symbol} = {state.initialPrice} {state.customCoinMetadata?.symbol}
                            </p>
                        </div>

                        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                            <h3 className="text-lg font-semibold text-black">Deposit Amounts</h3>
                            <p className="text-black text-lg">
                                {state.depositDropdownCoin} {state.dropdownCoinMetadata?.symbol} / {state.depositCustomCoin} {state.customCoinMetadata?.symbol}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="sticky bottom-0 bg-white p-4 shadow-lg w-full flex justify-between">
                            <button className="bg-gray-500 text-white p-3 rounded-lg"
                                onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
                            >
                                ← Back to Step 3
                            </button>

                            <button className="bg-black text-white p-3 rounded-lg disabled:opacity-50"
                                onClick={() => handleCreatePool()}
                                
                                disabled={state.loading} // ✅ Prevent multiple clicks
                            >
                                {state.loading ? "Processing..." : "Create Pool ✅"}
                            </button>
                            <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} />
                        </div>
                    </div>
                )}

                {state.step === 5 && (
                    <div className="flex flex-col flex-1 w-full overflow-y-auto pb-32">
                        <h2 className="text-xl font-semibold mb-4 text-black">🎉 Pool Successfully Created!</h2>

                        {state.poolData ? (
                            <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-4">
                                <h3 className="text-lg font-semibold text-black">Pool Information</h3>
                                <ul className="space-y-2 text-black">
                                    <li><strong>Pool ID:</strong> {state.poolData.poolId}</li>

                                    {/* LP Pair Label */}
                                    <li><strong>LP Pair:</strong> {state.poolData.coinA?.name || "Unknown"} / {state.poolData.coinB?.name || "Unknown"}</li>

                                    {/* Separate Coin A and Coin B */}
                                    <li><strong>Coin A:</strong> {state.poolData.coinA?.name || "Unknown"}</li>
                                    <li><strong>Initial Amount (A):</strong> {state.poolData.initA} {state.poolData.coinA?.name}</li>

                                    <li><strong>Coin B:</strong> {state.poolData.coinB?.name || "Unknown"}</li>
                                    <li><strong>Initial Amount (B):</strong> {state.poolData.initB} {state.poolData.coinB?.name}</li>

                                    <li><strong>LP Minted:</strong> {state.poolData.lpMinted}</li>
                                    <li><strong>Locked LP Balance:</strong> {state.poolData.lockedLpBalance}</li>

                                    {/* Fees Section */}
                                    <li><strong>Fees:</strong></li>
                                    <ul className="ml-4">
                                        <li>LP Builder Fee: {state.poolData.lpBuilderFee}%</li>
                                        <li>Burn Fee: {state.poolData.burnFee}%</li>
                                        <li>Creator Royalty Fee: {state.poolData.creatorRoyaltyFee}%</li>
                                        <li>Rewards Fee: {state.poolData.rewardsFee}%</li>
                                    </ul>

                                    <li><strong>Creator Wallet:</strong> {state.poolData.creatorWallet}</li>
                                </ul>
                            </div>
                        ) : (
                            <div className="text-center text-gray-600 mt-10">⏳ Loading Pool Details...</div>
                        )}

                        <div className="sticky bottom-0 bg-white p-4 shadow-lg w-full flex justify-center">
                            <button className="bg-black text-white p-3 rounded-lg"
                                onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}>
                                🔄 Create Another Pool
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}