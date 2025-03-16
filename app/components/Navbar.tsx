"use client";

import Link from 'next/link';
import { useState } from 'react';
import StickyHeader from "./StickyHeader";
import Image from 'next/image';

export default function NavBar() {
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDropdown = (menu: string) => {
    setDropdown(dropdown === menu ? null : menu);
  };

  return (
    <nav className="navbar text-white p-4 flex items-center justify-between relative z-50">
      {/* Left Section: Logo */}
      <div className="flex items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo_wide_1.png"
            alt="Sui Rewards Me App Logo"
            width={150} /* Adjusted size for mobile fit */
            height={60}
            priority
          />
        </Link>
      </div>

      {/* Desktop Menu (Hidden on Mobile) */}
      <div className="hidden md:flex space-x-4 ml-8">
        {["dashboard", "swap", "pools", "launchpad"].map((menu) => (
          <div
            key={menu}
            className="relative group"
            onMouseEnter={() => setDropdown(menu)}
            onMouseLeave={() => setDropdown(null)}
          >
            <Link href={`/${menu}`}>
              <button className="button-primary px-4 py-2">{menu.charAt(0).toUpperCase() + menu.slice(1)}</button>
            </Link>
            {dropdown === menu && (
              <div className="absolute left-0 mt-2 bg-white text-black p-2 rounded shadow-md w-40 z-50">
                <Link href={`/${menu}`} className="block px-4 py-2 hover:bg-softMint">Overview</Link>
                {menu === "dashboard" && <Link href="/dashboard/rewards" className="block px-4 py-2 hover:bg-softMint">Rewards</Link>}
                {menu === "pools" && (
                  <>
                    <Link href="/pools/create-pool" className="block px-4 py-2 hover:bg-softMint">Create Pool</Link>
                    <Link href="/pools/add-liquidity" className="block px-4 py-2 hover:bg-softMint">Add Liquidity</Link>
                  </>
                )}
                {menu === "launchpad" && (
                  <>
                    <Link href="/launchpad/create-coin" className="block px-4 py-2 hover:bg-softMint">Create Coin</Link>
                    <Link href="/launchpad/coming-soon" className="block px-4 py-2 hover:bg-softMint">Coming Soon</Link>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right Section: Mobile Menu Button (Only Visible on Mobile) */}
      <div className="md:hidden ml-auto">
        <button
          className="text-white text-2xl"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu (Slide-in) */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 right-0 bg-darkBlue w-full sm:w-64 p-4 shadow-lg flex flex-col items-start md:hidden">
          {["dashboard", "swap", "pools", "launchpad"].map((menu) => (
            <div key={menu} className="w-full">
              <button
                className="text-white w-full text-left px-4 py-2 hover:bg-softMint"
                onClick={() => toggleDropdown(menu)}
              >
                {menu.charAt(0).toUpperCase() + menu.slice(1)}
              </button>
              {dropdown === menu && (
                <div className="bg-white text-black p-2 rounded w-full">
                  <Link href={`/${menu}`} className="block px-4 py-2 hover:bg-softMint">Overview</Link>
                  {menu === "dashboard" && <Link href="/dashboard/rewards" className="block px-4 py-2 hover:bg-softMint">Rewards</Link>}
                  {menu === "pools" && (
                    <>
                      <Link href="/pools/create-pool" className="block px-4 py-2 hover:bg-softMint">Create Pool</Link>
                      <Link href="/pools/add-liquidity" className="block px-4 py-2 hover:bg-softMint">Add Liquidity</Link>
                    </>
                  )}
                  {menu === "launchpad" && (
                    <>
                      <Link href="/launchpad/create-coin" className="block px-4 py-2 hover:bg-softMint">Create Coin</Link>
                      <Link href="/launchpad/coming-soon" className="block px-4 py-2 hover:bg-softMint">Coming Soon</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Wallet Connect Button for Mobile Menu */}
          <div className="w-full mt-4 flex justify-center">
            <StickyHeader />
          </div>
        </div>
      )}

      {/* Desktop Wallet Connect Button (Hidden on Mobile) */}
      <div className="hidden md:flex ml-auto">
        <StickyHeader />
      </div>
    </nav>
  );
}
