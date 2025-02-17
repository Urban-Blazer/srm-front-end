import { useState, useEffect, useRef } from "react";
import { predefinedCoins } from "@data/coins";
import { X, Search } from "lucide-react";

interface Token {
    symbol: string;
    logo: string;
}

interface TokenSelectorProps {
    onSelectToken: (token: Token) => void;
    onClose: () => void;
    type: "sell" | "buy";
}

export default function TokenSelector({ onSelectToken, onClose, type }: TokenSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [recentTokens, setRecentTokens] = useState<Token[]>([]);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // ✅ Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    // ✅ Handle Token Selection
    const handleSelectToken = (token: Token) => {
        if (!recentTokens.some((t) => t.symbol === token.symbol)) {
            setRecentTokens((prev) => [...prev.slice(-4), token]);
        }
        onSelectToken(token);
        onClose();
    };

    // ✅ Filter Tokens
    const filteredTokens = predefinedCoins.filter((token) =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Background Overlay */}
            <div
                className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40"
                onClick={onClose}
            ></div>

            {/* Centered Modal for Token Selection */}
            <div
                ref={dropdownRef}
                className="fixed inset-0 flex justify-center items-center z-50"
            >
                <div className="w-96 bg-white border rounded-lg shadow-lg p-4 max-h-[500px] overflow-y-auto">
                    {/* Title */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Select a token</h2>
                        <button onClick={onClose}>
                            <X size={20} className="text-gray-500 hover:text-gray-800" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative my-3">
                        <input
                            type="text"
                            className="w-full border p-2 rounded-lg pl-10 text-black placeholder-gray-500"
                            placeholder="Search tokens or paste address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                    </div>

                    {/* Recently Used Tokens */}
                    {recentTokens.length > 0 && (
                        <div className="mt-2">
                            <h3 className="text-sm text-gray-600 mb-1">Recently Used</h3>
                            {recentTokens.map((token) => (
                                <div
                                    key={token.symbol}
                                    className="flex items-center p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                    onClick={() => handleSelectToken(token)}
                                >
                                    <img src={token.logo} alt={token.symbol} className="w-6 h-6 mr-2" />
                                    <span className="text-gray-800">{token.symbol}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Common Tokens */}
                    <div className="mt-2">
                        <h3 className="text-sm text-gray-600 mb-1">Common Tokens</h3>
                        {filteredTokens.map((token) => (
                            <div
                                key={token.symbol}
                                className="flex items-center p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                onClick={() => handleSelectToken(token)}
                            >
                                <img src={token.logo} alt={token.symbol} className="w-6 h-6 mr-2" />
                                <span className="text-gray-800">{token.symbol}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
