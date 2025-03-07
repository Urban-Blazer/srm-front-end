// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { GETTER_RPC, PACKAGE_ID, DEX_MODULE_NAME, CONFIG_ID } from "../config";
import TokenSelector from "@components/TokenSelector"
import CopyIcon from "@svg/copy-icon.svg";
import TransactionModal from "@components/TransactionModal";
import Image from "next/image";

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

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
    // ts-ignore
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
                creatorRoyaltyFee: poolStats.creator_royalty_fee?.toString() || "0",
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

    const handleSwap = async (attempt = 1) => {
        setLogs([]); // Clear previous logs
        setIsModalOpen(true); // Open modal
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

            // ✅ Select correct decimals from poolMetadata
            const decimals = poolMetadata.coinA.typeName === sellToken.typeName ? poolMetadata.coinA.decimals : poolMetadata.coinB.decimals;
            const sellAmountU64 = BigInt(Math.floor(Number(sellAmount) * Math.pow(10, decimals)));
            const minOutU64 = BigInt(Math.floor((Number(buyAmount) * (1 - Number(maxSlippage) / 100)) * Math.pow(10, decimals)));

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
                        balance: obj.data?.content?.fields?.balance ? BigInt(obj.data?.content?.fields?.balance) : BigInt(0),
                    };
                })
                .filter(Boolean); // Remove null values

            console.log("🔍 Extracted Coins with Balance:", coins);

            // ✅ Find matching coin object
            const matchingCoin = coins.find((c) => c.type === sellToken.typeName);

            if (!matchingCoin || matchingCoin.balance < sellAmountU64) {
                alert("⚠️ Insufficient tokens in wallet.");
                console.error("❌ Missing or insufficient Coin Object:", { matchingCoin });
                return;
            }

            addLog(`✅ Using Coin ID: ${matchingCoin.objectId}`);
            console.log(`✅ Using Coin ID: ${matchingCoin.objectId}, Balance: ${matchingCoin.balance.toString()}`);

            // ✅ Build Transaction Block
            const txb = new TransactionBlock();

            // Convert coin object ID to transaction object
            const coinObject = txb.object(matchingCoin.objectId);

            // 🔹 Split the required amount
            const [usedCoin] = txb.splitCoins(coinObject, [txb.pure.u64(sellAmountU64)]);

            // 📌 Determine the correct swap function
            const swapFunction = isAtoB
                ? `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_a_for_b_with_coins_and_transfer_to_sender`
                : `${PACKAGE_ID}::${DEX_MODULE_NAME}::swap_b_for_a_with_coins_and_transfer_to_sender`;

            // 🚀 Construct the transaction block
            txb.moveCall({
                target: swapFunction,
                typeArguments,
                arguments: [
                    txb.object(poolId),
                    txb.object(CONFIG_ID),
                    usedCoin,
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
                chain: "sui:testnet",
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

            // ✅ Update isActive in DynamoDB **AFTER SUCCESSFUL SWAP** with RETRIES
            await updateIsActiveWithRetry(poolId, 3); // Retry up to 3 times

            // 🔄 Refresh balances after the swap
            await fetchBalance(sellToken, setSellBalance);
            await fetchBalance(buyToken, setBuyBalance);

        } catch (error) {
            addLog(`❌ Swap Failed (Attempt ${attempt}): ${error.message}`);
            console.error(`❌ Swap Failed (Attempt ${attempt}):`, error);

            if (attempt < 3) {
                console.log(`🔁 Retrying Swap... (Attempt ${attempt + 1})`);
                setTimeout(() => handleSwap(attempt + 1), 2000); // Retry after 2 seconds
            } else {
                alert("❌ Swap failed after multiple attempts. Check console for details.");
            }
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

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${result.error || "Unknown error"}`);
                }

                console.log(`✅ isActive API Response (Attempt ${attempt + 1}):`, result);
                addLog(result.message);
                return; // ✅ Exit on success

            } catch (error) {
                console.error(`❌ Failed to update isActive (Attempt ${attempt + 1}):`, error);
                addLog(`⚠️ Failed to update isActive (Attempt ${attempt + 1}) - ${error.message}`);
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
                                        <Image src={sellToken.logo} alt={sellToken.symbol} width={20} height={20} className="w-5 h-5 mr-2" />
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
                                        <Image src={buyToken.logo} alt={buyToken.symbol} width={20} height={20} className="w-5 h-5 mr-2" />
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
                        onClick={!walletConnected ? () => walletAdapter?.connect() : () => handleSwap(1)}
                        disabled={fetchingQuote || walletConnected && (!sellToken || !buyToken)}
                    >
                        {fetchingQuote ? "Fetching Quote..." : walletConnected ? "Swap" : "Connect Wallet"}
                    </button>
                    <TransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} logs={logs} />
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
                                                <Image src={poolMetadata?.coinA?.image} alt={poolMetadata?.coinA?.symbol} width={20} height={20} className="w-8 h-8 rounded-full" />
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
                                                <Image src={poolMetadata?.coinB?.image} alt={poolMetadata?.coinB?.symbol} width={20} height={20} className="w-8 h-8 rounded-full" />
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
                                    <p><strong>Deployer Royalty Fee:</strong> {((poolStats?.creator_royalty_fee || 0) / 100).toFixed(2)}%</p>
                                    
                                    {/* ✅ Dev Wallet with Copy Button */}
                                    <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg overflow-x-auto">
                                        <p className="text-black truncate">
                                            <strong>Deployer Royalty Wallet:</strong> {poolStats?.creator_royalty_wallet || ""}
                                        </p>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(poolStats?.creator_royalty_wallet || "")}
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
