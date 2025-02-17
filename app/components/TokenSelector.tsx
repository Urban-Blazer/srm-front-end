import { useState, useEffect, useRef } from "react";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC } from "../config";
import { predefinedCoins } from "@data/coins";
import { X, Search, PlusCircle, Plus, MinusCircle, Loader2 } from "lucide-react";

const provider = new SuiClient({ url: GETTER_RPC });

interface Token {
    symbol: string;
    typeName: string;
    logo: string;
}

interface TokenSelectorProps {
    onSelectToken: (token: Token) => void;
    onClose: () => void;
}

export default function TokenSelector({ onSelectToken, onClose }: TokenSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [savedTokens, setSavedTokens] = useState<Token[]>([]);
    const [showAddTokenModal, setShowAddTokenModal] = useState(false);
    const [customTypeName, setCustomTypeName] = useState("");
    const [loading, setLoading] = useState(false);
    const [customToken, setCustomToken] = useState<Token | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);

    // Load user-saved tokens from localStorage
    useEffect(() => {
        const storedTokens = localStorage.getItem("savedTokens");
        console.log("Loaded savedTokens from localStorage:", storedTokens);
        if (storedTokens) {
            setSavedTokens(JSON.parse(storedTokens));
        }
    }, []);

    // Save to localStorage whenever savedTokens changes
    useEffect(() => {
        console.log("Updated savedTokens:", savedTokens);
        localStorage.setItem("savedTokens", JSON.stringify(savedTokens));
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
    const handleSelectToken = (token: Token) => {
        console.log("Selected token:", token); // Debugging
        console.log("TypeName:", token.typeName); // Ensure it's available
        onSelectToken(token); // Pass the full token to parent
        onClose();
    };

    // Handle adding a new token to saved list
    const handleAddToken = (token: Token) => {
        console.log("Trying to add token:", token);
        if (!savedTokens.some((t) => t.typeName === token.typeName)) {
            const updatedTokens = [...savedTokens.slice(-19), token]; // Keep last 20
            console.log("Updated savedTokens:", updatedTokens);
            setSavedTokens(updatedTokens);
            localStorage.setItem("savedTokens", JSON.stringify(updatedTokens)); // Persist across sessions
        } else {
            console.log("Token already exists in savedTokens.");
        }
    };

    const handleRemoveToken = (token: Token) => {
        console.log("Removing token:", token); // Debugging
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
                const newToken: Token = {
                    symbol: metadata.symbol || "UNKNOWN",
                    typeName: customTypeName.trim(),
                    logo: metadata.iconUrl || "https://via.placeholder.com/32", // Fallback image
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
                        <h2 className="text-lg font-bold">Select a Token</h2>
                        <button onClick={onClose}>
                            <X size={20} className="text-gray-500 hover:text-gray-800" />
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
                        className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition"
                        onClick={() => setShowAddTokenModal(true)}
                    >
                        <Plus size={18} className="inline-block mr-2" /> Add Custom Token
                    </button>

                    {/* Saved Tokens (User Added) */}
                    {savedTokens.length > 0 ? (
                        <div className="mt-2">
                            <h3 className="text-sm text-gray-600 mb-1">Your Tokens</h3>
                            {savedTokens.map((token) => (
                                <div
                                    key={token.typeName}
                                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                    onClick={() => handleSelectToken(token)}
                                >
                                    <div className="flex items-center">
                                        <img src={token.logo} alt={token.symbol} className="w-6 h-6 mr-2" />
                                        <span className="text-gray-800">{token.symbol}</span>
                                    </div>
                                    {/* 🚀 Remove Token Button */}
                                    <button
                                        className="text-red-500 hover:text-red-700"
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
                        <p className="text-gray-500 text-sm mt-2">No custom tokens added yet.</p>
                    )}

                    {/* Common Tokens */}
                    <div className="mt-2">
                        <h3 className="text-sm text-gray-600 mb-1">Common Tokens</h3>
                        {filteredTokens.map((token) => (
                            <div
                                key={token.typeName}
                                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                            >
                                <div
                                    className="flex items-center cursor-pointer"
                                    onClick={() => handleSelectToken(token)}
                                >
                                    <img src={token.logo} alt={token.symbol} className="w-6 h-6 mr-2" />
                                    <span className="text-gray-800">{token.symbol}</span>
                                </div>
                                <button
                                    className="text-blue-500 hover:text-blue-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToken(token);
                                    }}
                                >
                                    <PlusCircle size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
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
                                <img src={customToken.logo} alt={customToken.symbol} className="w-6 h-6 mr-2" />
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
