"use client";
import useConvertToU64 from "@/app/hooks/useConvertToU64";
import useGetCoinInput from "@/app/hooks/useGetCoinInput";
import useGetPoolCoins from "@/app/hooks/useGetPoolCoins";
import { usePredefinedCoins } from "@/app/hooks/usePredefinedCoins";
import StepIndicator from "@components/AddLiquidityStepIndicator";
import Avatar from "@components/Avatar";
import TransactionModal from "@components/TransactionModal";
import Button from "@components/UI/Button";
import { predefinedCoins as predefCoins } from "@data/coins";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  DEX_MODULE_NAME,
  GETTER_RPC,
  PACKAGE_ID,
} from "../../config";

const provider = new SuiClient({ url: GETTER_RPC });

const initialState = {
  selectedCoin: predefCoins[0], // CoinA
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
  transactionProgress: null,
};

function reducer(state: any, action: any) {
  switch (action.type) {
    case "SET_METADATA":
      return {
        ...state,
        dropdownCoinMetadata: action.payload.dropdown,
        customCoinMetadata: action.payload.custom,
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
    case "SET_TRANSACTION_PROGRESS":
      return { ...state, transactionProgress: action.payload };
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
  const [logs, setLogs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Track processing state
  const searchParams = useSearchParams();
  const coinA = searchParams.get("coinA");
  const coinB = searchParams.get("coinB");
  const account = useCurrentAccount();
  const wallet = useCurrentWallet()?.currentWallet;
  const walletAddress = account?.address;
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { coins: predefinedCoins } = usePredefinedCoins();

  const decimalsA = state.dropdownCoinMetadata?.decimals ?? 9;
  const decimalsB = state.customCoinMetadata?.decimals ?? 9;

  useEffect(() => {
    if (coinA && coinB && predefinedCoins) {
      const predefinedCoin =
        predefinedCoins.find((c) => c.typeName === coinA) || predefinedCoins[0];

      dispatch({ type: "SET_COIN", payload: predefinedCoin });
      dispatch({ type: "SET_CUSTOM_COIN", payload: coinB });
    }
  }, [coinA, coinB, predefinedCoins]);

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]); // Append new log to state
  };

  // Coin types for the pool (derived from state)
  const coinTypeA = useMemo(
    () => state.dropdownCoinMetadata?.typeName,
    [state.dropdownCoinMetadata]
  );
  const coinTypeB = useMemo(
    () => state.customCoinMetadata?.typeName,
    [state.customCoinMetadata]
  );

  // Use our custom hooks
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

  useEffect(() => {
    if (isProcessing) {
      setIsModalOpen(true); // ✅ Ensures modal opens when processing starts
    }
  }, [isProcessing]); // ✅ Reacts when `isProcessing` changes

  // ✅ Fetch Pool Data
  const fetchPoolData = async () => {
    if (!state.customCoin.trim()) {
      addLog("⚠️ Please enter a valid token type for CoinB.");
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const tokenPair = `${
        state.selectedCoin.typeName
      }-${state.customCoin.trim()}`;
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
      addLog("⚠️ Failed to fetch pool info.");
    }

    dispatch({ type: "SET_LOADING", payload: false });
  };

  interface PoolFields {
    balance_a?: number;
    balance_b?: number;
    lp_supply?: { fields?: { value?: number } };
    burn_balance_b?: number;
    burn_fee?: number;
    creator_royalty_fee?: number;
    creator_royalty_wallet?: string;
    locked_lp_balance?: number;
    lp_builder_fee?: number;
    reward_balance_a?: number;
    rewards_fee?: number;
  }

  // Default pool stats object to avoid repetition
  const defaultPoolStats = {
    balance_a: 0,
    balance_b: 0,
    burn_balance_b: 0,
    burn_fee: 0,
    creator_royalty_fee: 0,
    creator_royalty_wallet: "",
    locked_lp_balance: 0,
    lp_builder_fee: 0,
    reward_balance_a: 0,
    rewards_fee: 0,
    lp_supply: 0,
  };

  //Fetch Pool Stats
  const fetchPoolStats = async (poolObjectId: string) => {
    if (!poolObjectId) return;

    dispatch({ type: "SET_POOL_STATS", payload: null });

    try {
      const poolObject = await provider.getObject({
        id: poolObjectId,
        options: { showContent: true },
      });

      if (poolObject?.data?.content && "fields" in poolObject.data.content) {
        const fields = poolObject.data.content.fields as PoolFields;

        dispatch({
          type: "SET_POOL_STATS",
          payload: {
            balance_a: fields.balance_a || 0,
            balance_b: fields.balance_b || 0,
            lp_supply: fields.lp_supply?.fields?.value || 0,
            burn_balance_b: fields.burn_balance_b || 0,
            burn_fee: fields.burn_fee || 0,
            creator_royalty_fee: fields.creator_royalty_fee || 0,
            creator_royalty_wallet: fields.creator_royalty_wallet || "",
            locked_lp_balance: fields.locked_lp_balance || 0,
            lp_builder_fee: fields.lp_builder_fee || 0,
            reward_balance_a: fields.reward_balance_a || 0,
            rewards_fee: fields.rewards_fee || 0,
          },
        });
      } else {
        dispatch({
          type: "SET_POOL_STATS",
          payload: defaultPoolStats,
        });
      }
    } catch (error) {
      addLog("⚠️ Failed to fetch pool stats. Please try again.");
      dispatch({
        type: "SET_POOL_STATS",
        payload: defaultPoolStats,
      });
    }
  };

  interface PoolStats {
    lp_supply: number | bigint;
    balance_a: number | bigint;
    balance_b: number | bigint;
  }

  const calculateMinLP = (
    depositA_MIST: number | bigint,
    depositB_MIST: number | bigint,
    poolStats: PoolStats,
    slippageTolerance: number
  ): bigint => {
    if (!poolStats || BigInt(poolStats.lp_supply) === BigInt(0)) {
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
    const minExpectedLP = BigInt(
      Math.min(Number(expectedLP_A), Number(expectedLP_B))
    );

    // ✅ Convert slippageTolerance into a `BigInt`-compatible scaling factor
    const slippageFactor = BigInt(
      Math.floor((1 - slippageTolerance / 100) * 1_000_000)
    );

    // ✅ Apply slippage tolerance correctly using only BigInt values
    const minLP = (minExpectedLP * slippageFactor) / BigInt(1_000_000);

    return minLP;
  };

  // ✅ Handle CoinA Deposit Input
  const handleCoinAChange = (value: string) => {
    if (!state.poolStats) return;

    const amountA = parseFloat(value) || 0;
    const balanceA = state.poolStats.balance_a / Math.pow(10, decimalsA);
    const balanceB = state.poolStats.balance_b / Math.pow(10, decimalsB);

    const amountB = balanceA > 0 ? (amountA * balanceB) / balanceA : 0; // Formula

    dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: value });
    dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: amountB.toFixed(4) });
  };

  // ✅ Handle CoinB Deposit Input
  const handleCoinBChange = (value: string) => {
    if (!state.poolStats) return;

    const amountB = parseFloat(value) || 0;
    const balanceA = state.poolStats.balance_a / Math.pow(10, decimalsA);
    const balanceB = state.poolStats.balance_b / Math.pow(10, decimalsB);

    const amountA = balanceB > 0 ? (amountB * balanceA) / balanceB : 0; // Formula

    dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: value });
    dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: amountA.toFixed(4) });
  };

  // ✅ Function to Handle Add Liquidity Transaction
  const handleAddLiquidity = async () => {
    setIsProcessing(true); // 🔥 Set processing state
    setIsModalOpen(true);
    setTimeout(() => setLogs([]), 100); // Slight delay to ensure UI updates
    const decimalsA = state.dropdownCoinMetadata?.decimals ?? 9;
    const decimalsB = state.customCoinMetadata?.decimals ?? 9;

    dispatch({
      type: "SET_TRANSACTION_PROGRESS",
      payload: {
        image: "/images/txn_loading.png",
        text: "Processing Transaction...",
      },
    });

    if (!wallet || !walletAddress) {
      addLog("⚠️ Please connect your wallet first.");
      dispatch({
        type: "SET_TRANSACTION_PROGRESS",
        payload: {
          image: "/images/txn_failed.png",
          text: "Transaction Failed",
        },
      });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const userAddress = walletAddress;

      if (!userAddress) {
        addLog("⚠️ No accounts found. Please reconnect your wallet.");
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

      if (
        !state.poolData?.poolId ||
        !state.dropdownCoinMetadata?.typeName ||
        !state.customCoinMetadata?.typeName
      ) {
        addLog("⚠️ Missing pool or coin metadata. Please restart the process.");
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

      const coinTypeA = state.dropdownCoinMetadata.typeName;
      // ✅ Get pre-fetched coins or refetch if needed
      // First ensure we refresh the data to get the latest state
      await refetchCoins();

      // If we still don't have the data, log an error
      if (!coinsA || !coinsB) {
        console.error("❌ Failed to load coin data", { coinError });
        addLog("❌ Failed to load coin data. Please try again.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // merge responses
      const coins = [...coinsA, ...coinsB];

      // ✅ Convert Deposit Amounts to MIST using our utility hook
      const depositA_U64 = toU64(state.depositDropdownCoin, decimalsA);
      const depositB_U64 = toU64(state.depositCustomCoin, decimalsB);

      // ✅ Ensure user has enough balance

      const coinABalance = await provider.getBalance({
        owner: userAddress,
        coinType: coinTypeA,
      });

      const coinBBalance = await provider.getBalance({
        owner: userAddress,
        coinType: coinTypeB,
      });

      if (
        BigInt(coinABalance.totalBalance) < depositA_U64 ||
        BigInt(coinBBalance.totalBalance) < depositB_U64
      ) {
        addLog("⚠️ Insufficient coin balance in wallet.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      addLog("✅ Balance Check Passed!");

      // ✅ Match a single coin object for CoinA with enough balance
      const expectedCoinA = state.dropdownCoinMetadata.typeName;

      // ✅ Match a single coin object for CoinB with enough balance
      const expectedCoinB = state.customCoinMetadata.typeName;

      // ✅ Get user-selected slippage
      const userSlippageTolerance = state.slippageTolerance || 0.5;

      // ✅ Calculate minimum LP tokens expected
      const minLpOut = calculateMinLP(
        depositA_U64,
        depositB_U64,
        state.poolStats,
        userSlippageTolerance
      );
      addLog("✅ Calculated min_lp_out: " + minLpOut.toString());

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
          depositA_U64
        );
        coinBInput = await getCoinInput(
          txb,
          coins,
          expectedCoinB,
          depositB_U64
        );

        // Set gas budget
        txb.setGasBudget(GAS_BUDGET);

        // Add the move call
        txb.moveCall({
          target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::add_liquidity_with_coins_and_transfer_to_sender`,
          typeArguments: [expectedCoinA, expectedCoinB],
          arguments: [
            txb.object(state.poolData.poolId), // Pool ID
            coinAInput,
            txb.pure.u64(depositA_U64),
            coinBInput,
            txb.pure.u64(depositB_U64),
            txb.pure.u64(minLpOut),
            txb.object("0x6"),
          ],
        });
      } catch (error: any) {
        addLog(`❌ Error: ${error.message}`);

        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      let executeResponse: any;

      await new Promise<void>((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb.serialize(),
            chain: "sui:mainnet", // or 'sui:devnet' if that's your environment
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

      addLog("✅ Transaction Submitted!");

      // ✅ Track Transaction Digest
      const txnDigest = executeResponse?.digest;
      addLog(`🔍 Transaction Digest: ${txnDigest}`);

      if (!txnDigest) {
        addLog("⚠️ Transaction failed.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // ✅ Wait for Transaction Confirmation
      addLog("🕒 Waiting for confirmation...");
      let txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        addLog("⚠️ Transaction not successful. Please retry.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      addLog("✅ Transaction Confirmed!");

      // ✅ Extract LiquidityAdded Event
      let liquidityEvent = txnDetails.events?.find((event) =>
        event.type.includes("LiquidityAdded")
      );

      if (!liquidityEvent) {
        await new Promise((res) => setTimeout(res, 5000));
        txnDetails = await fetchTransactionWithRetry(txnDigest);
        liquidityEvent = txnDetails?.events?.find((event) =>
          event.type.includes("LiquidityAdded")
        );
      }

      if (!liquidityEvent) {
        addLog("⚠️ Liquidity addition event missing. Please verify manually.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // ✅ Extract Liquidity Event Data
      const liquidityData: any = liquidityEvent.parsedJson;
      if (!liquidityData) {
        addLog("⚠️ Event detected but no data available.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // ✅ Store LP Minted Data in State
      dispatch({
        type: "SET_LIQUIDITY_DATA",
        payload: {
          poolId: liquidityData.pool_id,
          coinA: liquidityData.a,
          coinB: liquidityData.b,
          depositA:
            parseFloat(liquidityData.amountin_a) / Math.pow(10, decimalsA),
          depositB:
            parseFloat(liquidityData.amountin_b) / Math.pow(10, decimalsB),
          lpMinted: parseFloat(liquidityData.lp_minted) / 1e9,
          txnDigest: txnDigest,
        },
      });

      addLog("✅ Liquidity Successfully Added!");
      setIsProcessing(false); // ✅ Ensure modal does not close early
      dispatch({ type: "SET_STEP", payload: 3 });
    } catch (error) {
      addLog(
        `⚠️ Transaction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      setIsProcessing(false); // ✅ Ensure modal does not close early
      setTimeout(() => setIsModalOpen(false), 5000);
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

  return (
    <div className="min-h-screen overflow-y-auto flex flex-col md:flex-row bg-[#000306] p-4 md:p-6 pb-20">
      <div className="hidden md:block">
        <StepIndicator
          step={state.step}
          setStep={(step) => dispatch({ type: "SET_STEP", payload: step })}
        />
      </div>

      <div className="flex-1 p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Create Liquidity</h1>

        {/* Step 1: Select Coins */}
        {state.step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Coin Pair</h2>

            {/* Dropdown for Predefined Coins */}
            <div className="mb-4 relative">
              <label className="block text-slate-300 mb-2">
                <strong>Select First Coin:</strong>
              </label>
              <button
                className="rounded-none w-full flex items-center justify-between p-2 border border-slate-600 bg-[#130e18]"
                onClick={() => dispatch({ type: "TOGGLE_DROPDOWN" })}
              >
                <div className="flex items-center space-x-2">
                  <Avatar
                    src={state.selectedCoin?.image}
                    alt={state.selectedCoin?.symbol}
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{state.selectedCoin?.symbol}</span>
                </div>
                <span className="text-slate-400">▼</span>
              </button>

              {state.dropdownOpen && (
                <div className="absolute left-0 mt-1 w-full bg-[#130e18] border border-slate-600 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {predefinedCoins.filter((coin) => coin.lists?.includes("strict")).map((coin) => (
                    <div
                      key={coin.symbol}
                      className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer"
                      onClick={() =>
                        dispatch({ type: "SET_COIN", payload: coin })
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <Avatar
                          src={coin.image || "/default-coin.png"}
                          alt={coin.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="ml-2">{coin.symbol}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input field for custom coin */}
            <div className="mb-4">
              <label className="block text-slate-300">
                <strong>Enter Second Coin TypeName:</strong>
              </label>
              <input
                type="text"
                className="w-full p-2 border border-slate-600 bg-[#130e18] placeholder-slate-500"
                placeholder="Enter coin type (e.g., 0x2::sui::SUI)"
                value={state.customCoin}
                onChange={(e) =>
                  dispatch({ type: "SET_CUSTOM_COIN", payload: e.target.value })
                }
              />
            </div>

            {/* Display Pool Info */}
            <div className="mt-6 p-4 border border-slate-600 bg-[#000306] overflow-hidden">
              {!state.poolChecked ? (
                <p className="text-[#61F98A]">
                  <strong>Set your coin pair and click Get Pool Info</strong>
                </p>
              ) : state.poolData ? (
                <div>
                  <p className="text-slate-300 text-m font-semibold break-all">
                    Pool ID:{" "}
                    <span className="text-[#61F98A] text-m">
                      {state.poolData.poolId}
                    </span>
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    {/* CoinA */}
                    <div className="flex items-center space-x-2">
                      <Avatar
                        src={state.selectedCoin.image || "/default-coin.png"}
                        alt={state.selectedCoin.symbol}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-slate-300 text-m font-medium">
                        <strong>{state.selectedCoin.symbol}</strong>
                      </span>
                    </div>
                    <span className="text-slate-300 text-m font-medium">
                      <strong>/</strong>
                    </span>
                    {/* CoinB */}
                    <div className="flex items-center space-x-2">
                      <Avatar
                        src={
                          state.customCoinMetadata?.image || "/default-coin.png"
                        }
                        alt={state.customCoinMetadata?.symbol || "Token"}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-slate-300 text-m font-medium">
                        <strong>
                          {state.customCoinMetadata?.symbol
                            ? state.customCoinMetadata.symbol
                            : "Unknown"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[#61F98A]">
                  Pool not found. Create a new one.
                </p>
              )}
            </div>
            <div className="sticky bottom-0 pt-4 shadow-lg w-full flex flex-col sm:flex-row gap-2">
              <Button
                variant="primary"
                size="full"
                onClick={fetchPoolData}
                disabled={state.loading}
              >
                {state.loading ? "Fetching..." : "Get Pool Info"}
              </Button>

              {/* Navigation Button */}
              <Button
                variant="secondary"
                size="full"
                onClick={async () => {
                  if (state.poolData) {
                    await fetchPoolStats(state.poolData.poolId);

                    if (!state.poolStats) {
                      await fetchPoolStats(state.poolData.poolId); // Retry once
                    }

                    dispatch({ type: "SET_STEP", payload: 2 });
                  } else {
                    // ✅ Correctly placed else statement
                    router.push("/pools/create-pool");
                  }
                }}
                disabled={!state.poolChecked}
              >
                {state.poolData ? "Next" : "Create Pool"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Deposit Liquidity */}
        {state.step === 2 &&
          state.dropdownCoinMetadata &&
          state.customCoinMetadata &&
          state.poolStats && (
            <div className="pb-20">
              <h2 className="text-xl font-semibold mb-4">Deposit Liquidity</h2>

              {/* Pool Stats */}
              <div className="border border-slate-600 p-3 md:p-4 shadow-md mb-4 text-sm md:text-base">
                <h2 className="text-lg font-semibold text-slate-300">
                  Pool Stats
                </h2>

                {/* Balances */}
                <h3 className="text-sm font-semibold text-slate-300">
                  <strong>Balances</strong>
                </h3>
                <p className="text-sm text-slate-400">
                  <strong>
                    Balance Coin A:{" "}
                    {(
                      state.poolStats.balance_a / Math.pow(10, decimalsA)
                    ).toFixed(4)}
                  </strong>
                </p>
                <p className="text-sm text-slate-400">
                  <strong>
                    Balance Coin B:{" "}
                    {(
                      state.poolStats.balance_b / Math.pow(10, decimalsB)
                    ).toFixed(4)}
                  </strong>
                </p>
                <p className="text-sm text-slate-400">
                  <strong>
                    Pool Locked Coins:{" "}
                    {(state.poolStats.burn_balance_b / 1e9).toFixed(4)}
                  </strong>
                </p>
                <p className="text-sm text-slate-400">
                  <strong>
                    Pool Locked LP:{" "}
                    {(state.poolStats.locked_lp_balance / 1e9).toFixed(4)}
                  </strong>
                </p>

                {/* Fees */}
                <h3 className="text-sm font-semibold text-slate-300 mt-2">
                  <strong>Fees</strong>
                </h3>
                <p className="text-sm text-slate-400">
                  <strong>
                    LP Builder Fee:{" "}
                    {(state.poolStats.lp_builder_fee / 100).toFixed(2)}%
                  </strong>
                </p>
                <p className="text-sm text-slate-400">
                  <strong>
                    Burn Fee: {(state.poolStats.burn_fee / 100).toFixed(2)}%
                  </strong>
                </p>
                <p className="text-sm text-slate-400">
                  <strong>
                    Rewards Fee:{" "}
                    {(state.poolStats.rewards_fee / 100).toFixed(2)}%
                  </strong>
                </p>
                <p className="text-sm text-slate-400">
                  <strong>
                    Creator Royalty Fee:{" "}
                    {(state.poolStats.creator_royalty_fee / 100).toFixed(2)}%
                  </strong>
                </p>
              </div>

              {/* Slippage Tolerance Input */}
              <div className="bg-[#000306] border border-slate-600 p-4 shadow-md mb-4">
                <h2 className="text-lg font-semibold text-slate-300">
                  Slippage Tolerance
                </h2>
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="number"
                    className="bg-[#130e18] text-lg md:text-2xl font-semibold p-2 w-full md:w-20 border border-slate-600 outline-none"
                    placeholder="0.5"
                    value={state.slippageTolerance}
                    onChange={(e) => {
                      let newSlippage = parseFloat(e.target.value);
                      if (isNaN(newSlippage) || newSlippage < 0)
                        newSlippage = 0;
                      if (newSlippage > 5) newSlippage = 5; // Limit slippage between 0% and 5%
                      dispatch({ type: "SET_SLIPPAGE", payload: newSlippage });
                    }}
                  />
                  <span className="text-lg font-medium">%</span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  Set the maximum slippage tolerance.
                </p>
              </div>

              {/* Deposit Inputs */}
              <div className="border border-slate-600 p-4 shadow-md mb-4">
                <h2 className="text-lg font-semibold text-slate-300">
                  Deposit Tokens
                </h2>

                <div className="flex items-center p-3 bg-[#130e18] border border-slate-600 mb-2">
                  <Image
                    src={
                      state.dropdownCoinMetadata?.image || "/default-coin.png"
                    }
                    alt={state.dropdownCoinMetadata?.symbol || "Coin A"}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                  <span className="text-slate-300 font-medium mr-2">
                    <strong>
                      {state.dropdownCoinMetadata?.symbol || "Coin A"}
                    </strong>
                  </span>
                  <input
                    type="number"
                    className="bg-transparent text-2xl font-semibold w-full outline-none"
                    placeholder="0"
                    value={state.depositDropdownCoin}
                    onChange={(e) => handleCoinAChange(e.target.value)}
                  />
                </div>

                <div className="flex items-center p-3 bg-[#130e18] border border-slate-600 mb-2">
                  <Image
                    src={state.customCoinMetadata?.image || "/default-coin.png"}
                    alt={state.customCoinMetadata?.symbol || "Coin B"}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                  <span className="text-slate-300 font-medium mr-2">
                    <strong>
                      {state.customCoinMetadata?.symbol || "Coin B"}
                    </strong>
                  </span>
                  <input
                    type="number"
                    className="bg-transparent text-2xl font-semibold w-full outline-none"
                    placeholder="0"
                    value={state.depositCustomCoin}
                    onChange={(e) => handleCoinBChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 pt-4 shadow-lg w-full flex flex-col sm:flex-row gap-2">
                {/* Add Liquidity Button */}
                <Button
                  variant="secondary"
                  size="full"
                  onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}
                >
                  Back
                </Button>

                <Button
                  variant="primary"
                  size="full"
                  onClick={handleAddLiquidity}
                  disabled={
                    !state.depositDropdownCoin ||
                    !state.depositCustomCoin ||
                    state.loading
                  }
                >
                  {state.loading ? "Processing..." : "Add Liquidity"}
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

        {/* Step 3: Liquidity Confirmation */}
        {state.step === 3 && state.liquidityData && (
          <div className="pb-20">
            <h2 className="text-xl font-semibold mb-4">
              Liquidity Successfully Added! 🎉
            </h2>

            <div className="bg-[#130e18] border border-[#61F98A] p-4 shadow-md mb-4">
              <h3 className="text-lg font-semibold text-[#61F98A]">
                Transaction Summary
              </h3>

              <p className="text-[#61F98A] text-sm font-semibold">
                Liquidity Pool:
              </p>
              <p className="text-slate-300 text-sm break-all">
                {state.liquidityData.poolId}
              </p>

              <h3 className="text-sm font-semibold text-[#61F98A] mt-2">
                Your Deposits:
              </h3>
              <p className="text-sm text-slate-300">
                {state.liquidityData.depositA.toFixed(4)}{" "}
                {state.dropdownCoinMetadata?.symbol}
              </p>
              <p className="text-sm text-slate-300">
                {state.liquidityData.depositB.toFixed(4)}{" "}
                {state.customCoinMetadata?.symbol}
              </p>

              <h3 className="text-sm font-semibold text-[#61F98A] mt-2">
                LP Tokens Minted:
              </h3>
              <p className="text-sm text-slate-300">
                {state.liquidityData.lpMinted.toFixed(4)} LP Tokens
              </p>

              <h3 className="text-sm font-semibold text-[#61F98A] mt-2">
                Transaction Digest:
              </h3>
              <p
                className="text-sm text-[#61F98A] underline break-all cursor-pointer hover:text-[#52d879] transition-colors duration-300"
                onClick={() =>
                  window.open(
                    `https://suiexplorer.com/tx/${state.liquidityData.txnDigest}`,
                    "_blank"
                  )
                }
              >
                {state.liquidityData.txnDigest}
              </p>
            </div>

            {/* Final Action */}
            <Button
              variant="secondary"
              size="full"
              onClick={() => router.push("/pools")}
            >
              Back to Pools
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
