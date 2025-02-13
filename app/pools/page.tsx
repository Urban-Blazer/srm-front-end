"use client";
import { useState } from "react";
import StepIndicator from "../components/StepIndicator";
import { SuiClient } from "@mysten/sui.js/client";
import { predefinedCoins } from "../data/coins"; // ✅ Import Coin Data

const provider = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });

export default function Pools() {
    const [selectedCoin, setSelectedCoin] = useState(predefinedCoins[0]); // ✅ First coin (Dropdown)
    const [customCoin, setCustomCoin] = useState(""); // ✅ Second coin (Textbox)
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [dropdownCoinMetadata, setDropdownCoinMetadata] = useState<any | null>(null);
    const [customCoinMetadata, setCustomCoinMetadata] = useState<any | null>(null);

    // Fetch metadata for both dropdown-selected and custom-entered coins
    const fetchMetadata = async () => {
        if (!customCoin.trim()) {
            alert("Please enter a valid Coin Type (e.g., 0x2::sui::SUI)");
            return;
        }

        setLoading(true);
        try {
            console.log("Fetching metadata for:", selectedCoin.typeName, "and", customCoin.trim()); // Debugging

            // Fetch metadata for dropdown-selected coin
            const dropdownMetadata = await provider.getCoinMetadata({ coinType: selectedCoin.typeName });

            // Fetch metadata for user-entered custom coin
            const customMetadata = await provider.getCoinMetadata({ coinType: customCoin.trim() });

            if (dropdownMetadata && customMetadata) {
                setDropdownCoinMetadata({
                    ...dropdownMetadata,
                    iconUrl: dropdownMetadata.iconUrl || selectedCoin.logo, // ✅ Use predefined logo if missing
                });

                setCustomCoinMetadata(customMetadata);
                setStep(2); // ✅ Move to next step
            } else {
                alert("One or both coin metadata could not be retrieved. Ensure the coin type is correct.");
            }
        } catch (error) {
            console.error("Error fetching coin metadata:", error);
            alert("Failed to fetch coin metadata. Please ensure the coin type is correct.");
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen bg-gray-100 p-6">
            {/* Left Step Indicator */}
            <StepIndicator step={step} />

            {/* Right Form Section */}
            <div className="flex-1 bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold mb-6">Create a New Pool</h1>

                {/* Step 1: Select Coins */}
                {step === 1 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Select Coin Pair</h2>

                        {/* Dropdown for predefined coins */}
                        <div className="mb-4">
                            <label className="block text-gray-700">Select First Coin:</label>
                            <select
                                className="w-full p-2 border rounded-lg text-black"
                                value={selectedCoin.symbol}
                                onChange={(e) =>
                                    setSelectedCoin(predefinedCoins.find((c) => c.symbol === e.target.value)!)
                                }
                            >
                                {predefinedCoins.map((coin) => (
                                    <option key={coin.symbol} value={coin.symbol}>
                                        {coin.symbol}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Input field for custom coin */}
                        <div className="mb-4">
                            <label className="block text-gray-700">Enter Second Coin Type:</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg text-black placeholder-gray-500"
                                placeholder="Enter coin type (e.g., 0x2::sui::SUI)"
                                value={customCoin}
                                onChange={(e) => setCustomCoin(e.target.value)}
                            />
                        </div>

                        {/* Continue Button */}
                        <button
                            className="w-full bg-black text-white p-3 rounded-lg mt-4 disabled:opacity-50"
                            onClick={fetchMetadata}
                            disabled={loading}
                        >
                            {loading ? "Fetching..." : "Continue"}
                        </button>
                    </div>
                )}

                {/* Step 2: Display Selected Coins */}
                {step === 2 && dropdownCoinMetadata && customCoinMetadata && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Selected Coins</h2>

                        {/* Coin Display */}
                        <div className="flex items-center justify-center gap-4 p-4 bg-gray-200 rounded-lg">
                            {/* First Coin (Dropdown Selection) */}
                            <div className="flex items-center space-x-2">
                                {dropdownCoinMetadata.iconUrl ? (
                                    <img
                                        src={dropdownCoinMetadata.iconUrl}
                                        alt={dropdownCoinMetadata.symbol}
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                                        ❔
                                    </div>
                                )}
                                <span className="text-lg font-semibold">{dropdownCoinMetadata.symbol}</span>
                            </div>

                            <span className="text-2xl font-bold">/</span>

                            {/* Second Coin (Custom Input) */}
                            <div className="flex items-center space-x-2">
                                {customCoinMetadata.iconUrl ? (
                                    <img
                                        src={customCoinMetadata.iconUrl}
                                        alt={customCoinMetadata.symbol}
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                                        ❔
                                    </div>
                                )}
                                <span className="text-lg font-semibold">{customCoinMetadata.symbol}</span>
                            </div>
                        </div>

                        {/* Proceed Button */}
                        <button
                            className="w-full bg-black text-white p-3 rounded-lg mt-6"
                            onClick={() => setStep(3)}
                        >
                            Proceed to Step 3
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
