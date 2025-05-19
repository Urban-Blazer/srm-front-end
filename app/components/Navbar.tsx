"use client";

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@mysten/dapp-kit';

export default function NavBar() {
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const toggleDropdown = (menu: string) => {
    setDropdown(dropdown === menu ? null : menu);
  };

  const openDropdown = (menu: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout); // Clear any previous timeout
    setDropdown(menu);
  };

  const closeDropdown = () => {
    const timeout = setTimeout(() => {
      setDropdown(null);
    }, 300); // Small delay prevents accidental closing
    setHoverTimeout(timeout);
  };

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false);
    setDropdown(null); // Optional: close any open submenu too
  };

  const getMenuUrl = (menu: string)=>{
    let url = menu;
    switch (menu) {
      case 'swap':
        url = 'swap/sui/srm'
        break;
      default:
        break;
    }
    return url;
  }

  return (
    <nav className="navbar text-white p-4 flex flex-col items-center justify-between relative z-50">
      <div className="flex w-full max-w-3xl mt-4">
        {/* Left Section: Logo */}
        <div className="flex w-full items-center justify-between">
          <Link href="/swap/sui/srm" className="relative w-full flex items-center justify-center sm:justify-start">
            <Image
              src="/images/logosrm.png"
              alt="Sui Rewards Me App Logo"
              width={300} /* Adjusted size for mobile fit */
              height={120}
              priority
            />
          </Link>
        </div>

        {/* Desktop Wallet Connect Button (Hidden on Mobile) */}
        <div className="min-w-[150px] hidden md:flex ml-auto">
          <ConnectButton />
        </div>

      </div>
      <div className="flex w-full border-b p-0 m-0 mt-8 border-[#5E21A1]">
      </div>

      {/* Desktop Menu (Hidden on Mobile) */}
      <div className="hidden md:flex space-x-4 ml-8">
        {["dashboard", "swap", "pools", "launchpad", "info"].map((menu) => (
          <div
            key={menu}
            className="relative group"
            onMouseEnter={() => openDropdown(menu)}
            onMouseLeave={closeDropdown}
          >
            <Link href={`/${getMenuUrl(menu)}`}>
              <button className="menu-button px-4 py-2">{menu.charAt(0).toUpperCase() + menu.slice(1)}</button>
            </Link>
            {dropdown === menu && (
              <div className="absolute left-0 mt-2 p-2 bg-slate-900 text-white rounded shadow-md w-40 z-50"
                onMouseEnter={() => {
                  if (hoverTimeout) clearTimeout(hoverTimeout);
                }}
                onMouseLeave={closeDropdown}
              >
                {/*<Link href={`/${menu}`} className="block px-4 py-2 hover:bg-softMint">Overview</Link>*/}
                {menu === "dashboard" && <Link href="/dashboard/my-royalties" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">My Royalties</Link>}
                {menu === "swap" && (
                  <>
                  <Link href="/swap/sui/srm" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">$SRM</Link>
                  <Link href="/swap/sui/wagmi" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">$WAGMI</Link>
                  </>
                )}
                {menu === "pools" && (
                  <>
                    <Link href="/pools" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">Pool Stats</Link>
                    <Link href="/pools/my-positions" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">My Positions</Link>
                    <Link href="/pools/create-pool" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">Create Pool</Link>
                    <Link href="/pools/add-liquidity" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">Add Liquidity</Link>
                    <Link href="/pools/burn-liquidity" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">Burn Liquidity</Link>
                  </>
                )}
                {menu === "launchpad" && (
                  <>
                    <Link href="/launchpad/create-coin" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">Create Coin</Link>
                    {/*<Link href="/launchpad/coming-soon" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">Coming Soon</Link>*/}
                  </>
                )}
                {menu === "info" && (
                  <>
                    <Link href="https://medium.com/@suirewardsme/introducing-sui-rewards-me-the-worlds-first-rewards-dex-on-the-sui-blockchain-76e6832f140d" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">About SRM</Link>
                    <Link href="/docs/SuiRewardsMe_DEX.pdf" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">SRM Dex Audit</Link>
                    <Link href="/docs/SuiRewardsMe_SRM.pdf" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-white hover:bg-slate-200 hover:text-black">SRM Coin Audit</Link>
                  </>
                )}
              </div>
            )}
          </div>
        )).concat([
          // 🔥 Perfect clone of internal buttons, but with external <a> tag
          <div key="bridge-link" className="relative group">
            <a
              href="https://bridge.sui.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="menu-button px-4 py-2">BRIDGE</button>
            </a>
          </div>
        ])}
      </div>

      {/* Right Section: Mobile Menu Button (Only Visible on Mobile) */}
      <div className="md:hidden ml-auto">
        <button
          className="menu-button text-white text-2xl"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu (Slide-in) */}
      {isMobileMenuOpen && (
        <div className="h-[calc(100vh-64px)] mt-2 bg-black right-0 bg-darkBlue w-full sm:w-64 p-4 shadow-lg flex flex-col items-start md:hidden">
          {["dashboard", "swap", "pools", "launchpad", "info"].map((menu) => (
            <div key={menu} className="w-full">
              <button
                className="text-center text-white menu-button w-full text-left px-4 py-2 hover:bg-softMint"
                onClick={() => toggleDropdown(menu)}
              >
                {menu.charAt(0).toUpperCase() + menu.slice(1)}
              </button>
              {dropdown === menu && (
                <div className="bg-white text-black p-2 rounded w-full">
                  {/*<Link href={`/${menu}`} className="block px-4 py-2 hover:bg-softMint">Overview</Link>*/}
                  {menu === "dashboard" && <Link href="/dashboard/my-royalties" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>My Royalties</Link>}
                  {menu === "swap" && (
                    <>
                    <Link href="/swap/sui/srm" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>$SRM</Link>
                    <Link href="/swap/sui/wagmi" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>$WAGMI</Link>
                    </>
                  )}
                  {menu === "pools" && (
                    <>
                      <Link href="/pools" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>Pool Stats</Link>
                      <Link href="/pools/my-positions" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>My Positions</Link>
                      <Link href="/pools/create-pool" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>Create Pool</Link>
                      <Link href="/pools/add-liquidity" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>Add Liquidity</Link>
                      <Link href="/pools/burn-liquidity" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>Burn Liquidity</Link>
                    </>
                  )}
                  {menu === "launchpad" && (
                    <>
                      <Link href="/launchpad/create-coin" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>Create Coin</Link>
                      {/*<Link href="/launchpad/coming-soon" className="block px-4 py-2 hover:bg-softMint">Coming Soon</Link>*/}
                    </>
                  )}
                  {menu === "info" && (
                    <>
                      <Link href="https://medium.com/@suirewardsme/introducing-sui-rewards-me-the-worlds-first-rewards-dex-on-the-sui-blockchain-76e6832f140d" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>About SRM</Link>
                      <Link href="/docs/SuiRewardsMe_DEX.pdf" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>SRM DEX Audit</Link>
                      <Link href="/docs/SuiRewardsMe_SRM.pdf" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-softMint" onClick={handleMobileLinkClick}>SRM Coin Audit</Link>
                    </>
                  )}

                </div>
              )}
            </div>

          )).concat([
            // 🔥 Perfect clone of internal buttons, but with external <a> tag
            <div key="bridge-link" className="w-full">
              <a
                href="https://bridge.sui.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
                onClick={handleMobileLinkClick}
              >
                <div className="menu-button block w-full bg-[#000306] text-white font-semibold text-center px-4 py-2 rounded-md hover:bg-softMint hover:text-black transition-colors duration-200">
                  BRIDGE
                </div>
              </a>
            </div>
          ])}

          {/* Wallet Connect Button for Mobile Menu */}
          <div className="w-full mt-4 flex justify-center flex-1 min-w-[150px] max-h-[50px]">
            <ConnectButton />
          </div>
        </div>
      )}
      <div className="flex w-full border-b p-0 m-0 border-[#5E21A1]">
      </div>
    </nav>
  );
}