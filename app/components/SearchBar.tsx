"use client";
import { useState, useEffect, useRef } from "react";

interface Token {
    typeName: string;
    decimals: number;
    image: string;
    name: string;
    symbol: string;
}

interface PoolSearchResult {
    poolId: string;
    coinA: Token;
    coinB: Token;
}

interface SearchBarProps {
    onSelectPair: (data: PoolSearchResult) => void;
}

export default function SearchBar({ onSelectPair }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PoolSearchResult[]>([]);
    const [selectedPair, setSelectedPair] = useState<PoolSearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!query || query.length < 1) {
            setResults([]);
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search-pairs?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data.pairs || []);
                setShowDropdown(true);
            } catch (err) {
                console.error("Search failed", err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    }, [query]);

    const handleSelect = (result: PoolSearchResult) => {
        setSelectedPair(result);
        setQuery(""); // hide text input
        setShowDropdown(false);
        onSelectPair(result);
    };

    const handleClear = () => {
        setSelectedPair(null);
        setQuery("");
        setResults([]);
    };

    return (
        <div className="relative w-full max-w-lg">
            {selectedPair ? (
                <div
                    className="w-full px-4 py-2 rounded-md bg-gray-900 text-white border border-gray-700 flex items-center space-x-2"
                >
                    <img src={selectedPair.coinA.image} alt={selectedPair.coinA.symbol} className="w-5 h-5 rounded-full" />
                    <span className="text-white text-sm">/</span>
                    <img src={selectedPair.coinB.image} alt={selectedPair.coinB.symbol} className="w-5 h-5 rounded-full" />
                    <span className="text-white text-sm">
                        {selectedPair.coinA.symbol}/{selectedPair.coinB.symbol}
                    </span>
                    <button onClick={handleClear} className="bg-gray-900 ml-auto text-white border border-white hover:text-red-400 text-xs">
                        Clear
                    </button>
                </div>
            ) : (
                <input
                    type="text"
                    className="w-full px-4 py-2 rounded-md bg-gray-900 text-white border border-gray-700 focus:outline-none"
                    placeholder="Search by symbol or typename (e.g., SUI or 0x2::coin::SUI)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            )}

            {showDropdown && results.length > 0 && (
                <ul className="absolute z-10 w-full mt-2 bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto border border-gray-700">
                    {results.map((result, idx) => (
                        <li
                            key={idx}
                            onClick={() => handleSelect(result)}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-700 flex items-center space-x-2"
                        >
                            <div className="flex items-center space-x-1">
                                <img src={result.coinA.image} alt={result.coinA.symbol} className="w-5 h-5 rounded-full" />
                                <span className="text-white">/</span>
                                <img src={result.coinB.image} alt={result.coinB.symbol} className="w-5 h-5 rounded-full" />
                            </div>
                            <span className="text-white ml-2">
                                {result.coinA.symbol}/{result.coinB.symbol}
                            </span>
                            <span className="ml-auto text-sm text-gray-400">{result.poolId.slice(0, 8)}...</span>
                        </li>
                    ))}
                </ul>
            )}

            {loading && <p className="text-sm mt-1 text-gray-400">Searching...</p>}
        </div>
    );
}
