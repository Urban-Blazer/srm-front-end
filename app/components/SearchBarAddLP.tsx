// components/SearchBar.tsx
"use client";
import { usePoolSearch } from "@/app/hooks/usePoolSearch";
import { PoolSearchResult } from "@/app/types";
import { FC, useState } from "react";
import Avatar from "./Avatar";

interface SearchBarAddLPProps {
  onSelectPair: (pair: PoolSearchResult) => void;
}

const SearchBarAddLP: FC<SearchBarAddLPProps> = ({ onSelectPair }) => {
  const [query, setQuery] = useState<string | null>(null);
  const { data: results = [], isLoading } = usePoolSearch(query ?? "");
  const showDropdown = query && query.length > 0 && results.length > 0;

  const handleSelect = (pair: PoolSearchResult) => {
    onSelectPair(pair);
    setQuery(null);
  };

  return (
    <div className="relative w-full">
      {isLoading ?? <>Loading...</>}
      <input
        type="text"
        className="w-full px-4 py-2 bg-gray-900 text-white border border-gray-700 focus:outline-none"
        placeholder="Search by CA or Symbol (e.g., 0x2::coin::SUI or SUI)"
        value={query ?? ""}
        onChange={(e) => setQuery(e.target.value)}
        />

      {showDropdown && (
        <ul className="absolute z-10 w-full mt-2 bg-gray-800 shadow-lg max-h-60 overflow-auto border border-gray-700">
          {results.map((result, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(result)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-700 flex items-center space-x-2"
            >
              <div className="flex items-center space-x-1">
                <Avatar
                  src={result.coinA.image}
                  alt={result.coinA.symbol}
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-white">/</span>
                <Avatar
                  src={result.coinB.image}
                  alt={result.coinB.symbol}
                  className="w-5 h-5 rounded-full"
                />
              </div>
              <span className="text-white ml-2">
                {result.coinA.symbol}/{result.coinB.symbol}
              </span>
              <span className="ml-auto text-sm text-gray-400">
                {result.poolId.slice(0, 8)}...
              </span>
            </li>
          ))}
        </ul>
      )}

      {isLoading && <p className="text-sm mt-1 text-gray-400">Searching...</p>}
    </div>
  );
};

export default SearchBarAddLP;
