// components/SearchBar.tsx
"use client";
import { usePoolSearch } from "@/app/hooks/usePoolSearch";
import { PoolSearchResult } from "@/app/types";
import { emptyPairAtom } from "@data/store";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import Avatar from "./Avatar";
import { X } from "lucide-react";

const SearchBar: FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState<string | null>(null);
  const { data: results = [], isLoading } = usePoolSearch(query ?? "");
  const showDropdown = query && query.length > 0 && results.length > 0;

  const [selectedPair, setSelectedPair] = useAtom(emptyPairAtom);

  const handleSelect = (pair: PoolSearchResult) => {
    setSelectedPair(pair);
    setQuery(null);
    router.push(
      `/swap/${pair.coinA.symbol.toLocaleLowerCase()}/${pair.coinB.symbol.toLocaleLowerCase()}`
    );
  };

  const handleClear = () => {
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-lg">
      {isLoading ?? <>Loading...</>}
      {selectedPair?.coinA && selectedPair.coinB && query === null ? (
        <div className="w-full px-4 py-2 text-white bg-[#130e18] flex items-center space-x-2 justify-between">
          <div className="flex items-center space-x-2">
            <Avatar
              src={selectedPair.coinA.image}
              alt={selectedPair.coinA.symbol}
              className="w-5 h-5 rounded-full"
            />
            <Avatar
              src={selectedPair.coinB.image}
              alt={selectedPair.coinB.symbol}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-white text-sm">
              {selectedPair.coinA.symbol}/{selectedPair.coinB.symbol}
            </span>
          </div>
          <button
            onClick={handleClear}
            className="bg-[#000306] ml-auto rounded-none text-white border border-[#5E21A1] hover:text-red-400 text-xs px-2 py-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <input
          type="text"
          className="w-full px-4 py-2 bg-[#130e18] text-white focus:outline-none"
          placeholder="Search by CA or Symbol (e.g., 0x2::coin::SUI or SUI)"
          value={query ?? ""}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {showDropdown && (
        <ul className="absolute z-10 w-full mt-2 bg-[#130e18] shadow-lg max-h-60 overflow-auto">
          {results.map((result, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(result)}
              className="px-4 py-2 cursor-pointer hover:opacity-75 flex items-center space-x-2"
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

export default SearchBar;
