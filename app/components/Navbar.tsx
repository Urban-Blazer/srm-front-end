"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import StickyHeader from "./StickyHeader";

export default function NavBar() {
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (menu: string) => {
    if (timeoutId) clearTimeout(timeoutId); // Prevent accidental closing
    setDropdown(menu);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => setDropdown(null), 300); // Delay closing by 300ms
    setTimeoutId(id);
  };

  return (
    <nav className="bg-gray-900 text-white p-4 flex justify-between relative">
      <Link href="/" className="text-lg font-bold">Sui Rewards Me App</Link>

      {/* Dashboard Menu */}
      <div className="relative group"
        onMouseEnter={() => handleMouseEnter("dashboard")}
        onMouseLeave={handleMouseLeave}
      >
        <button className="px-4 py-2">Dashboard</button>
        {dropdown === "dashboard" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40">
            <Link href="/dashboard" className="block px-4 py-2 hover:bg-gray-700">Overview</Link>
            <Link href="/dashboard/rewards" className="block px-4 py-2 hover:bg-gray-700">Rewards</Link>
          </div>
        )}
      </div>

      {/* Swap Menu */}
      <div className="relative group"
        onMouseEnter={() => handleMouseEnter("swap")}
        onMouseLeave={handleMouseLeave}
      >
        <button className="px-4 py-2">Swap</button>
        {dropdown === "swap" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40">
            <Link href="/swap" className="block px-4 py-2 hover:bg-gray-700">Swap</Link>
          </div>
        )}
      </div>

      {/* Pools Menu */}
      <div className="relative group"
        onMouseEnter={() => handleMouseEnter("pools")}
        onMouseLeave={handleMouseLeave}
      >
        <button className="px-4 py-2">Pools</button>
        {dropdown === "pools" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40">
            <Link href="/pools" className="block px-4 py-2 hover:bg-gray-700">Overview</Link>
            <Link href="/pools/create-pool" className="block px-4 py-2 hover:bg-gray-700">Create Pool</Link>
            <Link href="/pools/add-liquidity" className="block px-4 py-2 hover:bg-gray-700">Add Liquidity</Link>
          </div>
        )}
      </div>

      {/* Launchpad Menu */}
      <div className="relative group"
        onMouseEnter={() => handleMouseEnter("launchpad")}
        onMouseLeave={handleMouseLeave}
      >
        <button className="px-4 py-2">Launchpad</button>
        {dropdown === "launchpad" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40">
            <Link href="/launchpad" className="block px-4 py-2 hover:bg-gray-700">Overview</Link>
            <Link href="/launchpad/create-coin" className="block px-4 py-2 hover:bg-gray-700">Create Coin</Link>
            <Link href="/launchpad/coming-soon" className="block px-4 py-2 hover:bg-gray-700">Coming Soon</Link>
          </div>
        )}
      </div>

      {/* Wallet Connect Button */}
      <div className="ml-auto">
        <StickyHeader />
      </div>
    </nav>
  );
}
