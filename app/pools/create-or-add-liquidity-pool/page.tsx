"use client";
import useConvertToU64 from "@/app/hooks/useConvertToU64";
import useGetCoinInput from "@/app/hooks/useGetCoinInput";
import useGetPoolCoins from "@/app/hooks/useGetPoolCoins";
import TransactionModal from "@components/TransactionModal";
import { predefinedCoins, whitelistedCoins } from "@data/coins";
import {
    useCurrentAccount,
    useCurrentWallet,
    useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Spinner } from "../../components/Spinner";
import Button from "../../components/UI/Button";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
    CONFIG_ID,
    DEX_MODULE_NAME,
    FACTORY_ID,
    GETTER_RPC,
    LOCK_ID,
    PACKAGE_ID,
} from "../../config";
import { Coin, CoinMeta } from "@/app/types";
import { isValidSuiAddress } from "@mysten/sui/utils";

const provider = new SuiClient({ url: GETTER_RPC });

interface State {
    selectedCoin: Coin;
    selectedCustomCoin: Coin;
    customCoin: string;
    poolData: any;
    dropdownCoinMetadata: Coin;
    customCoinMetadata: Coin;
    depositDropdownCoin: string;
    depositCustomCoin: string;
    loading: boolean;
    step: number;
    poolChecked: boolean;
    dropdownOpen: boolean;
    customDropdownOpen: boolean;
    poolStats: any;
    liquidityData: any;
    slippageTolerance: number;
    lpBuilderFee: number;
    buybackBurnFee: number;
    deployerRoyaltyFee: number;
    rewardsFee: number;
    deployerRoyaltyWallet: string;
    initialPrice: number;
    initialPriceMode: string;
    isCreatingNewPool: boolean;
}

// Initial state for the reducer
const initialState: State = {
  selectedCoin: predefinedCoins[0], // CoinA
  selectedCustomCoin: predefinedCoins[1], // CoinB
  customCoin: predefinedCoins[1].typeName, // CoinB (user input)
  poolData: null, // Stores Pool ID & Coin Metadata
  dropdownCoinMetadata: predefinedCoins[0], // Stores metadata for dropdown-selected coin
  customCoinMetadata: predefinedCoins[1], // Stores metadata for custom coin
  depositDropdownCoin: "", // Amount of CoinA user wants to deposit
  depositCustomCoin: "", // Amount of CoinB user wants to deposit
  loading: false,
  step: 0, // Default to Step 1
  poolChecked: false, // Track if the pool check was done
  dropdownOpen: false, // Track dropdown state
  customDropdownOpen: false, // Track custom dropdown state
  poolStats: null, // Pool statistics
  liquidityData: null, // Data about added liquidity
  slippageTolerance: 0.5, // Default slippage tolerance
  // Additional fields for pool creation
  lpBuilderFee: 0, // Fee for LP builder (pool creator)
  buybackBurnFee: 0, // Fee for buyback and burn
  deployerRoyaltyFee: 0, // Fee for deployer royalty
  rewardsFee: 0, // Fee for rewards
  deployerRoyaltyWallet: "", // Wallet for deployer royalty
  initialPrice: 0, // Initial price for the pool
  initialPriceMode: "customPerDropdown", // Price mode (customPerDropdown or dropdownPerCustom)
  isCreatingNewPool: false, // Track if user is creating a new pool
};

// Reducer function to handle state updates
function reducer(state: State, action: { type: string; payload?: any }) {
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
      return { ...state, poolData: action.payload };
    case "SET_POOL_CHECKED":
      return { ...state, poolChecked: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "TOGGLE_DROPDOWN":
      return { ...state, dropdownOpen: !state.dropdownOpen };
    case "TOGGLE_CUSTOM_DROPDOWN":
      return { ...state, customDropdownOpen: !state.customDropdownOpen };
    case "SET_COIN":
      return { ...state, selectedCoin: action.payload, dropdownOpen: false };
    case "SET_COINB":
      return { ...state, selectedCustomCoin: action.payload, customDropdownOpen: false };
    case "SET_CUSTOM_COIN":
      return { ...state, customCoin: action.payload };
    case "SET_POOL_STATS":
      return { ...state, poolStats: action.payload };
    case "SET_LIQUIDITY_DATA":
      return { ...state, liquidityData: action.payload };
    case "SET_SLIPPAGE":
      return { ...state, slippageTolerance: action.payload };
    case "SET_CREATING_NEW_POOL":
      return { ...state, isCreatingNewPool: action.payload };
    case "SET_LP_BUILDER_FEE":
      return { ...state, lpBuilderFee: action.payload };
    case "SET_BUYBACK_BURN_FEE":
      return { ...state, buybackBurnFee: action.payload };
    case "SET_DEPLOYER_ROYALTY_FEE":
      return { ...state, deployerRoyaltyFee: action.payload };
    case "SET_REWARDS_FEE":
      return { ...state, rewardsFee: action.payload };
    case "SET_DEPLOYER_ROYALTY_WALLET":
      return { ...state, deployerRoyaltyWallet: action.payload };
    case "SET_INITIAL_PRICE":
      return { ...state, initialPrice: action.payload };
    case "SET_INITIAL_PRICE_MODE":
      return { ...state, initialPriceMode: action.payload };
    case "SET_INITIAL_DEPOSIT_VALUES":
      if (state.initialPriceMode === "customPerDropdown") {
        return {
          ...state,
          depositDropdownCoin: action.payload,
          depositCustomCoin:
            state.initialPrice > 0
              ? (parseFloat(action.payload) * state.initialPrice).toFixed(6)
              : "",
        };
      } else {
        return {
          ...state,
          depositDropdownCoin: action.payload,
          depositCustomCoin:
            state.initialPrice > 0
              ? (parseFloat(action.payload) / state.initialPrice).toFixed(6)
              : "",
        };
      }
    default:
      return state;
  }
}

// Helper function to format coin values
const formatCoinValue = (valueInAtomic: number, decimals: number): string => {
  const factor = Math.pow(10, decimals);
  const formatted = valueInAtomic / factor;
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};

