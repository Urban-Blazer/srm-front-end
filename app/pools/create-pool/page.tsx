"use client";
import useConvertToU64 from "@/app/hooks/useConvertToU64";
import useGetCoinInput from "@/app/hooks/useGetCoinInput";
import useGetPoolCoins from "@/app/hooks/useGetPoolCoins";
import { usePredefinedCoins } from "@/app/hooks/usePredefinedCoins";
import Avatar from "@components/Avatar";
import StepIndicator from "@components/CreatePoolStepIndicator";
import ExplorerAccountLink from "@components/ExplorerLink/ExplorerAccountLink";
import InputCurrency from "@components/InputCurrency";
import TransactionModal from "@components/TransactionModal";
import Button from "@components/UI/Button";
import { predefinedCoins } from "@data/coins";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { isValidSuiAddress } from "@mysten/sui/utils";
import CopyIcon from "@svg/copy-icon.svg";
import { ExternalLink, ExternalLinkIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  DEX_MODULE_NAME,
  FACTORY_ID,
  GETTER_RPC,
  LOCK_ID,
  PACKAGE_ID,
} from "../../config";

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
  transactionProgress: null,
};

const formatCoinValue = (valueInAtomic: number, decimals: number): string => {
  const factor = Math.pow(10, decimals);
  const formatted = valueInAtomic / factor;
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};

