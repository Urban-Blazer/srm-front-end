// components/SearchBar.tsx
"use client";
import { useState, useEffect, FC } from "react";
import { PoolSearchResult } from "@/app/types";
import { PrimitiveAtom, useAtom } from "jotai";
import { usePoolSearch } from "@/app/hooks/usePoolSearch";
import { useRouter } from "next/navigation";

type WithInitialValue<Value> = {
  init: Value;
};

interface SearchBarProps {
  useDefaultPair?: boolean;
  defaultAtom:  PrimitiveAtom<PoolSearchResult | null> & WithInitialValue<PoolSearchResult | null>;
  onSelectPair: (data: PoolSearchResult) => void;
}

const SearchBar: FC<SearchBarProps> = ({ useDefaultPair, defaultAtom, onSelectPair }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: results = [], isLoading } = usePoolSearch(query);
  const showDropdown = query.length > 0 && results.length > 0;

  const [selectedPair, setSelectedPair] = useAtom(defaultAtom);

  // On mount, re-fire onSelectPair if we already have one
  useEffect(() => {
    if (selectedPair && useDefaultPair) {
      onSelectPair(selectedPair);
      useDefaultPair = false;
    }
    if(!useDefaultPair)  setSelectedPair(null);
  }, []);

  const handleSelect = (pair: PoolSearchResult) => {
    // setSelectedPair(pair);
    setQuery("");
    onSelectPair(pair);
    router.push(`/swap/${pair.coinA.symbol.toLocaleLowerCase()}/${pair.coinB.symbol.toLocaleLowerCase()}`);
  };

  const handleClear = () => {
    setSelectedPair(null);
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-lg">
        {isLoading ?? (<>Loading...</>)}
      {selectedPair ? (
        <div className="w-full px-4 py-2 text-white border border-[#61F98A] flex items-center space-x-2">
          <img
            src={selectedPair.coinA.image}
            alt={selectedPair.coinA.symbol}
            className="w-5 h-5 rounded-full"
          />
          <img
            src={selectedPair.coinB.image}
            alt={selectedPair.coinB.symbol}
            className="w-5 h-5 rounded-full"
          />
          <span className="text-white text-sm">
            {selectedPair.coinA.symbol}/{selectedPair.coinB.symbol}
          </span>
          <button
            onClick={handleClear}
            className="bg-[#000306] ml-auto rounded-none text-white border border-[#5E21A1] hover:text-red-400 text-xs"
          >
            Clear
          </button>
        </div>
      ) : (
        <input
          type="text"
          className="w-full px-4 py-2 bg-gray-900 text-white border border-gray-700 focus:outline-none"
          placeholder="Search by symbol or typename (e.g., SUI or 0x2::coin::SUI)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {showDropdown && (
        <ul className="absolute z-10 w-full mt-2 bg-gray-800 shadow-lg max-h-60 overflow-auto border border-gray-700">
          {results.map((result, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(result)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-700 flex items-center space-x-2"
            >
              <div className="flex items-center space-x-1">
                <img
                  src={result.coinA.image}
                  alt={result.coinA.symbol}
                  className="w-5 h-5"
                />
                <span className="text-white">/</span>
                <img
                  src={result.coinB.image}
                  alt={result.coinB.symbol}
                  className="w-5 h-5"
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

      {isLoading && (
        <p className="text-sm mt-1 text-gray-400">Searching...</p>
      )}
    </div>
  );
};

export default SearchBar;
