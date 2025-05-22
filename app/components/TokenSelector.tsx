import { useState, useEffect, useRef } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC } from "../config";
import { predefinedCoins } from "@data/coins";
import { X, Search, PlusCircle, Plus, MinusCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { CoinMeta } from "../types";

const provider = new SuiClient({ url: GETTER_RPC });

interface Token {
    symbol: string;
    typeName: string;
    logo: string;
    decimals: number;
}

interface TokenSelectorProps {
    onSelectToken: (token: CoinMeta) => void;
    onClose: () => void;
}

export default function TokenSelector({ onSelectToken, onClose }: TokenSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [savedTokens, setSavedTokens] = useState<CoinMeta[]>([]);
    const [showAddTokenModal, setShowAddTokenModal] = useState(false);
    const [customTypeName, setCustomTypeName] = useState("");
    const [loading, setLoading] = useState(false);
    const [customToken, setCustomToken] = useState<CoinMeta | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);

    // Load user-saved tokens from localStorage
    useEffect(() => {
        const storedTokens = localStorage.getItem("savedTokens");
        if (storedTokens) {
            try {
                setSavedTokens(JSON.parse(storedTokens));
            } catch (error) {
                console.error("Error parsing savedTokens from localStorage:", error);
                setSavedTokens([]); // Fallback to empty array if parsing fails
            }
        }
    }, []);

    // Save to localStorage whenever savedTokens changes
    useEffect(() => {
        if (savedTokens.length > 0) { // ✅ Prevents accidental overwriting with an empty array
            localStorage.setItem("savedTokens", JSON.stringify(savedTokens));
        }
    }, [savedTokens]);


    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !modalRef.current?.contains(event.target as Node)
            ) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    // Handle Token Selection
    const handleSelectToken = (token: CoinMeta) => {
        onSelectToken(token); // Pass the full token to parent
        onClose();
    };

    // Handle adding a new token to saved list
    const handleAddToken = (token: CoinMeta) => {
        if (!savedTokens.some((t) => t.typeName === token.typeName)) { // ✅ Prevent duplicates
            const updatedTokens = [...savedTokens, token];
            setSavedTokens(updatedTokens);
            localStorage.setItem("savedTokens", JSON.stringify(updatedTokens));
        } else {
            console.log("❌ Token already exists in savedTokens.");
        }
    };

    const handleRemoveToken = (token: CoinMeta) => {
        const updatedTokens = savedTokens.filter((t) => t.typeName !== token.typeName);
        setSavedTokens(updatedTokens);
        localStorage.setItem("savedTokens", JSON.stringify(updatedTokens)); // Persist removal
    };

    // Fetch Metadata for Custom Token
    const fetchMetadata = async () => {
        if (!customTypeName.trim()) {
            alert("Please enter a valid Coin Type (e.g., 0x2::sui::SUI)");
            return;
        }

        setLoading(true);

        try {
            const metadata = await provider.getCoinMetadata({ coinType: customTypeName.trim() });

            if (metadata) {
                const newToken: CoinMeta = {
                    symbol: metadata.symbol || "UNKNOWN",
                    typeName: customTypeName.trim(),
                    image: metadata.iconUrl || "https://via.placeholder.com/32",
                    decimals: metadata.decimals ?? 9,
                    name: metadata.name || "UNKNOWN",
                };
                setCustomToken(newToken);
            } else {
                alert("Metadata not found for the given TypeName.");
                setCustomToken(null);
            }
        } catch (error) {
            console.error("❌ Error fetching metadata:", error);
            alert("Failed to fetch coin metadata.");
            setCustomToken(null);
        }

        setLoading(false);
    };

    // Confirm and Add Custom Token
    const handleConfirmAddToken = () => {
        if (customToken) {
            handleAddToken(customToken);
            setShowAddTokenModal(false);
            setCustomTypeName("");
            setCustomToken(null);
        }
    };

    // Close Add Token Modal
    const closeModal = () => {
        setShowAddTokenModal(false);
        setCustomTypeName("");
        setCustomToken(null);
    };

    // Filter predefined tokens based on search query
    const filteredTokens = predefinedCoins.filter((token) =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Background Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40" onClick={onClose}></div>

            {/* Centered Modal */}
            <div ref={dropdownRef} className="fixed inset-0 flex justify-center items-center z-50">
                <div className="w-96 bg-white border rounded-lg shadow-lg p-4 max-h-[500px] overflow-y-auto">

                    {/* Title & Close Button */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-bold">Select a Token</h1>
                        <button 
                        onClick={onClose}
                        className="bg-royalPurple hover:bg-lavenderGlow text-white p-2 rounded-lg"
                        >
                            <X size={20} className="text-white hover:text-gray-800" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative my-3">
                        <input
                            type="text"
                            className="w-full border p-2 rounded-lg pl-10 text-black placeholder-gray-500"
                            placeholder="Search TypeName or symbol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                    </div>

                    {/* Add Custom Token Button */}
                    <button
                        className="button-primary w-full p-2 rounded-lg hover: transition"
                        onClick={() => setShowAddTokenModal(true)}
                    >
                        <Plus size={18} className="inline-block mr-2" /> Add Custom Coin
                    </button>

                    {/* Featured Coin */}
                    <div className="mt-2">
                        <h3 className="text-sm text-deepTeal mb-1">Featured Coins</h3>
                        {filteredTokens.map((token) => (
                            <div
                                key={token.typeName}
                                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                onClick={() => handleSelectToken(token)} // ✅ Allow selection directly
                            >
                                <div className="flex items-center">
                                    <img src={token.image} alt={token.symbol} width={20} height={20} className="w-6 h-6 mr-2 sm:w-8 sm:h-8 rounded-full" />
                                    <span className="text-deepTeal"><strong>{token.symbol}</strong></span>
                                </div>
                                <button
                                    className="bg-royalPurple hover:bg-lavenderGlow text-white p-2 rounded-lg"
                                    onClick={(e) => {
                                        e.stopPropagation(); // ✅ Prevents event bubbling
                                        handleAddToken(token);
                                    }}
                                >
                                    <PlusCircle size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Saved Tokens (User Added) */}
                    {savedTokens.length > 0 ? (
                        <div className="mt-2">
                            <h2 className="text-sm mb-1">Your Coin List</h2>
                            {savedTokens.map((token) => (
                                <div
                                    key={token.typeName}
                                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                    onClick={() => handleSelectToken(token)}
                                >
                                    <div className="flex items-center">
                                        <img src={token.image} alt={token.symbol} width={20} height={20} className="w-6 h-6 mr-2 sm:w-8 sm:h-8 rounded-full" />
                                        <span className="text-deepTeal"><strong>{token.symbol}</strong></span>
                                    </div>
                                    {/* Remove Token Button */}
                                    <button
                                        className="bg-royalPurple text-white hover:bg-lavenderGlow p-2 rounded-lg"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveToken(token);
                                        }}
                                    >
                                        <MinusCircle size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-royalPurple text-sm mt-2">No custom tokens added yet.</p>
                    )}

                </div>
            </div>

            {/* Add Token Modal */}
            {showAddTokenModal && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
                    <div ref={modalRef} className="bg-white p-4 rounded-lg shadow-lg w-80">
                        <div className="flex justify-between">
                            <h3 className="text-lg font-bold text-black">Add Custom Token</h3>
                            <button onClick={closeModal}>
                                <X size={20} className="text-gray-500 hover:text-gray-800" />
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter TypeName (e.g. 0x2::sui::SUI)"
                            className="w-full border p-2 mb-2 rounded text-black"
                            value={customTypeName}
                            onChange={(e) => setCustomTypeName(e.target.value)}
                        />
                        <button className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                            onClick={fetchMetadata}
                            disabled={loading}>
                            {loading ? <Loader2 className="animate-spin inline mr-2" /> : "Fetch Metadata"}
                        </button>

                        {customToken && (
                            <div className="flex items-center mt-3 text-black">
                                <img src={customToken.image} alt={customToken.symbol} width={20} height={20} className="w-6 h-6 mr-2 sm:w-8 sm:h-8 rounded-full" />
                                <span>{customToken.symbol}</span>
                            </div>
                        )}

                        <button className="w-full bg-green-500 text-white p-2 rounded-lg mt-2"
                            onClick={handleConfirmAddToken}
                            disabled={!customToken}>
                            Confirm & Add Token
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
