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
    const [coinMetadata, setCoinMetadata] = useState<any | null>(null);

    // Fetch metadata for the custom-entered coin type
    const fetchCoinMetadata = async () => {
        if (!customCoin.trim()) {
            alert("Please enter a valid Coin Type (e.g., 0x2::sui::SUI)");
            return;
        }

        setLoading(true);
        try {
            console.log("Fetching metadata for:", customCoin); // Debugging

            const metadata = await provider.getCoinMetadata({ coinType: customCoin.trim() });

            if (metadata) {
                setCoinMetadata(metadata); // ✅ Store metadata
                setStep(2); // ✅ Move to next step
            } else {
                alert("Coin metadata not found. Ensure the correct coin type is entered.");
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

                {step === 1 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Select Coin Pair</h2>

                        {/* Dropdown for predefined coins */}
                        <div className="mb-4">
                            <label className="block text-gray-700">Select First Coin:</label>
                            <select
                                className="w-full p-2 border rounded-lg text-black" // ✅ Text is now black
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
                                className="w-full p-2 border rounded-lg text-black placeholder-gray-500" // ✅ Text is now black
                                placeholder="Enter coin type (e.g., 0x2::sui::SUI)"
                                value={customCoin}
                                onChange={(e) => setCustomCoin(e.target.value)}
                            />
                        </div>

                        {/* Continue Button */}
                        <button
                            className="w-full bg-black text-white p-3 rounded-lg mt-4 disabled:opacity-50"
                            onClick={fetchCoinMetadata}
                            disabled={loading}
                        >
                            {loading ? "Fetching..." : "Continue"}
                        </button>
                    </div>
                )}

                {step === 2 && coinMetadata && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Coin Metadata Retrieved</h2>
                        <pre className="bg-gray-200 p-4 rounded-lg text-black">
                            {JSON.stringify(coinMetadata, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