function reducer(state: any, action: any) {
  switch (action.type) {
    case "SET_COIN":
      return {
        ...state,
        selectedCoin: action.payload,
        dropdownOpen: false,
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
        customCoinMetadata: action.payload.custom,
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
      console.log("SET_INITIAL_PRICE_MODE", action.payload);
      return {
        ...state,
        initialPriceMode: action.payload,
        depositDropdownCoin: "",
        depositCustomCoin: "",
      };
    case "SET_DEPOSIT_DROPDOWN":
      const depositCustomCoin = state.initialPrice > 0 ? 
        (state.initialPriceMode === "dropdownPerCustom" ? (parseFloat(action.payload) / parseFloat(state.initialPrice)).toFixed(6) : (parseFloat(action.payload) * parseFloat(state.initialPrice)).toFixed(6)) : 
        "";
      return {
        ...state,
        depositDropdownCoin: action.payload,
        depositCustomCoin: depositCustomCoin,
      };
    case "SET_DEPOSIT_CUSTOM":
      const depositDropdownCoin = state.initialPrice > 0 ? 
        (state.initialPriceMode === "customPerDropdown" ? (parseFloat(action.payload) / parseFloat(state.initialPrice)).toFixed(6) : (parseFloat(action.payload) * parseFloat(state.initialPrice)).toFixed(6)) : 
        "";
      return {
        ...state,
        depositCustomCoin: action.payload,
        depositDropdownCoin: depositDropdownCoin,
      };
    case "SET_POOL_DATA": // 🔹 New case to store pool data
      return { ...state, poolData: action.payload };
    case "SET_TRANSACTION_PROGRESS":
      return { ...state, transactionProgress: action.payload };

    default:
      return state;
  }
}

export default function Pools() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const account = useCurrentAccount();
  const wallet = useCurrentWallet()?.currentWallet;
  const walletAddress = account?.address;
  const [isProcessing, setIsProcessing] = useState(false); // Track processing state
  const [logs, setLogs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { coins } = usePredefinedCoins();
  const predefinedCoins = coins.filter((coin) =>
    coin.lists?.includes("strict")
  );

  // Coin types for the pool (derived from state)
  const coinTypeA = useMemo(
    () => state.dropdownCoinMetadata?.typeName,
    [state.dropdownCoinMetadata]
  );
  const coinTypeB = useMemo(
    () => state.customCoinMetadata?.typeName,
    [state.customCoinMetadata]
  );

  // Use our custom hooks to pre-fetch pool coins and prepare transaction inputs
  const {
    coinsA,
    coinsB,
    isLoading: isLoadingCoins,
    error: coinError,
    refetch: refetchCoins,
  } = useGetPoolCoins(coinTypeA, coinTypeB, walletAddress);

  // Utility to convert string amounts to BigInt with proper decimals
  const toU64 = useConvertToU64();

  // Utility to get the proper coin inputs for transaction building
  const getCoinInput = useGetCoinInput();

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
  };

  // ✅ Allow navigation to previous steps only (not forward skipping)
  const setStep = (step: number) => {
    if (step < state.step) {
      dispatch({ type: "SET_STEP", payload: step });
    }
  };

  useEffect(() => {
    if (isProcessing) {
      setIsModalOpen(true); // ✅ Ensures modal opens when processing starts
    }
  }, [isProcessing]); // ✅ Reacts when `isProcessing` changes

  // ✅ Fetch Coin Metadata
  const fetchMetadata = async () => {
    if (!state.customCoin.trim()) {
      addLog("⚠️ Please enter a valid Coin Type (e.g., 0x2::sui::SUI)");
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      // 🔍 Fetch metadata for dropdown coin and custom coin
      const [dropdownMetadata, customMetadata] = await Promise.all([
        provider.getCoinMetadata({ coinType: state.selectedCoin?.typeName }),
        provider.getCoinMetadata({ coinType: state.customCoin.trim() }),
      ]);

      // 🔥 Ensure typeName exists in metadata before setting state
      if (dropdownMetadata && customMetadata) {
        dispatch({
          type: "SET_METADATA",
          payload: {
            dropdown: {
              ...dropdownMetadata,
              typeName: state.selectedCoin?.typeName,
              iconUrl: state.selectedCoin?.image,
            },
            custom: { ...customMetadata, typeName: state.customCoin.trim() },
          },
        });

        dispatch({ type: "SET_STEP", payload: 2 });
      } else {
        addLog("⚠️ One or both coin metadata could not be retrieved.");
      }
    } catch (error) {
      addLog("⚠️ Failed to fetch coin metadata.");
    }

    dispatch({ type: "SET_LOADING", payload: false });
  };

  // Note: We've removed the getMergedCoinInput function as it's now provided by the useGetCoinInput hook

  // ✅ Create Pool Transaction
  const handleCreatePool = async () => {
    setLogs([]); // Clear previous logs
    setIsProcessing(true); // 🔥 Set processing state
    setIsModalOpen(true); // Open modal

    if (!wallet || !walletAddress) {
      addLog("⚠️ Please connect your wallet first.");
      return;
    }
    dispatch({
      type: "SET_TRANSACTION_PROGRESS",
      payload: {
        image: "/images/txn_loading.png",
        text: "Processing Transaction...",
      },
    });

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const userAddress = walletAddress;

      if (
        !state.dropdownCoinMetadata?.typeName ||
        !state.customCoinMetadata?.typeName
      ) {
        addLog(
          "⚠️ Coin metadata is missing! Please go back and reselect your tokens."
        );

        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      const expectedCoinA = state.dropdownCoinMetadata.typeName;
      const expectedCoinB = state.customCoinMetadata.typeName;

      // ✅ Get pre-fetched coins or refetch if needed
      // First ensure we refresh the data to get the latest state
      await refetchCoins();

      // If we still don't have the data, log an error
      if (!coinsA || !coinsB) {
        console.error("❌ Failed to load coin data", { coinError });
        addLog("❌ Failed to load coin data. Please try again.");
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      // merge responses
      const coins = [...coinsA, ...coinsB];

      // New (dynamic decimals)
      const dropdownDecimals = state.dropdownCoinMetadata.decimals || 9;
      const customDecimals = state.customCoinMetadata.decimals || 9;

      // Convert deposit amounts to BigInt using our utility hook
      const depositDropdownMIST = toU64(
        state.depositDropdownCoin,
        dropdownDecimals
      );
      const depositCustomMIST = toU64(state.depositCustomCoin, customDecimals);

      const coinA = coins.find((c) => c.coinType === expectedCoinA);
      const coinB = coins.find((c) => c.coinType === expectedCoinB);

      if (!coinA || !coinB) {
        addLog("⚠️ Coin objects not found.");

        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      // ✅ Ensure user has enough balance

      const coinABalance = await provider.getBalance({
        owner: userAddress,
        coinType: expectedCoinA,
      });

      const coinBBalance = await provider.getBalance({
        owner: userAddress,
        coinType: expectedCoinB,
      });

      if (
        BigInt(coinABalance.totalBalance) < depositDropdownMIST ||
        BigInt(coinBBalance.totalBalance) < depositCustomMIST
      ) {
        addLog("⚠️ Insufficient coin balance in wallet.");
        console.error("⚠️ Insufficient coin balance in wallet.", {
          coinABalance,
          coinBBalance,
          depositDropdownMIST,
          depositCustomMIST,
        }, BigInt(coinABalance.totalBalance) < depositDropdownMIST, BigInt(coinBBalance.totalBalance) < depositCustomMIST);

        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      addLog("✅ Balance Check Passed!");

      // Create transaction block
      const txb = new TransactionBlock();
      const GAS_BUDGET = 150_000_000;

      // Prepare transaction inputs
      let coinAInput, coinBInput;

      try {
        // Use our hook for coin input preparation (handles SUI vs non-SUI automatically)
        coinAInput = await getCoinInput(
          txb,
          coins,
          expectedCoinA,
          depositDropdownMIST
        );
        coinBInput = await getCoinInput(
          txb,
          coins,
          expectedCoinB,
          depositCustomMIST
        );

        // Set gas budget
        txb.setGasBudget(GAS_BUDGET);

        // Create the move call with all parameters
        txb.moveCall({
          target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::create_pool_with_coins_and_transfer_lp_to_sender`,
          typeArguments: [
            state.dropdownCoinMetadata!.typeName,
            state.customCoinMetadata!.typeName,
          ],
          arguments: [
            txb.object(LOCK_ID),
            txb.object(FACTORY_ID),
            coinAInput,
            txb.pure.u64(depositDropdownMIST),
            coinBInput,
            txb.pure.u64(depositCustomMIST),
            txb.pure.u64(Math.round(state.lpBuilderFee * 100)), // Convert % → basis points
            txb.pure.u64(Math.round(state.buybackBurnFee * 100)),
            txb.pure.u64(Math.round(state.deployerRoyaltyFee * 100)),
            txb.pure.u64(Math.round(state.rewardsFee * 100)),
            txb.pure.address(state.deployerRoyaltyWallet),
            txb.object("0x6"),
          ],
        });
      } catch (error: any) {
        addLog(`❌ Error: ${error.message}`);

        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      let executeResponse: any;

      await new Promise<void>((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb.serialize(),
            chain: "sui:mainnet", // Or 'sui:devnet' depending on env
          },
          {
            onSuccess: (result) => {
              executeResponse = result;
              resolve();
            },
            onError: (error) => {
              addLog(`⚠️ Transaction failed: ${error.message}`);
              dispatch({ type: "SET_LOADING", payload: false });
              dispatch({
                type: "SET_TRANSACTION_PROGRESS",
                payload: {
                  image: "/images/txn_failed.png",
                  text: "Transaction Failed",
                },
              });
              reject(error);
            },
          }
        );
      });

      addLog("✅ Transaction Executed!");

      // ✅ Extract the transaction digest
      const txnDigest = executeResponse?.digest;
      addLog(`🔍 Tracking transaction digest: ${txnDigest}`);

      if (!txnDigest) {
        addLog(
          "⚠️ Transaction submission failed. Transaction digest is missing."
        );
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      // ✅ Wait for Transaction Confirmation with Retry
      addLog("🕒 Waiting for confirmation...");
      let txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        addLog("⚠️ Transaction not successful, please retry.");
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      addLog("✅ Transaction Successfully Confirmed");

      // ✅ Extract PoolCreated event
      let poolCreatedEvent = txnDetails.events?.find((event) =>
        event.type.includes("PoolCreated")
      );

      if (!poolCreatedEvent) {
        await new Promise((res) => setTimeout(res, 5000)); // Wait 5s and retry
        txnDetails = await fetchTransactionWithRetry(txnDigest);
        poolCreatedEvent = txnDetails?.events?.find((event) =>
          event.type.includes("PoolCreated")
        );
      }

      if (!poolCreatedEvent) {
        addLog(`⚠️ Transaction not successful, please retry.`);
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      // ✅ Extract event data safely
      const poolDataFromEvent = poolCreatedEvent.parsedJson as any;
      if (!poolDataFromEvent) {
        addLog(`⚠️ PoolCreated event detected, but no data available.`);
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({
          type: "SET_TRANSACTION_PROGRESS",
          payload: {
            image: "/images/txn_failed.png",
            text: "Transaction Failed",
          },
        });
        return;
      }

      // ✅ Prepare data for submission
      const poolData = {
        poolId: poolDataFromEvent.pool_id,
        coinA: poolDataFromEvent.a,
        coinB: poolDataFromEvent.b,
        initA: parseFloat("0"),
        initB: parseFloat("0"),
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
            addLog(
              `✅ Pool stored successfully in database (Attempt ${attempt})`
            );

            setIsProcessing(false); // ✅ Ensure modal does not close early

            // ✅ Move to Step 5 after success
            dispatch({ type: "SET_POOL_DATA", payload: poolData });
            dispatch({ type: "SET_STEP", payload: 5 });
            break; // Exit retry loop if successful
          } else {
            addLog(`⚠️ Database attempt ${attempt} failed. Retrying...`);
          }
        } catch (error) {}
        await new Promise((res) => setTimeout(res, 5000)); // Wait 5s before retrying
      }

      if (!dbSuccess) {
        addLog("⚠️ Pool data failed to store in database after retries.");
      }

      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error: any) {
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
        if (abortCode === 5)
          userErrorMessage = "⚠️ Fee exceeds maximum allowed";
        if (abortCode === 6)
          userErrorMessage = "⚠️ Pool Creation Locked, Account Not Authorized.";

        addLog(userErrorMessage);
      } else {
        addLog("⚠️ Transaction failed.");
      }
      dispatch({ type: "SET_LOADING", payload: false });
    } finally {
      setIsProcessing(false); // ✅ Ensure modal does not close early
      setTimeout(() => setIsModalOpen(false), 5000); // Close modal after 5s
    }
  };

  // Simplified retry function to wait for transaction propagation
  const fetchTransactionWithRetry = async (
    txnDigest: string,
    retries = 20,
    delay = 5000
  ) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const txnDetails = await provider.getTransactionBlock({
          digest: txnDigest,
          options: { showEffects: true, showEvents: true },
        });

        // Check if transaction succeeded
        if (txnDetails?.effects?.status) {
          if (txnDetails.effects.status.status === "success") {
            return txnDetails; // Return only successful transactions
          } else {
            // Transaction was found but failed
            addLog(
              `Transaction failed with status: ${txnDetails.effects.status.status}`
            );
            return null;
          }
        }

        // Transaction details exist but no status - return it anyway
        if (txnDetails) {
          return txnDetails;
        }
      } catch (error) {
        // Silently retry after delay
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    addLog(`Transaction not confirmed after ${retries} attempts`);
    return null;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);

    // Hide the message after 2 seconds
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="min-h-screen overflow-y-auto flex flex-col md:flex-row bg-[#000306] p-4 md:p-6 pb-20">
      <div className="hidden md:block">
        <StepIndicator step={state.step} setStep={setStep} />
      </div>

      <div className="flex-1 p-1 sm:p-4  shadow-lg overflow-y-auto max-h-full">
        <h1 className="text-2xl font-bold mb-6">Create a New Pool</h1>

        <div className="flex items-center justify-center gap-4 p-4 bg-royalPurple  mb-4">
          <p className="text-highlight text-m mt-1">
            Pool Creation Locked: Contact admin to claim your project{"'"}s pool
            and start trading.
          </p>
        </div>

        {/* Step 1: Select Coins */}
        {state.step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Coin Pair</h2>

            {/* Dropdown for Predefined Coins */}
            <div className="mb-4 relative">
              <label className="block text-gray-300 mb-2">
                <strong>Select First Coin:</strong>
              </label>
              <button
                className="w-full flex items-center justify-between p-3 sm:p-2 border border-slate-600 bg-[#14110c]"
                onClick={() => dispatch({ type: "TOGGLE_DROPDOWN" })}
              >
                <div className="flex items-center space-x-2">
                  <div className="relative w-6 h-6 sm:w-8 sm:h-8">
                    <Avatar
                      src={state.selectedCoin.image}
                      alt={state.selectedCoin.symbol}
                      className="rounded-full"
                    />
                  </div>
                  <span>{state.selectedCoin.symbol}</span>
                </div>
                <span className="text-gray-400">▼</span>
              </button>

              {/* Client-side only rendering for the dropdown */}
              {state.dropdownOpen && (
                <div className="absolute left-0 mt-1 w-full  border border-slate-600 shadow-lg z-10 bg-[#14110c]">
                  {predefinedCoins.map((coin) => (
                    <div
                      key={coin.symbol}
                      className="flex items-center px-3 py-2 hover: cursor-pointer "
                      onClick={() =>
                        dispatch({ type: "SET_COIN", payload: coin })
                      }
                    >
                      <div className="relative w-6 h-6">
                        <Avatar
                          src={coin.image || "/default-coin.png"}
                          alt={coin.symbol}
                          className="w-5 h-5 aspect-square rounded-full token-icon"
                        />
                      </div>
                      <span className="ml-2">{coin.symbol}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input field for custom coin */}
            <div className="mb-4">
              <label className="block">
                <strong>Enter Second Coin TypeName:</strong>
              </label>
              <input
                type="text"
                className="w-full p-2 border border-slate-600 bg-[#14110c] placeholder-slate-500"
                placeholder="Enter Coin TypeName (e.g., 0x2::sui::SUI)"
                value={state.customCoin}
                onChange={(e) =>
                  dispatch({ type: "SET_CUSTOM_COIN", payload: e.target.value })
                }
              />
            </div>
            {/* Continue Button */}
            <Button
              onClick={fetchMetadata}
              disabled={state.loading}
              processing={state.loading}
              variant={state.loading ? "disabled" : "primary"}
              size="full"
              rounded={false}
              className="mt-6 transition"
            >
              {state.loading ? "Fetching..." : "Continue"}
            </Button>
          </div>
        )}

        {/* Step 2: Configure Fees & Wallet */}
        {state.step === 2 &&
          state.dropdownCoinMetadata &&
          state.customCoinMetadata && (
            <div className="w-full flex flex-col flex-1 overflow-y-auto pb-32">
              <h2 className="text-xl font-semibold mb-4">Set Pool Fees</h2>

              {/* Selected Coins Display */}
              <div className="flex items-center justify-center gap-4 p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="relative w-10 h-10">
                    <Avatar
                      src={
                        state.dropdownCoinMetadata.iconUrl ||
                        "/default-coin.png"
                      }
                      alt={state.dropdownCoinMetadata.symbol}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <span className="text-lg font-semibold">
                    {state.dropdownCoinMetadata.symbol}
                  </span>
                </div>

                <span className="text-2xl font-bold">/</span>

                <div className="flex items-center space-x-2">
                  <div className="relative w-10 h-10">
                    <Avatar
                      src={
                        state.customCoinMetadata.iconUrl || "/default-coin.png"
                      }
                      alt={state.customCoinMetadata.symbol}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <span className="text-lg font-semibold">
                    {state.customCoinMetadata.symbol}
                  </span>
                </div>
              </div>

              {/* Fee Inputs - Scrollable */}
              <div className="flex-1 overflow-y-auto space-y-4 px-1 sm:px-4">
                {[
                  { field: "lpBuilderFee", label: "LP Builder Fee", max: 3 },
                  {
                    field: "buybackBurnFee",
                    label: "Buyback and Burn Fee",
                    max: 5,
                  },
                  {
                    field: "deployerRoyaltyFee",
                    label: "Deployer Royalty Fee",
                    max: 1,
                  },
                  { field: "rewardsFee", label: "Rewards Fee", max: 5 },
                ].map(({ field, label, max }) => (
                  <div key={field}>
                    <label className="block text-gray-700">
                      <strong>
                        {label} (0.00% - {max.toFixed(2)}%)
                      </strong>
                    </label>

                    <div className="flex justify-between items-center bg-[#14110c] px-3 py-2">
                      <InputCurrency
                        className="max-w-[240px] sm:max-w-[calc(100%-100px)] xl:max-w-[240px] p-2 outline-none bg-transparent text-3xl sm:text-2xl overflow-hidden disabled:text-[#868098]"
                        placeholder={`Enter fee (0.00 - ${max.toFixed(2)})`}
                        value={state[field] === 0 ? "" : state[field]}
                        min={0}
                        max={max}
                        maxLength={4}
                        minLength={1}
                        step={0.01}
                        onChange={(e) => {
                          console.log("onChange", e.target.value);
                          if (
                            e.target.value === "" ||
                            Number(e.target.value) === 0 ||
                            isNaN(Number(e.target.value))
                          ) {
                            console.log("dispatch1", e.target.value);
                            dispatch({
                              type: "SET_FEES",
                              field,
                              value:
                                e.target.value === "0."
                                  ? e.target.value
                                  : e.target.value === ""
                                  ? ""
                                  : "0",
                            });
                            return;
                          }
                          console.log("dispatch2", e.target.value);
                          const value =
                            Number(e.target.value.replace(/,/g, "")) > max
                              ? max.toString()
                              : e.target.value.replace(/,/g, "");
                          dispatch({
                            type: "SET_FEES",
                            field,
                            value,
                          });
                        }}
                      />
                      <div className="flex items-center">
                        <span className="text-slate-500">%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center w-full mt-2 gap-1 sm:gap-2">
                      <Button
                        onClick={() =>
                          dispatch({ type: "SET_FEES", field, value: "0" })
                        }
                        variant="secondary"
                        size="xs"
                        rounded={false}
                        className={`flex-1 text-xs sm:text-md bg-[#14110c] hover:bg-slate-600 rounded-none px-1 py-1  ${
                          state[field] === "0"
                            ? "bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:opacity-75"
                            : "text-slate-300"
                        }`}
                      >
                        0%
                      </Button>
                      <Button
                        onClick={() =>
                          dispatch({ type: "SET_FEES", field, value: max / 4 })
                        }
                        variant="primary"
                        size="xs"
                        rounded={false}
                        className={`flex-1 text-xs sm:text-md bg-[#14110c] hover:bg-slate-600 rounded-none px-1 py-1  ${
                           state[field] === max / 4
                            ? "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                            : "text-slate-300"
                        }`}

                      >
                        {(max / 4).toFixed(2)}%
                      </Button>
                      <Button
                        onClick={() =>
                          dispatch({ type: "SET_FEES", field, value: max / 2 })
                        }
                        variant="primary"
                        size="xs"
                        rounded={false}
                        className={`flex-1 text-xs sm:text-md bg-[#14110c] hover:bg-slate-600 rounded-none px-1 py-1  ${
                           state[field] === max / 2
                            ? "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                            : "text-slate-300"
                        }`}
                      >
                        {(max / 2).toFixed(2)}%
                      </Button>
                      <Button
                        onClick={() =>
                          dispatch({
                            type: "SET_FEES",
                            field,
                            value: (max / 4) * 3,
                          })
                        }
                        variant="primary"
                        size="xs"
                        rounded={false}
                        className={`flex-1 text-xs sm:text-md bg-[#14110c] hover:bg-slate-600 rounded-none px-1 py-1  ${
                           state[field] === (max / 4) * 3
                            ? "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                            : "text-slate-300"
                        }`}
                      >
                        {((max / 4) * 3).toFixed(2)}%
                      </Button>
                      <Button
                        onClick={() =>
                          dispatch({ type: "SET_FEES", field, value: max })
                        }
                        variant="primary"
                        size="xs"
                        rounded={false}
                        className={`flex-1 text-xs sm:text-md bg-[#14110c] hover:bg-slate-600 rounded-none px-1 py-1  ${
                           state[field] === max
                            ? "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                            : "text-slate-300"
                        }`}
                      >
                        {max}%
                      </Button>
                      <Button
                        onClick={() =>
                          dispatch({
                            type: "SET_FEES",
                            field,
                            value: Number(
                              state[field] === 0 || state[field] < 0.01
                                ? "0"
                                : state[field] - 0.01
                            ).toFixed(2),
                          })
                        }
                        variant="secondary"
                        size="xs"
                        rounded={false}
                        disabled={state[field] === "0"}
                      >
                        <MinusIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          if (state[field] === max) return;
                          console.log(
                            state[field],
                            state[field] === 0
                              ? 0 + 0.01
                              : (Number(state[field]) + 0.01).toFixed(2)
                          );
                          dispatch({
                            type: "SET_FEES",
                            field,
                            value: Number(
                              state[field] === 0
                                ? 0 + 0.01
                                : (Number(state[field]) + 0.01).toFixed(2)
                            ),
                          });
                        }}
                        variant="primary"
                        size="xs"
                        rounded={false}
                        disabled={state[field] === max}
                      >
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Deployer Royalty Wallet Address Validation */}
                <div>
                  <label className="block text-gray-700">
                    <strong>Deployer Royalty Wallet Address *</strong>
                  </label>
                  <input
                    type="text"
                    className={`w-full p-2 bg-[#14110c] placeholder-slate-500 ${
                      state.deployerRoyaltyWallet &&
                      !isValidSuiAddress(state.deployerRoyaltyWallet)
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Enter valid Sui address (0x...)"
                    value={state.deployerRoyaltyWallet}
                    onChange={(e) =>
                      dispatch({ type: "SET_WALLET", payload: e.target.value })
                    }
                  />
                  {!state.deployerRoyaltyWallet && (
                    <p className="text-red-500 text-sm mt-1">
                      Wallet address is required.
                    </p>
                  )}
                  {state.deployerRoyaltyWallet &&
                    !isValidSuiAddress(state.deployerRoyaltyWallet) && (
                      <p className="text-red-500 text-sm mt-1">
                        {`Invalid Sui address. It must start with "0x" and be 66 characters long.`}
                      </p>
                    )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="sticky bottom-0 p-4 shadow-lg w-full flex flex-col sm:flex-row gap-2">
                <Button
                  variant="secondary"
                  size="full"
                  rounded={false}
                  onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}
                >
                  Back
                </Button>

                <Button
                  disabled={
                    !isValidSuiAddress(state.deployerRoyaltyWallet) ||
                    !state.deployerRoyaltyWallet
                  }
                  processing={state.loading}
                  variant={state.loading ? "disabled" : "primary"}
                  size="full"
                  rounded={false}
                  onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

        {/* Step 3: Token Deposit */}
        {state.step === 3 && (
          <div className="flex flex-col flex-1 w-full overflow-y-auto pb-32">
            <h2 className="text-xl font-semibold mb-4">Set Deposit Amounts</h2>

            {/* Selected Coins */}
            <div className="flex items-center justify-center gap-4 p-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="relative w-10 h-10">
                  <Avatar
                    src={
                      state.dropdownCoinMetadata?.iconUrl || "/default-coin.png"
                    }
                    alt={state.dropdownCoinMetadata?.symbol || "Token"}
                    className="rounded-full object-cover"
                  />
                </div>
                <span className="text-lg font-semibold">
                  {state.dropdownCoinMetadata?.symbol}
                </span>
              </div>

              <span className="text-2xl font-bold">/</span>

              <div className="flex items-center space-x-2">
                <div className="relative w-10 h-10">
                  <Avatar
                    src={
                      state.customCoinMetadata?.iconUrl || "/default-coin.png"
                    }
                    alt={state.customCoinMetadata?.symbol || "Token"}
                    className="rounded-full object-cover"
                  />
                </div>
                <span className="text-lg font-semibold">
                  {state.customCoinMetadata?.symbol}
                </span>
              </div>
            </div>

            {/* Fee Summary */}
            <div className="p-4 shadow-md mb-4">
              <h2 className="text-xl font-semibold mb-2">Fees</h2>
              <ul className="space-y-2 ">
                <li>
                  <strong>LP Builder Fee:</strong> {state.lpBuilderFee}%
                </li>
                <li>
                  <strong>Buyback and Burn Fee:</strong> {state.buybackBurnFee}%
                </li>
                <li>
                  <strong>Deployer Royalty Fee:</strong>{" "}
                  {state.deployerRoyaltyFee}%
                </li>
                <li>
                  <strong>Rewards Fee:</strong> {state.rewardsFee}%
                </li>
              </ul>
            </div>

            {/* Deployer Wallet */}
            <div className=" p-4  shadow-md mb-4">
              <h2 className="text-lg font-semibold mb-2">Deployer Wallet</h2>
              <ExplorerAccountLink account={state.deployerRoyaltyWallet}>
                {state.deployerRoyaltyWallet?.slice(0, 6) +
                  "..." +
                  state.deployerRoyaltyWallet?.slice(-4)}{" "}
                <ExternalLink className="ml-2 inline w-4 h-4" />
              </ExplorerAccountLink>
            </div>

            {/* Initial Price Input */}
            <div className="p-4  shadow-md mb-4">
              <h2 className="text-lg font-semibold">Initial Price</h2>
              <p className="text-gray-500 mb-2">
                Set the starting exchange rate between the two coins in your
                pool.
              </p>

              {/* Toggle Button */}
              <div className="flex items-center justify-between p-2  border w-48 mb-2">
                <button
                  className={`px-3 py-1 w-full ${
                    state.initialPriceMode === "customPerDropdown"
                      ? "bg-gray-600"
                      : "button-primary"
                  }`}
                  onClick={() =>
                    dispatch({
                      type: "SET_INITIAL_PRICE_MODE",
                      payload: "customPerDropdown",
                    })
                  }
                >
                  {state.dropdownCoinMetadata?.symbol}
                </button>
                <button
                  className={`px-3 py-1 w-full ${
                    state.initialPriceMode === "dropdownPerCustom"
                      ? "bg-gray-600"
                      : "button-primary"
                  }`}
                  onClick={() =>
                    dispatch({
                      type: "SET_INITIAL_PRICE_MODE",
                      payload: "dropdownPerCustom",
                    })
                  }
                >
                  {state.customCoinMetadata?.symbol}
                </button>
              </div>

              {/* Input Field */}
              <div className="relative">
                <InputCurrency
                  className="w-full p-3 border bg-[#000306] text-lg md:text-2xl font-semibold border-slate-600 outline-none"
                  placeholder="0"
                  min={0}
                  step={0.0001}
                  value={state.initialPrice || ""}
                  onChange={(e) => {
                    console.log("onChange", e.target.value);
                    if (
                      e.target.value === "" ||
                      Number(e.target.value) === 0 ||
                      isNaN(Number(e.target.value))
                    ) {
                      console.log("dispatch1", e.target.value);
                      dispatch({
                        type: "SET_INITIAL_PRICE",
                        payload: e.target.value.includes("0.")
                          ? e.target.value
                          : e.target.value === ""
                          ? ""
                          : "0",
                      }); // Default to 0 if empty
                      return;
                    }
                    console.log("dispatch2", e.target.value);
                    dispatch({
                      type: "SET_INITIAL_PRICE",
                      payload: e.target.value,
                    });
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg pr-4">
                  {state.initialPriceMode === "customPerDropdown"
                    ? `${state.customCoinMetadata?.symbol} per ${state.dropdownCoinMetadata?.symbol}`
                    : `${state.dropdownCoinMetadata?.symbol} per ${state.customCoinMetadata?.symbol}`}
                </span>
              </div>
            </div>

            {/* ✅ Deposit Token Amount Section (NEW) */}
            <div className="flex flex-col gap-4 p-4 shadow-md mb-4">
              <h2 className="text-lg font-semibold">Deposit Coins</h2>
              <p className="text-gray-500 mb-4">
                Specify the coin amounts for your initial liquidity.
              </p>

              {/* First Token */}
              <div className="relative">
                <InputCurrency
                  className="w-full p-3 border bg-[#000306] text-lg md:text-2xl font-semibold border-slate-600 outline-none"
                  placeholder="0"
                  min={0}
                  step={0.0001}
                  value={state.depositDropdownCoin}
                  onChange={(e) => {
                    console.log("onChange", e.target.value);
                    if (
                      e.target.value === "" ||
                      Number(e.target.value) === 0 ||
                      isNaN(Number(e.target.value))
                    ) {
                      console.log("dispatch1", e.target.value);
                      dispatch({
                        type: "SET_DEPOSIT_DROPDOWN",
                        payload: e.target.value.includes("0.")
                          ? e.target.value
                          : e.target.value === ""
                          ? ""
                          : e.target.value.replace(/,/g, ""),
                      }); // Default to 0 if empty
                      return;
                    }
                    console.log("dispatch2", e.target.value);
                    dispatch({
                      type: "SET_DEPOSIT_DROPDOWN",
                      payload: e.target.value.replace(/,/g, ""),
                    });
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg pr-4">
                  {state.dropdownCoinMetadata?.symbol}
                </span>
              </div>

              {/* Second Token */}
              <div className="relative">
                <InputCurrency
                  className="w-full p-3 border bg-[#000306] text-lg md:text-2xl font-semibold border-slate-600 outline-none"
                  placeholder="0"
                  min={0}
                  step={0.0001}
                  value={state.depositCustomCoin}
                  onChange={(e) => {
                    console.log("onChange", e.target.value);
                    if (
                      e.target.value === "" ||
                      Number(e.target.value) === 0 ||
                      isNaN(Number(e.target.value))
                    ) {
                      console.log("dispatch1", e.target.value);
                      dispatch({
                        type: "SET_DEPOSIT_CUSTOM",
                        payload: e.target.value.includes("0.")
                          ? e.target.value
                          : e.target.value === ""
                          ? ""
                          : e.target.value.replace(/,/g, ""),
                      }); // Default to 0 if empty
                      return;
                    }
                    console.log("dispatch2", e.target.value);
                    dispatch({
                      type: "SET_DEPOSIT_CUSTOM",
                      payload: e.target.value.replace(/,/g, ""),
                    });
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg pr-4">
                  {state.customCoinMetadata?.symbol}
                </span>
              </div>
            </div>
            {/* Navigation Buttons */}
            <div className="sticky bottom-0 gap-2 p-4 shadow-lg w-full flex justify-between">
              <Button
                variant="secondary"
                size="full"
                rounded={false}
                onClick={() => dispatch({ type: "SET_STEP", payload: 2 })}
              >
                Back
              </Button>

              <Button
                variant="primary"
                size="full"
                rounded={false}
                onClick={() => dispatch({ type: "SET_STEP", payload: 4 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {state.step === 4 && (
          <div className="flex flex-col flex-1 w-full overflow-y-auto pb-32">
            <h2 className="text-xl font-semibold mb-4">Review & Create Pool</h2>

            {/* Coin Pair Summary */}
            <div className=" p-4  shadow-md mb-4">
              <h2 className="text-lg font-semibold">Selected Coins</h2>
              <div className="flex items-center justify-center gap-4 p-4  ">
                <div className="flex items-center space-x-2">
                  <div className="relative w-10 h-10">
                    <Avatar
                      src={
                        state.dropdownCoinMetadata?.iconUrl ||
                        "/default-coin.png"
                      }
                      alt={state.dropdownCoinMetadata?.symbol || "Token"}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <span className="text-lg font-semibold">
                    {state.dropdownCoinMetadata?.symbol}
                  </span>
                </div>
                <span className="text-2xl font-bold">/</span>
                <div className="flex items-center space-x-2">
                  <div className="relative w-10 h-10">
                    <Avatar
                      src={
                        state.customCoinMetadata?.iconUrl || "/default-coin.png"
                      }
                      alt={state.customCoinMetadata?.symbol || "Token"}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <span className="text-lg font-semibold">
                    {state.customCoinMetadata?.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Fees Summary */}
            <div className=" p-4  shadow-md mb-4">
              <h2 className="text-lg font-semibold">Fees</h2>
              <ul className="space-y-2 ">
                <li>
                  <strong>LP Builder Fee:</strong> {state.lpBuilderFee}%
                </li>
                <li>
                  <strong>Buyback and Burn Fee:</strong> {state.buybackBurnFee}%
                </li>
                <li>
                  <strong>Deployer Royalty Fee:</strong>{" "}
                  {state.deployerRoyaltyFee}%
                </li>
                <li>
                  <strong>Rewards Fee:</strong> {state.rewardsFee}%
                </li>
              </ul>
            </div>

            {/* Deployer Wallet */}
            <div className=" p-4  shadow-md mb-4">
              <h2 className="text-lg font-semibold">Deployer Wallet</h2>
              <ExplorerAccountLink account={state.deployerRoyaltyWallet}>
                {state.deployerRoyaltyWallet?.slice(0, 6) +
                  "..." +
                  state.deployerRoyaltyWallet?.slice(-4)} <ExternalLinkIcon className="ml-2 inline w-4 h-4" />
              </ExplorerAccountLink>
            </div>

            {/* Initial Price & Deposit Amounts */}
            <div className=" p-4  shadow-md mb-4">
              <h2 className="text-lg font-semibold">Initial Price</h2>
              <p className=" text-lg">
                1 {state.dropdownCoinMetadata?.symbol} = {state.initialPrice}{" "}
                {state.customCoinMetadata?.symbol}
              </p>
            </div>

            <div className=" p-4  shadow-md mb-4">
              <h2 className="text-lg font-semibold">Deposit Amounts</h2>
              <p className=" text-lg">
                {state.depositDropdownCoin} {state.dropdownCoinMetadata?.symbol}{" "}
                / {state.depositCustomCoin} {state.customCoinMetadata?.symbol}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 p-4 gap-2 shadow-lg w-full flex justify-between">
              <Button
                variant="secondary"
                size="full"
                rounded={false}
                onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
              >
                Back
              </Button>

              <Button
                variant="primary"
                size="full"
                rounded={false}
                onClick={() => handleCreatePool()}
                disabled={state.loading}
              >
                {state.loading ? "Processing..." : "Create Pool"}
              </Button>
              <TransactionModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                logs={logs}
                isProcessing={isProcessing}
                digest={state.liquidityData?.txnDigest}
                transactionProgress={state.transactionProgress}
              />
            </div>
          </div>
        )}

        {state.step === 5 && (
          <div className="flex flex-col flex-1 w-full overflow-y-auto pb-32">
            <h2 className="text-xl font-semibold mb-4">
              🎉 Pool Successfully Created!
            </h2>

            {state.poolData ? (
              <div className="p-4  shadow-md mb-4">
                <h2 className="text-lg font-semibold">Pool Information</h2>
                <ul className="space-y-1 ">
                  {/* ✅ Pool ID with Copy Button */}
                  <li className="flex items-center justify-between  overflow-x-auto">
                    <p className=" truncate">
                      <strong>Pool ID:</strong> {state.poolData.poolId}
                    </p>
                    <div className="flex items-center space-x-2">
                      {copiedText === state.poolData.poolId && (
                        <span className="text-sm">Copied!</span>
                      )}
                      <button
                        onClick={() => handleCopy(state.poolData.poolId)}
                        className="p-2  hover: transition"
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </li>

                  {/* ✅ LP Pair with Copy Button */}
                  <li className="flex items-center justify-between  overflow-x-auto">
                    <p className=" truncate">
                      <strong>LP Pair:</strong>{" "}
                      {state.poolData.coinA?.name || "Unknown"} /{" "}
                      {state.poolData.coinB?.name || "Unknown"}
                    </p>
                    <div className="flex items-center space-x-2">
                      {copiedText ===
                        `${state.poolData.coinA?.name || "Unknown"} / ${
                          state.poolData.coinB?.name || "Unknown"
                        }` && <span className="text-sm">Copied!</span>}
                      <button
                        onClick={() =>
                          handleCopy(
                            `${state.poolData.coinA?.name || "Unknown"} / ${
                              state.poolData.coinB?.name || "Unknown"
                            }`
                          )
                        }
                        className="p-2  hover: transition"
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </li>

                  {/* Separate Coin A and Coin B */}
                  {/* ✅ Coin A with Copy Button */}
                  <li className="flex items-center justify-between  overflow-x-auto">
                    <p className=" truncate">
                      <strong>Coin A:</strong>{" "}
                      {state.poolData.coinA?.name || "Unknown"}
                    </p>
                    <div className="flex items-center space-x-2">
                      {copiedText === state.poolData.coinA?.name && (
                        <span className="text-sm">Copied!</span>
                      )}
                      <button
                        onClick={() =>
                          handleCopy(state.poolData.coinA?.name || "Unknown")
                        }
                        className="p-2  hover: transition"
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                  <li>
                    <strong>Initial Amount (A):</strong>{" "}
                    {formatCoinValue(
                      state.poolData.initA,
                      state.dropdownCoinMetadata.decimals
                    )}{" "}
                    {state.dropdownCoinMetadata.symbol}
                  </li>

                  {/* ✅ Coin B with Copy Button */}
                  <li className="flex items-center justify-between  overflow-x-auto">
                    <p className=" truncate">
                      <strong>Coin B:</strong>{" "}
                      {state.poolData.coinB?.name || "Unknown"}
                    </p>
                    <div className="flex items-center space-x-2">
                      {copiedText === state.poolData.coinB?.name && (
                        <span className="text-sm">Copied!</span>
                      )}
                      <button
                        onClick={() =>
                          handleCopy(state.poolData.coinB?.name || "Unknown")
                        }
                        className="p-2  hover: transition"
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                  <li>
                    <strong>Initial Amount (B):</strong>{" "}
                    {formatCoinValue(
                      state.poolData.initB,
                      state.customCoinMetadata.decimals
                    )}{" "}
                    {state.customCoinMetadata.symbol}
                  </li>

                  <li>
                    <strong>LP Minted:</strong>{" "}
                    {formatCoinValue(state.poolData.lpMinted, 9)}
                  </li>

                  {/* Fees Section */}
                  <li>
                    <strong>Fees:</strong>
                  </li>
                  <ul className="ml-4">
                    <li>LP Builder Fee: {state.lpBuilderFee}%</li>
                    <li>Burn Fee: {state.burnFee}%</li>
                    <li>
                      Creator Royalty Fee: {state.creatorRoyaltyFee}%
                    </li>
                    <li>Rewards Fee: {state.rewardsFee}%</li>
                  </ul>

                  {/* ✅ Creator Wallet with Copy Button */}
                  <li className="flex items-center justify-between  overflow-x-auto">
                    <p className=" truncate">
                      <strong>Creator Wallet:</strong>{" "}
                      {state.poolData.creatorWallet}
                    </p>
                    <div className="flex items-center space-x-2">
                      {copiedText === state.poolData.creatorWallet && (
                        <span className="text-sm">Copied!</span>
                      )}
                      <button
                        onClick={() => handleCopy(state.poolData.creatorWallet)}
                        className="p-2  hover: transition"
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="text-center text-royalPurple mt-10">
                ⏳ Loading Pool Details...
              </div>
            )}

            <div className="sticky bottom-0 p-4 shadow-lg w-full flex justify-center">
              <Button
                variant="primary"
                size="full"
                rounded={false}
                onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}
              >
                Create Another Pool
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
