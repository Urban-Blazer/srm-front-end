"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import StickyHeader from "./StickyHeader";
import Image from 'next/image';

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
    <nav className="navbar text-white p-4 flex justify-between relative z-50">
      {/* Logo Link */}
      <Link href="/" className="mr-6 flex items-center">
        <Image
          src="/logo_wide_2.png" // Replace with your actual image path
          alt="Sui Rewards Me App Logo"
          width={250} // Adjust width as needed
          height={100} // Adjust height as needed
          priority // Ensures faster loading
        />
      </Link>

      <div className="flex space-x-4">
      {/* Dashboard Menu */}
      <div className="relative group"
        onMouseEnter={() => handleMouseEnter("dashboard")}
        onMouseLeave={handleMouseLeave}
      >
        <Link href="/dashboard">
          <button className="button-primary px-4 py-2">Dashboard</button>
        </Link>
        {dropdown === "dashboard" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40 z-50">
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
        <Link href="/swap">
          <button className="button-primary px-4 py-2">Swap</button>
        </Link>
        {dropdown === "swap" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40 z-50">
            <Link href="/swap" className="block px-4 py-2 hover:bg-gray-700">Swap</Link>
          </div>
        )}
      </div>

      {/* Pools Menu */}
      <div className="relative group"
        onMouseEnter={() => handleMouseEnter("pools")}
        onMouseLeave={handleMouseLeave}
      >
        <Link href="/pools">
          <button className="button-primary px-4 py-2">Pools</button>
        </Link>
        {dropdown === "pools" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40 z-50">
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
        <Link href="/launchpad">
          <button className="button-primary px-4 py-2">Launchpad</button>
        </Link>
        {dropdown === "launchpad" && (
          <div className="absolute bg-gray-800 p-2 rounded shadow-md w-40 z-50">
            <Link href="/launchpad" className="block px-4 py-2 hover:bg-gray-700">Overview</Link>
            <Link href="/launchpad/create-coin" className="block px-4 py-2 hover:bg-gray-700">Create Coin</Link>
            <Link href="/launchpad/coming-soon" className="block px-4 py-2 hover:bg-gray-700">Coming Soon</Link>
          </div>
        )}
      </div>
      </div>

      {/* Wallet Connect Button */}
      <div className="ml-auto">
        <StickyHeader />
      </div>
    </nav>
  );
}
