"use client";
import { useReducer } from "react";
import StepIndicator from "../components/StepIndicator";
import { SuiClient } from "@mysten/sui.js/client";
import { predefinedCoins } from "../data/coins";
import { GETTER_RPC } from "../config";

const provider = new SuiClient({ url: GETTER_RPC });

const initialState = {
    selectedCoin: predefinedCoins[0],
    customCoin: "",
    step: 1,
    loading: false,
    dropdownOpen: false,
    dropdownCoinMetadata: null,
    customCoinMetadata: null,
    lpBuilderFee: 0,
    buybackBurnFee: 0,
    deployerRoyaltyFee: 0,
    rewardsFee: 0,
    deployerRoyaltyWallet: "",
};

function isValidSuiAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(address);
}

function reducer(state: any, action: any) {
    switch (action.type) {
        case "SET_COIN": return { ...state, selectedCoin: action.payload };
        case "SET_CUSTOM_COIN": return { ...state, customCoin: action.payload };
        case "SET_STEP": return { ...state, step: action.payload };
        case "TOGGLE_DROPDOWN": return { ...state, dropdownOpen: !state.dropdownOpen };
        case "SET_LOADING": return { ...state, loading: action.payload };
        case "SET_METADATA":
            return { ...state, dropdownCoinMetadata: action.payload.dropdown, customCoinMetadata: action.payload.custom };
        case "SET_FEES":
            return { ...state, [action.field]: action.value };
        case "SET_WALLET": return { ...state, deployerRoyaltyWallet: action.payload };
        default: return state;
    }
}

export default function Pools() {
    const [state, dispatch] = useReducer(reducer, initialState);

    const fetchMetadata = async () => {
        if (!state.customCoin.trim()) {
            alert("Please enter a valid Coin Type (e.g., 0x2::sui::SUI)");
            return;
        }

        dispatch({ type: "SET_LOADING", payload: true });

        try {
            const [dropdownMetadata, customMetadata] = await Promise.all([
                provider.getCoinMetadata({ coinType: state.selectedCoin.typeName }),
                provider.getCoinMetadata({ coinType: state.customCoin.trim() })
            ]);

            if (dropdownMetadata && customMetadata) {
                dispatch({
                    type: "SET_METADATA",
                    payload: { dropdown: { ...dropdownMetadata, iconUrl: dropdownMetadata.iconUrl || state.selectedCoin.logo }, custom: customMetadata }
                });
                dispatch({ type: "SET_STEP", payload: 2 });
            } else {
                alert("One or both coin metadata could not be retrieved.");
            }
        } catch (error) {
            console.error("Error fetching coin metadata:", error);
            alert("Failed to fetch coin metadata. Please ensure the coin type is correct.");
        }

        dispatch({ type: "SET_LOADING", payload: false });
    };

    return (
        <div className="flex min-h-screen bg-gray-100 p-6 overflow-y-auto">
            <StepIndicator step={state.step} />
            <div className="flex-1 bg-white p-8 rounded-lg shadow-lg h-screen overflow-y-auto">
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
                    <div className="flex flex-col h-screen w-full">
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
                                        value={state[field] || ""}
                                        onChange={(e) => {
                                            let value = parseFloat(e.target.value);
                                            if (value > max) value = max;  // Prevent exceeding max
                                            dispatch({ type: "SET_FEES", field, value });
                                        }}
                                    />
                                </div>
                            ))}

                            {/* Deployer Royalty Wallet Address Validation */}
                            <div>
                                <label className="block text-gray-700">Deployer Royalty Wallet Address</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded-lg text-black ${state.deployerRoyaltyWallet && !isValidSuiAddress(state.deployerRoyaltyWallet) ? "border-red-500" : ""}`}
                                    placeholder="Enter valid Sui address (0x...)"
                                    value={state.deployerRoyaltyWallet}
                                    onChange={(e) => dispatch({ type: "SET_WALLET", payload: e.target.value })}
                                />
                                {!isValidSuiAddress(state.deployerRoyaltyWallet) && state.deployerRoyaltyWallet.length > 0 && (
                                    <p className="text-red-500 text-sm mt-1">Invalid Sui address. It must start with "0x" and be 66 characters long.</p>
                                )}
                            </div>
                        

                        {/* Navigation Buttons */}
                        <div className="sticky bottom-0 bg-white p-4 shadow-lg w-full flex justify-between">
                            <button className="bg-gray-500 text-white p-3 rounded-lg"
                                onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}
                            >
                                ← Back to Step 1
                            </button>

                            <button className="bg-black text-white p-3 rounded-lg"
                                onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
                            >
                                Proceed to Step 3 →
                            </button>
                        </div>
                    </div>
                    </div>
                )}

{/* Step 3: Review & Confirm */}
{state.step === 3 && (
    <div className="flex flex-col h-screen w-full">
        <h2 className="text-xl font-semibold mb-4 text-black">Review & Confirm</h2>

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

        {/* Navigation Buttons */}
        <div className="sticky bottom-0 bg-white p-4 shadow-lg w-full flex justify-between">
            <button className="bg-gray-500 text-white p-3 rounded-lg"
                onClick={() => dispatch({ type: "SET_STEP", payload: 2 })}
            >
                ← Back to Step 2
            </button>

            <button className="bg-black text-white p-3 rounded-lg"
                onClick={() => dispatch({ type: "SET_STEP", payload: 4 })} // Placeholder for finalization
            >
                Confirm & Continue →
            </button>
        </div>
    </div>
)}

            </div>
        </div>
    );
}