// Main component function
export default function CreateOrAddLiquidityPool() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Track processing state
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const coinA = searchParams.get("coinA");
  const coinB = searchParams.get("coinB");
  const account = useCurrentAccount();
  const wallet = useCurrentWallet()?.currentWallet;
  const walletAddress = account?.address;
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const decimalsA = state.dropdownCoinMetadata?.decimals ?? 9;
  const decimalsB = state.customCoinMetadata?.decimals ?? 9;

  // Initialize from URL parameters if available
  useEffect(() => {
    if (coinA && coinB) {
      const predefinedCoin =
        predefinedCoins.find((c) => c.typeName === coinA) || predefinedCoins[0];

      dispatch({ type: "SET_COIN", payload: predefinedCoin });
      dispatch({ type: "SET_CUSTOM_COIN", payload: coinB });
    }
  }, [coinA, coinB]);

  // Open modal when processing starts
  useEffect(() => {
    if (isProcessing) {
      setIsModalOpen(true);
    }
  }, [isProcessing]);



  // Helper to add logs to the state
  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, message]);
  };

  // Handle copying text to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);

    // Hide the message after 2 seconds
    setTimeout(() => setCopiedText(null), 2000);
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

  // Use custom hooks
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

  const handleBackToStep = (step: number) => {
    setIsProcessing(false);
    setIsModalOpen(false);
    setIsLoading(false);

    dispatch({ type: "SET_STEP", payload: step });
    dispatch({ type: "SET_POOL_DATA", payload: null });
    dispatch({ type: "SET_POOL_CHECKED", payload: false });
    dispatch({ type: "SET_POOL_STATS", payload: null });
    dispatch({ type: "SET_LIQUIDITY_DATA", payload: null });
    dispatch({ type: "SET_SLIPPAGE", payload: 0 });
    dispatch({ type: "SET_CREATING_NEW_POOL", payload: false });
    dispatch({ type: "SET_LP_BUILDER_FEE", payload: 0 });
    dispatch({ type: "SET_BUYBACK_BURN_FEE", payload: 0 });
    dispatch({ type: "SET_DEPLOYER_ROYALTY_FEE", payload: 0 });
    dispatch({ type: "SET_REWARDS_FEE", payload: 0 });
    dispatch({ type: "SET_DEPLOYER_ROYALTY_WALLET", payload: "" });
    dispatch({ type: "SET_INITIAL_PRICE", payload: 0 });
    dispatch({ type: "SET_INITIAL_PRICE_MODE", payload: "customPerDropdown" });
    dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: "" });
    dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: "" });
    dispatch({ type: "SET_CUSTOM_COIN", payload: "" });
    dispatch({ type: "SET_METADATA", payload: { dropdown: null, custom: null } });
    dispatch({ type: "SET_FEES", payload: { lpBuilderFee: 0, buybackBurnFee: 0, deployerRoyaltyFee: 0, rewardsFee: 0 } });
    dispatch({ type: "SET_WALLET", payload: "" });
  };

  const handleCustomCoinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    
    // First update the input field value immediately
    dispatch({ type: "SET_CUSTOM_COIN", payload: value });
    
    if (!value) {
      // Clear pool data if input is empty
      dispatch({ type: "SET_POOL_DATA", payload: null });
      dispatch({ type: "SET_POOL_CHECKED", payload: false });
      return;
    }
    
    // Set loading state before API call
    setIsLoading(true);
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      // Fetch pool data and wait for it to complete
      await fetchPoolData(value);
    } catch (error) {
      console.error("Error in handleCustomCoinChange:", error);
    } finally {
      setIsLoading(false);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleCustomCoinDropdownChange = async (coin: CoinMeta) => {
    if (!coin) {
      dispatch({ type: "SET_CUSTOM_COIN", payload: "" });
      dispatch({ type: "SET_POOL_DATA", payload: null });
      dispatch({ type: "SET_POOL_CHECKED", payload: false });
      return;
    }
    
    // Update coin selection immediately
    dispatch({ type: "SET_COINB", payload: coin });
    
    // Set loading state before API call
    setIsLoading(true);
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      // Fetch pool data with the selected coin type
      await fetchPoolData(coin.typeName);
    } catch (error) {
      console.error("Error in handleCustomCoinDropdownChange:", error);
    } finally {
      // Loading state will be cleaned up in fetchPoolData
    }
  };

  // Fetch Pool Data function to check if pool exists
  const fetchPoolData = async (customCoin?: string) => {
    if (!customCoin) {
      alert("Please enter a valid token type for CoinB.");
      return;
    }
    
    // Don't set loading state here if it's already being set in the calling function
    if (!isLoading) {
      setIsLoading(true);
      dispatch({ type: "SET_LOADING", payload: true });
    }

    try {
      // Clear previous pool data first
      dispatch({ type: "SET_POOL_CHECKED", payload: false });
      
      const tokenPair = `${state.selectedCoin.typeName}-${customCoin}`;
      console.log("Fetching pool data for token pair:", tokenPair);
      
      const res = await fetch(`/api/get-pool-id?tokenPair=${tokenPair}`);
      const data = await res.json();
      console.log("Pool Data API Response:", data);
      
      if (res.ok && data && data.poolId) {
        // Pool exists - update state with pool data
        console.log("Pool found - setting existing pool data");
        
        dispatch({
          type: "SET_POOL_DATA",
          payload: data,
        });

        // Ensure custom coin metadata is stored correctly
        dispatch({
          type: "SET_METADATA",
          payload: {
            dropdown: state.selectedCoin,
            custom: {
              ...data.coinB_metadata,
              typeName: customCoin,
            },
          },
        });

        // Set isCreatingNewPool to false as we found an existing pool
        dispatch({ type: "SET_CREATING_NEW_POOL", payload: false });
        
        // Set pool checked flag to true
        dispatch({ type: "SET_POOL_CHECKED", payload: true });
      } else {
        // Pool doesn't exist - clear pool data and set for creating new pool
        console.log("Pool not found - setting up for new pool creation");
        
        dispatch({ type: "SET_POOL_DATA", payload: null });
        dispatch({ type: "SET_CREATING_NEW_POOL", payload: true });
        
        // Still mark as checked since we did the verification
        dispatch({ type: "SET_POOL_CHECKED", payload: true });
      }
    } catch (error) {
      console.error("Error fetching pool data:", error);
      // Reset states on error
      dispatch({ type: "SET_POOL_DATA", payload: null });
      dispatch({ type: "SET_POOL_CHECKED", payload: false });
    } finally {
      // Only fetch metadata if we need to (don't do this when just checking if pool exists)
      await fetchMetadata(customCoin);
      
      // Always clean up the loading state at the end
      dispatch({ type: "SET_LOADING", payload: false });
      setIsLoading(false);
    }
  };

  // Fetch Coin Metadata (for pool creation workflow)
  const fetchMetadata = async (customCoin?: string) => {
    if (!customCoin) {
      console.warn("No custom coin type provided to fetchMetadata");
      return;
    }
    
    // Only set loading state if not already loading
    if (!isLoading) {
      setIsLoading(true);
      dispatch({ type: "SET_LOADING", payload: true });
    }
    
    console.log(`Fetching metadata for coins: ${state.selectedCoin?.typeName} and ${customCoin}`);

    try {
      // Fetch metadata for dropdown coin and custom coin
      const [dropdownMetadata, customMetadata] = await Promise.all([
        provider.getCoinMetadata({ coinType: state.selectedCoin?.typeName }),
        provider.getCoinMetadata({ coinType: customCoin }),
      ]);

      console.log("Metadata API response:", { dropdownMetadata, customMetadata });

      if (dropdownMetadata && customMetadata) {
        // Both metadata objects are available
        const metadataPayload = {
          dropdown: {
            typeName: state.selectedCoin?.typeName,
            symbol: dropdownMetadata.symbol,
            name: dropdownMetadata.name,
            decimals: dropdownMetadata.decimals,
            image: dropdownMetadata.iconUrl || state.selectedCoin?.image,
          },
          custom: {
            typeName: customCoin,
            symbol: customMetadata.symbol,
            name: customMetadata.name,
            decimals: customMetadata.decimals,
            image: customMetadata.iconUrl || "/default-coin2.png",
          },
        };
        
        console.log("Setting metadata in state:", metadataPayload);
        
        dispatch({
          type: "SET_METADATA",
          payload: metadataPayload,
        });
        
        // // Only proceed to next step if all data is valid
        // if (state.step === 1 && state.isCreatingNewPool) {
        //   dispatch({ type: "SET_STEP", payload: 2 });
        // }

      } else {
        // Handle missing metadata
        console.warn("Metadata fetch incomplete:", { 
          dropdownAvailable: !!dropdownMetadata, 
          customAvailable: !!customMetadata 
        });
        
        if (!customMetadata) {
          // If custom token metadata is missing, we might need special handling
          console.warn("Custom token metadata not found. Might be an invalid token type.");
        }
      }
    } catch (error: any) {
      console.error("Error fetching coin metadata:", error);
      // Don't show alerts - just log errors
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      setIsLoading(false);
    }
  };

  // Interface for pool fields
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

  // Fetch Pool Stats for existing pools
  const fetchPoolStats = async (poolObjectId: string) => {
    if (!poolObjectId) return;

    console.log("Fetching Pool Stats with ID:", poolObjectId);
    dispatch({ type: "SET_POOL_STATS", payload: null });

    try {
      const poolObject = await provider.getObject({
        id: poolObjectId,
        options: { showContent: true },
      });

      console.log("Pool Object Response:", poolObject);

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
        console.warn("Missing pool fields:", poolObject);
        dispatch({
          type: "SET_POOL_STATS",
          payload: {
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
          },
        });
      }
    } catch (error) {
      console.error("Error fetching pool stats:", error);
      alert("Failed to fetch pool stats. Please try again.");
      dispatch({
        type: "SET_POOL_STATS",
        payload: {
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
        },
      });
    }
  };

  // Interface for Pool Stats
  interface PoolStats {
    lp_supply: number | bigint;
    balance_a: number | bigint;
    balance_b: number | bigint;
  }

  // Calculate minimum LP tokens considering slippage
  const calculateMinLP = (
    depositA_MIST: number | bigint,
    depositB_MIST: number | bigint,
    poolStats: PoolStats,
    slippageTolerance: number
  ): bigint => {
    if (!poolStats || BigInt(poolStats.lp_supply) === BigInt(0)) {
      return BigInt(0);
    }

    // Convert pool balances and LP supply to BigInt
    const lpSupply = BigInt(poolStats.lp_supply);
    const poolA = BigInt(poolStats.balance_a);
    const poolB = BigInt(poolStats.balance_b);

    if (poolA === BigInt(0) || poolB === BigInt(0)) {
      return BigInt(0);
    }

    // Ensure deposit amounts are also BigInt
    const depositA = BigInt(depositA_MIST);
    const depositB = BigInt(depositB_MIST);

    // Calculate expected LP tokens for both coins
    const expectedLP_A = (lpSupply * depositA) / poolA;
    const expectedLP_B = (lpSupply * depositB) / poolB;

    // Find the smaller value (to match the smallest contribution)
    const minExpectedLP = BigInt(
      Math.min(Number(expectedLP_A), Number(expectedLP_B))
    );

    // Convert slippageTolerance into a BigInt-compatible scaling factor
    const slippageFactor = BigInt(
      Math.floor((1 - slippageTolerance / 100) * 1_000_000)
    );

    // Apply slippage tolerance correctly using only BigInt values
    const minLP = (minExpectedLP * slippageFactor) / BigInt(1_000_000);

    return minLP;
  };

  // Handle CoinA deposit input for add liquidity workflow
  const handleCoinAChange = (value: string) => {
    if (!state.poolStats) return;

    const amountA = parseFloat(value) || 0;
    const balanceA = state.poolStats.balance_a / Math.pow(10, decimalsA);
    const balanceB = state.poolStats.balance_b / Math.pow(10, decimalsB);

    const amountB = balanceA > 0 ? (amountA * balanceB) / balanceA : 0;

    dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: value });
    dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: amountB.toFixed(4) });
  };

  // Handle CoinB deposit input for add liquidity workflow
  const handleCoinBChange = (value: string) => {
    if (!state.poolStats) return;

    const amountB = parseFloat(value) || 0;
    const balanceA = state.poolStats.balance_a / Math.pow(10, decimalsA);
    const balanceB = state.poolStats.balance_b / Math.pow(10, decimalsB);

    const amountA = balanceB > 0 ? (amountB * balanceA) / balanceB : 0;

    dispatch({ type: "SET_DEPOSIT_CUSTOM", payload: value });
    dispatch({ type: "SET_DEPOSIT_DROPDOWN", payload: amountA.toFixed(4) });
  };

  // Handle initial coin input for create pool workflow
  const handleInitialCoinAChange = (value: string) => {
    dispatch({ type: "SET_INITIAL_DEPOSIT_VALUES", payload: value });
  };

  // Retry function to wait for transaction propagation
  const fetchTransactionWithRetry = async (
    txnDigest: string,
    retries = 20,
    delay = 5000
  ) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `Attempt ${attempt}: Fetching transaction details for digest: ${txnDigest}`
        );
        const txnDetails = await provider.getTransactionBlock({
          digest: txnDigest,
          options: { showEffects: true, showEvents: true },
        });

        if (txnDetails) {
          console.log("Full Transaction Details:", txnDetails);

          if (txnDetails.effects && txnDetails.effects.status) {
            console.log("Transaction Status:", txnDetails.effects.status);

            if (txnDetails.effects.status.status === "success") {
              return txnDetails; // Transaction confirmed
            } else {
              console.error(
                "Transaction Failed!",
                txnDetails.effects.status.error
              );
              return null; // Stop if transaction failed
            }
          }
        }
      } catch (error) {
        console.warn(
          `Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`,
          error
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    console.error(
      "All retry attempts failed. Transaction might not be indexed yet."
    );
    return null;
  };

  // Handle CreatePool Transaction
  const handleCreatePool = async () => {
    setLogs([]); // Clear previous logs
    setIsProcessing(true); // Set processing state
    setIsModalOpen(true); // Open modal

    if (!wallet || !walletAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const userAddress = walletAddress;
      console.log("Using wallet address:", userAddress);

      // Validate metadata before proceeding
      if (
        !state.dropdownCoinMetadata?.typeName ||
        !state.customCoinMetadata?.typeName
      ) {
        alert(
          "Coin metadata is missing! Please go back and reselect your tokens."
        );
        console.error("Metadata is missing!", {
          dropdownCoinMetadata: state.dropdownCoinMetadata,
          customCoinMetadata: state.customCoinMetadata,
        });
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Validate fee inputs
      if (
        state.lpBuilderFee < 0 ||
        state.buybackBurnFee < 0 ||
        state.deployerRoyaltyFee < 0 ||
        state.rewardsFee < 0
      ) {
        alert("Fees cannot be negative!");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Validate total fees don't exceed 30%
      const totalFees =
        state.lpBuilderFee +
        state.buybackBurnFee +
        state.deployerRoyaltyFee +
        state.rewardsFee;
      if (totalFees > 14) {
        alert("Total fees cannot exceed 14%!");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Validate deployer royalty wallet if fee is set
      if (
        state.deployerRoyaltyFee > 0 &&
        (!state.deployerRoyaltyWallet ||
          !isValidSuiAddress(state.deployerRoyaltyWallet))
      ) {
        alert("Please enter a valid deployer royalty wallet address!");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Validate initial liquidity
      if (
        !state.depositDropdownCoin ||
        !state.depositCustomCoin ||
        parseFloat(state.depositDropdownCoin) <= 0 ||
        parseFloat(state.depositCustomCoin) <= 0
      ) {
        alert("Please enter valid amounts for initial liquidity!");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Get coin types
      const expectedCoinA = state.dropdownCoinMetadata?.typeName;
      const expectedCoinB = state.customCoinMetadata?.typeName;

      // Convert deposit amounts to MIST
      const depositDropdownMIST = toU64(
        state.depositDropdownCoin,
        state.dropdownCoinMetadata?.decimals || 9
      );
      const depositCustomMIST = toU64(
        state.depositCustomCoin,
        state.customCoinMetadata?.decimals || 9
      );

      console.log("Deposit amounts (MIST):", {
        coinA: depositDropdownMIST.toString(),
        coinB: depositCustomMIST.toString(),
      });

      // Ensure we have fresh coin data
      await refetchCoins();

      // Check if we have the coins data
      if (!coinsA || !coinsB) {
        console.error("Failed to load coin data", { coinError });
        addLog("Failed to load coin data. Please try again.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Combine coins for easier access
      const coins = [...coinsA, ...coinsB];

      // Create transaction block
      const txb = new TransactionBlock();

      let coinAInput;
      let coinBInput;

      const GAS_BUDGET = 150_000_000;

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
      } catch (error: any) {
        console.error("Error preparing coin inputs:", error);
        addLog(`Error: ${error.message}`);
        alert(`${error.message}`);
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      txb.setGasBudget(GAS_BUDGET);

      // Execute the create_pool transaction
      txb.moveCall({
        target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::create_pool`,
        typeArguments: [expectedCoinA, expectedCoinB],
        arguments: [
          txb.object(CONFIG_ID), // Config object ID
          coinAInput, // Coin A input
          txb.pure.u64(depositDropdownMIST), // Coin A amount
          coinBInput, // Coin B input
          txb.pure.u64(depositCustomMIST), // Coin B amount
          txb.pure.u16(state.lpBuilderFee * 100), // LP builder fee (scaled by 100)
          txb.pure.u16(state.buybackBurnFee * 100), // Buyback & burn fee (scaled by 100)
          txb.pure.u16(state.rewardsFee * 100), // Rewards fee (scaled by 100)
          txb.pure.u16(state.deployerRoyaltyFee * 100), // Deployer royalty fee (scaled by 100)
          state.deployerRoyaltyFee > 0
            ? txb.pure.address(state.deployerRoyaltyWallet) // Deployer royalty wallet if fee > 0
            : txb.pure.address(
                "0x0000000000000000000000000000000000000000000000000000000000000000"
              ), // Default address if no fee
          txb.object(FACTORY_ID), // Factory object ID
          txb.object(LOCK_ID), // Lock object ID
          txb.object("0x6"), // System parameter
        ],
      });

      let executeResponse: { digest: string } | undefined;

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb.serialize(),
            chain: "sui:mainnet", // or 'sui:devnet' if that's your environment
          },
          {
            onSuccess: (result) => {
              executeResponse = result;
              resolve(result);
            },
            onError: (error) => {
              console.error("Create pool transaction failed:", error);
              addLog(`Transaction failed: ${error.message}`);
              alert("Create pool transaction failed. See console for details.");
              reject(error);
            },
          }
        );
      });

      addLog("Transaction Submitted!");

      // Track Transaction Digest
      const txnDigest = executeResponse?.digest;
      addLog(`Transaction Digest: ${txnDigest}`);

      if (!txnDigest) {
        alert("Transaction failed. Please check the console.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Wait for Transaction Confirmation
      addLog("Waiting for confirmation...");
      let txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        alert("Transaction not successful. Please retry.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      addLog("Transaction Confirmed!");

      // Extract PoolCreated Event
      let poolEvent = txnDetails.events?.find((event) =>
        event.type.includes("PoolCreated")
      );

      if (!poolEvent) {
        console.warn("PoolCreated event missing! Retrying...");
        await new Promise((res) => setTimeout(res, 5000));
        txnDetails = await fetchTransactionWithRetry(txnDigest);
        poolEvent = txnDetails?.events?.find((event) =>
          event.type.includes("PoolCreated")
        );
      }

      if (!poolEvent) {
        alert("Pool creation event missing. Please verify manually.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Extract Pool Event Data
      const poolData = poolEvent.parsedJson as { pool_id: string, initial_lp?: string };
      if (!poolData) {
        alert("Event detected but no data available.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      console.log("Pool Event Data:", poolData);

      // Store Pool Data in State
      dispatch({
        type: "SET_POOL_DATA",
        payload: {
          poolId: poolData.pool_id,
          coinA_metadata: state.dropdownCoinMetadata,
          coinB_metadata: state.customCoinMetadata,
        },
      });

      // Also store it in liquidity data format for the final step
      dispatch({
        type: "SET_LIQUIDITY_DATA",
        payload: {
          poolId: poolData.pool_id,
          coinA: state.dropdownCoinMetadata?.typeName,
          coinB: state.customCoinMetadata?.typeName,
          depositA: parseFloat(state.depositDropdownCoin),
          depositB: parseFloat(state.depositCustomCoin),
          lpMinted: parseFloat(poolData.initial_lp || '0') / 1e9,
          txnDigest: txnDigest,
        },
      });

      addLog("Pool Successfully Created!");
      setIsProcessing(false);
      dispatch({ type: "SET_STEP", payload: 3 });
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Check the console.");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      setIsProcessing(false);
      setTimeout(() => setIsModalOpen(false), 5000);
    }
  };

  // Handle Add Liquidity Transaction
  const handleAddLiquidity = async () => {
    setIsProcessing(true);
    setIsModalOpen(true);
    setTimeout(() => setLogs([]), 100); // Slight delay to ensure UI updates
    const decimalsA = state.dropdownCoinMetadata?.decimals ?? 9;
    const decimalsB = state.customCoinMetadata?.decimals ?? 9;

    if (!wallet || !walletAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const userAddress = walletAddress;

      if (!userAddress) {
        alert("No accounts found. Please reconnect your wallet.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      if (
        !state.poolData?.poolId ||
        !state.dropdownCoinMetadata?.typeName ||
        !state.customCoinMetadata?.typeName
      ) {
        alert("Missing pool or coin metadata. Please restart the process.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      console.log("Pool ID:", state.poolData.poolId);
      console.log(
        "Coin Types:",
        state.dropdownCoinMetadata.typeName,
        state.customCoinMetadata.typeName
      );
      const coinTypeA = state.dropdownCoinMetadata.typeName;
      const coinTypeB = state.customCoinMetadata.typeName;

      // First ensure we refresh the data to get the latest state
      await refetchCoins();

      // If we still don't have the data, log an error
      if (!coinsA || !coinsB) {
        console.error("Failed to load coin data", { coinError });
        addLog("Failed to load coin data. Please try again.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      console.log("Owned Coin Objects:", { coinsA, coinsB });
      // merge responses
      const coins = [...coinsA, ...coinsB];

      console.log("Extracted Coins with Balances:", coins);

      // Convert Deposit Amounts to MIST using our utility hook
      const depositA_U64 = toU64(state.depositDropdownCoin, decimalsA);
      const depositB_U64 = toU64(state.depositCustomCoin, decimalsB);

      // Ensure user has enough balance
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
        alert("Insufficient coin balance in wallet.");
        console.error("Balance Check Failed!");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      addLog("Balance Check Passed!");
      console.log("Balance Check Passed!");
      console.log("Selected Coin Objects for Deposit:");
      console.log(
        `${state.dropdownCoinMetadata.symbol}:`,
        coinTypeA,
        "Balance:",
        coinABalance.totalBalance.toString()
      );
      console.log(
        `${state.customCoinMetadata.symbol}:`,
        coinTypeB,
        "Balance:",
        coinBBalance.totalBalance.toString()
      );

      const expectedCoinA = state.dropdownCoinMetadata.typeName;
      const expectedCoinB = state.customCoinMetadata.typeName;

      console.log(
        "Deposit Amounts (in MIST):",
        depositA_U64.toString(),
        depositB_U64.toString()
      );

      // Get user-selected slippage
      const userSlippageTolerance = state.slippageTolerance || 0.5;

      // Calculate minimum LP tokens expected
      const minLpOut = calculateMinLP(
        depositA_U64,
        depositB_U64,
        state.poolStats,
        userSlippageTolerance
      );
      addLog("Calculated min_lp_out:");
      console.log("Calculated min_lp_out:", minLpOut.toString());

      const txb = new TransactionBlock();

      const GAS_BUDGET = 150_000_000;

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
      } catch (error: any) {
        console.error("Error preparing coin inputs:", error);
        addLog(`Error: ${error.message}`);
        alert(`${error.message}`);
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      txb.setGasBudget(GAS_BUDGET);
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

      let executeResponse: { digest: string } | undefined;

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb.serialize(),
            chain: "sui:mainnet", // or 'sui:devnet' if that's your environment
          },
          {
            onSuccess: (result) => {
              executeResponse = result;
              resolve(result);
            },
            onError: (error) => {
              console.error("Liquidity transaction failed:", error);
              addLog(`Transaction failed: ${error.message}`);
              alert("Liquidity transaction failed. See console for details.");
              reject(error);
            },
          }
        );
      });

      addLog("Transaction Submitted!");

      // Track Transaction Digest
      const txnDigest = executeResponse?.digest;
      addLog(`Transaction Digest: ${txnDigest}`);

      if (!txnDigest) {
        alert("Transaction failed. Please check the console.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Wait for Transaction Confirmation
      addLog("Waiting for confirmation...");
      let txnDetails = await fetchTransactionWithRetry(txnDigest);

      if (!txnDetails) {
        alert("Transaction not successful. Please retry.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      addLog("Transaction Confirmed!");

      // Extract LiquidityAdded Event
      let liquidityEvent = txnDetails.events?.find((event) =>
        event.type.includes("LiquidityAdded")
      );

      if (!liquidityEvent) {
        console.warn(`LiquidityAdded event missing! Retrying...`);
        await new Promise((res) => setTimeout(res, 5000));
        txnDetails = await fetchTransactionWithRetry(txnDigest);
        liquidityEvent = txnDetails?.events?.find((event) =>
          event.type.includes("LiquidityAdded")
        );
      }

      if (!liquidityEvent) {
        alert("Liquidity addition event missing. Please verify manually.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Extract Liquidity Event Data
      const liquidityData = liquidityEvent.parsedJson as { pool_id: string, a: string, b: string, amountin_a: string, amountin_b: string, lp_minted: string };
      if (!liquidityData) {
        alert("Event detected but no data available.");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      console.log("Liquidity Event Data:", liquidityData);

      // Store LP Minted Data in State
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

      addLog("Liquidity Successfully Added!");
      setIsProcessing(false);
      dispatch({ type: "SET_STEP", payload: 3 });
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Check the console.");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      setIsProcessing(false);
      setTimeout(() => setIsModalOpen(false), 5000);
    }
  };

  // Handle the next step based on current state
  const handleNextStep = async () => {
    if (state.step === 1) {
      if (state.isCreatingNewPool) {
        // Check if we have a custom coin in state
        if (!state.customCoin) {
          console.error("Custom coin type is missing. Cannot proceed.");
          alert("Please enter a valid second coin type before proceeding.");
          return;
        }
        
        // If creating a new pool, fetch metadata first with the custom coin type
        console.log("Fetching metadata with custom coin:", state.customCoin);
        await fetchMetadata(state.customCoin);
        
        // Move to step 2 after fetching metadata
        dispatch({ type: "SET_STEP", payload: 2 });
      } else if (state.poolData && state.poolData.poolId) {
        // If adding liquidity to existing pool, fetch pool stats
        await fetchPoolStats(state.poolData.poolId);
        dispatch({ type: "SET_STEP", payload: 2 });
      }
    } else if (state.step === 2) {
      // Execute the appropriate transaction based on whether we're creating or adding
      if (state.isCreatingNewPool) {
        await handleCreatePool();
      } else {
        await handleAddLiquidity();
      }
    }
  };

  const handleIsCreatingNewPool = async (isCreatingNewPool: boolean) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    dispatch({ type: "SET_CREATING_NEW_POOL", payload: isCreatingNewPool });
    if (isCreatingNewPool) {
      dispatch({ type: "SET_CUSTOM_COIN", payload: "" });
      dispatch({ type: "SET_COINB", payload: "" });
      dispatch({ type: "SET_POOL_CHECKED", payload: false });
      dispatch({ type: "SET_POOL_DATA", payload: null });
    } else {
      dispatch({ type: "SET_SELECTED_COIN", payload: predefinedCoins[0] });
      dispatch({ type: "SET_SELECTED_CUSTOM_COIN", payload: predefinedCoins[1] });
      dispatch({ type: "SET_CUSTOM_COIN", payload: predefinedCoins[1].typeName });
      dispatch({ type: "SET_POOL_DATA", payload: null });
      dispatch({ type: "SET_DROPDOWN_COIN_METADATA", payload: predefinedCoins[0] });
      dispatch({ type: "SET_CUSTOM_COIN_METADATA", payload: predefinedCoins[1] });
      await fetchMetadata(predefinedCoins[1].typeName);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    setIsLoading(false);
    dispatch({ type: "SET_STEP", payload: 1 });
  };

  useEffect(() => {
    if (state.customCoin) { 
      fetchPoolData(state.customCoin);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI rendering
  return (
    <div className="min-h-[80vh] overflow-y-auto flex flex-col md:flex-row bg-[#000306] p-4 md:p-6 pb-20">
      {/* Step indicator */}
      {/* <StepIndicator step={state.step} setStep={setStep} /> */}

      <div className="flex-1 p-4 md:p-8">
        {state.step === 0 && (
          <div className="flex sm items-center justify-center h-full">
            {/* if some loaging, then display Loading screen */}
            {state.loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <p className="text-white mt-4">Loading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                {/* select between create new pool or add liquidity to existing pool */}
                <div className="flex items-center justify-center h-full space-x-4">
                  <Button
                    variant="primary"
                    size="md"
                    rounded={false}
                    onClick={() => handleIsCreatingNewPool(true)}
                  >
                    Create Pool
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    rounded={false}
                    onClick={() => handleIsCreatingNewPool(false)}
                  >
                    Add Liquidity
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {state.step > 0 && (
          <h1 className="text-2xl font-bold mb-6">
            {state.isCreatingNewPool ? "Create Pool" : "Add Liquidity"}
          </h1>
        )}

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
                  <Image
                    src={state.selectedCoin?.image}
                    alt={state.selectedCoin?.symbol}
                    width={20}
                    height={20}
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{state.selectedCoin.symbol}</span>
                </div>
                <span className="text-slate-400">▼</span>
              </button>

              {state.dropdownOpen && (
                <div className="absolute left-0 mt-1 w-full bg-[#130e18] border border-slate-600 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {predefinedCoins
                    .filter((coin) => coin.symbol !== state.selectedCoin.symbol && 
                    coin.symbol !== state.selectedCustomCoin.symbol && whitelistedCoins.includes(coin.typeName))
                    .map((coin) => (
                      <div
                        key={coin.symbol}
                        className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer"
                        onClick={() =>
                          dispatch({ type: "SET_COIN", payload: coin })
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <Image
                            src={coin.image || ""}
                            alt={coin.symbol}
                            width={20}
                            height={20}
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
            {state.isCreatingNewPool ? (
              <div className="mb-4 relative">
                <label className="block text-slate-300 mb-2">
                  <strong>Enter Second Coin TypeName:</strong>
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-600 bg-[#130e18] placeholder-slate-500"
                  placeholder="Enter coin type (e.g., 0x2::sui::SUI)"
                  value={state.customCoin}
                  onChange={handleCustomCoinChange}
                  // onChange={(e) =>
                  //   dispatch({ type: "SET_CUSTOM_COIN", payload: e.target.value })
                  // }
                />
              </div>
            ) : (
              <div className="mb-4 relative">
                <label className="block text-slate-300 mb-2">
                  <strong>Select Second Coin:</strong>
                </label>
                <button
                  className="rounded-none w-full flex items-center justify-between p-2 border border-slate-600 bg-[#130e18]"
                  onClick={() => dispatch({ type: "TOGGLE_CUSTOM_DROPDOWN" })}
                >
                  <div className="flex items-center space-x-2">
                    <Image
                      src={state.selectedCustomCoin?.image || ""}
                      alt={state.selectedCustomCoin?.symbol}
                      width={20}
                      height={20}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{state.selectedCustomCoin.symbol}</span>
                  </div>
                  <span className="text-slate-400">▼</span>
                </button>
                {state.customDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-full bg-[#130e18] border border-slate-600 shadow-lg z-10 max-h-48 overflow-y-auto">
                    {predefinedCoins
                      .filter(
                        (coin) =>
                          coin.symbol !== state.customCoinMetadata.symbol && coin.symbol !== state.selectedCoin.symbol
                      )
                      .map((coin) => (
                        <div
                          key={coin.symbol}
                          className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer"
                          onClick={()=> handleCustomCoinDropdownChange(coin)}
                        >
                          <div className="flex items-center space-x-2">
                            <Image
                              src={coin.image || ""}
                              alt={coin.symbol}
                              width={20}
                              height={20}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="ml-2">{coin.symbol}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
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
                      <Image
                        src={state.selectedCoin.image || ""}
                        alt={state.selectedCoin.symbol}
                        width={20}
                        height={20}
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
                      <Image
                        src={
                          state.customCoinMetadata?.image || "/default-coin.png"
                        }
                        alt={state.customCoinMetadata?.symbol || "Token"}
                        width={20}
                        height={20}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-slate-300 text-m font-medium">
                        <strong>
                          {state.customCoinMetadata?.symbol
                            ? state.customCoinMetadata?.symbol
                            : "Unknown"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Image
                      src={state.selectedCoin?.image || ""}
                      alt={state.selectedCoin?.symbol}
                      width={20}
                      height={20}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{state.selectedCoin.symbol}</span>
                  </div>
                  <span>/</span>
                  <div className="flex items-center space-x-2">
                    <Image
                      src={state.customCoinMetadata?.image || ""}
                      alt={state.customCoinMetadata?.symbol}
                      width={20}
                      height={20}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{state.customCoinMetadata?.symbol}</span>
                  </div>
                  <p className="text-[#61F98A]">
                    Pool not found. You will create a new one.
                  </p>
                </div>
              )}
            </div>

            {/* back button and get pool info button and go to next step buttons */}
            <div className="flex items-center space-x-4 mt-4">
              <Button
                onClick={() => handleBackToStep(0)}
                variant="standard"
                theme="none"
                rounded={false}
                className="border border-slate-600 bg-[#130e18] text-slate-300 hover:bg-slate-700"
                size="md"
              >
                Back
              </Button>
              <Button
                onClick={handleNextStep}
                variant="primary"
                size="md"
                rounded={false}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Pool or Deposit Liquidity */}
        {state.step === 2 && (
          <div className="pb-20">
            {state.isCreatingNewPool ? (
              /* Pool Creation UI */
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Configure Pool Settings
                </h2>

                {/* Fee Configuration */}
                <div className="border border-slate-600 p-4 mb-4">
                  <h3 className="text-lg font-medium mb-3">
                    Fee Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LP Builder Fee */}
                    <div>
                      <label className="block text-slate-300 mb-1">
                        <strong>LP Builder Fee (%)</strong>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border border-slate-600 bg-[#130e18]"
                        placeholder="0"
                        min="0"
                        max="3"
                        step="0.01"
                        value={state.lpBuilderFee}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_LP_BUILDER_FEE",
                            payload: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Fee earned by liquidity providers
                      </p>
                    </div>

                    {/* Buyback & Burn Fee */}
                    <div>
                      <label className="block text-slate-300 mb-1">
                        <strong>Buyback & Burn Fee (%)</strong>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border border-slate-600 bg-[#130e18]"
                        placeholder="0"
                        min="0"
                        max="5"
                        step="0.01"
                        value={state.buybackBurnFee}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_BUYBACK_BURN_FEE",
                            payload: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Fee used for buyback and burn
                      </p>
                    </div>

                    {/* Rewards Fee */}
                    <div>
                      <label className="block text-slate-300 mb-1">
                        <strong>Rewards Fee (%)</strong>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border border-slate-600 bg-[#130e18]"
                        placeholder="0"
                        min="0"
                        max="1"
                        step="0.01"
                        value={state.rewardsFee}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_REWARDS_FEE",
                            payload: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Fee allocated for rewards
                      </p>
                    </div>

                    {/* Deployer Royalty Fee */}
                    <div>
                      <label className="block text-slate-300 mb-1">
                        <strong>Deployer Royalty Fee (%)</strong>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border border-slate-600 bg-[#130e18]"
                        placeholder="0"
                        min="0"
                        max="5"
                        step="0.01"
                        value={state.deployerRoyaltyFee}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_DEPLOYER_ROYALTY_FEE",
                            payload: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Fee for pool deployer
                      </p>
                    </div>
                  </div>

                  {/* Total Fees Display */}
                  <div className="mt-4 p-3 bg-[#130e18] border border-slate-600">
                    <p className="font-medium text-slate-300">
                      Total Fees:{" "}
                      {(
                        state.lpBuilderFee +
                        state.buybackBurnFee +
                        state.rewardsFee +
                        state.deployerRoyaltyFee
                      ).toFixed(2)}
                      %
                    </p>
                    <p className="text-sm text-slate-400">(Maximum 30%)</p>
                  </div>
                </div>

                {/* Deployer Royalty Wallet */}
                {state.deployerRoyaltyFee > 0 && (
                  <div className="bg-[#130e18] border border-slate-600 p-4 mb-4">
                    <label className="block text-slate-300 mb-1">
                      <strong>Deployer Royalty Wallet Address</strong>
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-slate-600 bg-[#130e18]"
                      placeholder="Enter a valid SUI address (0x...)"
                      value={state.deployerRoyaltyWallet}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_DEPLOYER_ROYALTY_WALLET",
                          payload: e.target.value,
                        })
                      }
                    />
                    <p className="text-sm text-slate-400 mt-1">
                      This wallet will receive the deployer royalty fees
                    </p>
                  </div>
                )}

                {/* Initial Price Configuration */}
                <div className="border border-slate-600 p-4 mb-4">
                  <h3 className="text-lg font-medium mb-3">Initial Price</h3>

                  <div className="mb-3">
                    <label className="block text-slate-300 mb-1">
                      <strong>Initial Price Mode</strong>
                    </label>
                    <select
                      className="w-full p-2 border border-slate-600 bg-[#130e18]"
                      value={state.initialPriceMode}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_INITIAL_PRICE_MODE",
                          payload: e.target.value,
                        })
                      }
                    >
                      <option value="customPerDropdown">
                        {state.customCoinMetadata?.symbol || "Token B"} per{" "}
                        {state.dropdownCoinMetadata?.symbol || "Token A"}
                      </option>
                      <option value="dropdownPerCustom">
                        {state.dropdownCoinMetadata?.symbol || "Token A"} per{" "}
                        {state.customCoinMetadata?.symbol || "Token B"}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">
                      <strong>Initial Price</strong>
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-slate-600 bg-[#130e18]"
                      placeholder="0"
                      min="0"
                      step="0.000001"
                      value={state.initialPrice}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_INITIAL_PRICE",
                          payload: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-sm text-slate-400 mt-1">
                      {state.initialPriceMode === "customPerDropdown"
                        ? `${
                            state.customCoinMetadata?.symbol || "Token B"
                          } per ${
                            state.dropdownCoinMetadata?.symbol || "Token A"
                          }`
                        : `${
                            state.dropdownCoinMetadata?.symbol || "Token A"
                          } per ${
                            state.customCoinMetadata?.symbol || "Token B"
                          }`}
                    </p>
                  </div>
                </div>

                {/* Initial Liquidity */}
                <div className="border border-slate-600 p-4 mb-4">
                  <h3 className="text-lg font-medium mb-3">
                    Initial Liquidity
                  </h3>

                  <div className="flex flex-col space-y-4">
                    {/* Token A Input */}
                    <div className="flex items-center p-3 border border-slate-600 justify-between">
                      <div className="flex items-center">
                        <Image
                          src={
                            state.dropdownCoinMetadata?.image ||
                            "/default-coin.png"
                          }
                          alt={state.dropdownCoinMetadata?.symbol || "Token A"}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full mr-2"
                        />
                        <span className="text-slate-300 font-medium mr-2">
                          <strong>
                            {state.dropdownCoinMetadata?.symbol || "Token A"}
                          </strong>
                        </span>
                      </div>
                      <input
                        type="number"
                        className="p-2 border border-slate-600 bg-[#130e18] text-slate-300 text-2xl font-semibold outline-none"
                        placeholder="0"
                        min="0"
                        value={state.depositDropdownCoin}
                        onChange={(e) =>
                          handleInitialCoinAChange(e.target.value)
                        }
                      />
                    </div>

                    {/* Token B Input */}
                    <div className="flex items-center p-3 border border-slate-600 justify-between">
                      <div className="flex items-center">
                        <Image
                          src={
                            state.customCoinMetadata?.image ||
                            "/default-coin.png"
                          }
                          alt={state.customCoinMetadata?.symbol || "Token B"}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full mr-2"
                        />
                        <span className="text-slate-300 font-medium mr-2">
                          <strong>
                            {state.customCoinMetadata?.symbol || "Token B"}
                          </strong>
                        </span>
                      </div>
                      <input
                        type="number"
                        className="p-2 border border-slate-600 bg-[#130e18] text-slate-300 text-2xl font-semibold outline-none"
                        placeholder="0"
                        min="0"
                        value={state.depositCustomCoin}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Create Pool Button */}
                <button
                  onClick={handleCreatePool}
                  className="w-full p-3 bg-[#61F98A] hover:bg-[#52d879] text-black font-semibold rounded-none transition-colors duration-300"
                  disabled={state.loading}
                >
                  {state.loading ? "Creating Pool..." : "Create Pool"}
                </button>
              </div>
            ) : (
              /* Add Liquidity UI */
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Deposit Liquidity
                </h2>

                {/* Pool Stats */}
                <div className="bg-[#130e18] border border-slate-600 p-3 md:p-4 shadow-md mb-4 text-sm md:text-base">
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
                        state.poolStats?.balance_a / Math.pow(10, decimalsA)
                      ).toFixed(4)}
                    </strong>
                  </p>
                  <p className="text-sm text-slate-400">
                    <strong>
                      Balance Coin B:{" "}
                      {(
                        state.poolStats?.balance_b / Math.pow(10, decimalsB)
                      ).toFixed(4)}
                    </strong>
                  </p>
                  <p className="text-sm text-slate-400">
                    <strong>
                      Pool Locked Coins:{" "}
                      {((state.poolStats?.burn_balance_b || 0) / 1e9).toFixed(
                        4
                      )}
                    </strong>
                  </p>
                  <p className="text-sm text-slate-400">
                    <strong>
                      Pool Locked LP:{" "}
                      {(
                        (state.poolStats?.locked_lp_balance || 0) / 1e9
                      ).toFixed(4)}
                    </strong>
                  </p>

                  {/* Fees */}
                  <h3 className="text-sm font-semibold text-slate-300 mt-2">
                    <strong>Fees</strong>
                  </h3>
                  <p className="text-sm text-slate-400">
                    <strong>
                      LP Builder Fee:{" "}
                      {((state.poolStats?.lp_builder_fee || 0) / 100).toFixed(
                        2
                      )}
                      %
                    </strong>
                  </p>
                  <p className="text-sm text-slate-400">
                    <strong>
                      Burn Fee:{" "}
                      {((state.poolStats?.burn_fee || 0) / 100).toFixed(2)}%
                    </strong>
                  </p>
                  <p className="text-sm text-slate-400">
                    <strong>
                      Rewards Fee:{" "}
                      {((state.poolStats?.rewards_fee || 0) / 100).toFixed(2)}%
                    </strong>
                  </p>
                  <p className="text-sm text-slate-400">
                    <strong>
                      Creator Royalty Fee:{" "}
                      {(
                        (state.poolStats?.creator_royalty_fee || 0) / 100
                      ).toFixed(2)}
                      %
                    </strong>
                  </p>
                </div>

                {/* Slippage Tolerance Input */}
                <div className="bg-[#130e18] border border-slate-600 p-4 shadow-md mb-4">
                  <h2 className="text-lg font-semibold text-slate-300">
                    Slippage Tolerance
                  </h2>
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="number"
                      className="bg-[#000306] text-lg md:text-2xl font-semibold p-2 w-full md:w-20 border border-slate-600 outline-none"
                      placeholder="0.5"
                      value={state.slippageTolerance}
                      onChange={(e) => {
                        let newSlippage = parseFloat(e.target.value);
                        if (isNaN(newSlippage) || newSlippage < 0)
                          newSlippage = 0;
                        if (newSlippage > 5) newSlippage = 5; // Limit slippage between 0% and 5%
                        dispatch({
                          type: "SET_SLIPPAGE",
                          payload: newSlippage,
                        });
                      }}
                    />
                    <span className="text-lg font-medium">%</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    Set the maximum slippage tolerance.
                  </p>
                </div>

                {/* Deposit Inputs */}
                <div className="bg-[#130e18] border border-slate-600 p-4 shadow-md mb-4">
                  <h2 className="text-lg font-semibold text-slate-300">
                    Deposit Tokens
                  </h2>

                  <div className="flex items-center p-3 bg-[#000306] border border-slate-600 mb-2">
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

                  <div className="flex items-center p-3 bg-[#000306] border border-slate-600">
                    <Image
                      src={
                        state.customCoinMetadata?.image || "/default-coin.png"
                      }
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

                {/* Add Liquidity Button */}
                <div className="flex items-center space-x-4 mt-4">
                <Button
                  onClick={() => handleBackToStep(1)}
                  variant="standard"
                  theme="none"
                  rounded={false}
                  className="border border-slate-600 bg-[#130e18] text-slate-300 hover:bg-slate-700"
                  size="md"
                >
                  Back
                </Button>
                <Button
                  onClick={handleAddLiquidity}
                  variant="primary"
                  size="md"
                  disabled={state.loading}
                  processing={state.loading}
                  rounded={false}
                >
                  Add Liquidity
                </Button>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Step 3: Transaction Result */}
        {state.step === 3 && state.liquidityData && (
          <div className="bg-[#130e18] border border-slate-600 p-6 shadow-lg">
            <h2 className="text-xl font-bold text-[#61F98A] mb-4">
              {state.isCreatingNewPool
                ? "Pool Successfully Created!"
                : "Liquidity Successfully Added!"}
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">
                  Transaction Details
                </h3>
                <div className="mt-2 bg-[#000306] p-3 border border-slate-600 rounded-none">
                  <p className="text-slate-300 text-sm break-all">
                    <strong>Transaction ID:</strong>
                    <span
                      className="ml-2 text-[#61F98A] cursor-pointer"
                      onClick={() => handleCopy(state.liquidityData.txnDigest)}
                    >
                      {state.liquidityData.txnDigest}
                      {copiedText === state.liquidityData.txnDigest && (
                        <span className="ml-2 text-xs">(Copied!)</span>
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-300">
                  Pool Information
                </h3>
                <div className="mt-2 bg-[#000306] p-3 border border-slate-600 rounded-none">
                  <p className="text-slate-300 text-sm break-all">
                    <strong>Pool ID:</strong>
                    <span
                      className="ml-2 text-[#61F98A] cursor-pointer"
                      onClick={() => handleCopy(state.liquidityData.poolId)}
                    >
                      {state.liquidityData.poolId}
                      {copiedText === state.liquidityData.poolId && (
                        <span className="ml-2 text-xs">(Copied!)</span>
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-300">
                  Liquidity Added
                </h3>
                <div className="mt-2 bg-[#000306] p-3 border border-slate-600 rounded-none space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      <strong>
                        {state.dropdownCoinMetadata?.symbol || "Token A"}:
                      </strong>
                    </span>
                    <span className="text-slate-300">
                      {state.liquidityData.depositA.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      <strong>
                        {state.customCoinMetadata?.symbol || "Token B"}:
                      </strong>
                    </span>
                    <span className="text-slate-300">
                      {state.liquidityData.depositB.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      <strong>LP Tokens Received:</strong>
                    </span>
                    <span className="text-slate-300">
                      {state.liquidityData.lpMinted.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <Button
                onClick={() => router.push("/pools")}
                variant="primary"
                size="full"
                rounded={false}
                className="flex-1"
              >
                Go to Pools
              </Button>
              <Button
                onClick={() => {
                  dispatch({ type: "SET_STEP", payload: 1 });
                  dispatch({ type: "SET_POOL_DATA", payload: null });
                  dispatch({ type: "SET_POOL_CHECKED", payload: false });
                  dispatch({ type: "SET_CREATING_NEW_POOL", payload: false });
                }}
                variant="secondary"
                size="full"
                rounded={false}
                className="flex-1"
              >
                Create Another Pool
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {isModalOpen && (
          <TransactionModal
            open={isModalOpen}
            onClose={() => !isProcessing && setIsModalOpen(false)}
            logs={logs}
            isProcessing={isProcessing}
            transactionProgress={{
              image: state.isCreatingNewPool ? "images/txn_success.png" : "images/txn_success.png",
              text: state.isCreatingNewPool ? "Creating Pool" : "Adding Liquidity"
            }}
            digest={state.liquidityData?.txnDigest}
          />
        )}
      </div>
    </div>
  );
}
