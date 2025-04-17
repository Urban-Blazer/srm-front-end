"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StickyHeader from "./StickyHeader";
import Image from 'next/image';
import MergeCoinsModal from "./MergeCoinsModal";
import { NightlyConnectSuiAdapter } from "@nightlylabs/wallet-selector-sui";

export default function NavBar() {
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [walletAdapter, setWalletAdapter] = useState<NightlyConnectSuiAdapter | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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

  // ✅ Initialize Nightly Connect and Fetch Pools
  useEffect(() => {
    const initWallet = async () => {
      try {
        const adapter = await NightlyConnectSuiAdapter.build({
          appMetadata: {
            name: "Sui Rewards Me",
            description: "Rewards DEX on Sui",
            icon: "https://your-app-logo-url.com/icon.png",
          },
        });

        setWalletAdapter(adapter);
        await adapter.connect();
        const accounts = await adapter.getAccounts();

        if (accounts.length > 0) {
          console.log("✅ Wallet Connected:", accounts[0]);
          setWalletConnected(true);
          setWalletAddress(accounts[0].address); // 🔥 FIXED: Extract actual address

        } else {
          console.warn("⚠️ No accounts found.");
        }

        adapter.on("connect", async (account) => {
          console.log("🔗 Wallet connected:", account);
          setWalletConnected(true);
          setWalletAddress(accounts[0].address); // 🔥 FIXED: Extract actual address
        });

        adapter.on("disconnect", () => {
          console.log("🔌 Wallet disconnected");
          setWalletConnected(false);
          setWalletAddress(null);
        });

      } catch (error) {
        console.error("❌ Failed to initialize Nightly Connect:", error);
      }
    };

    initWallet();
  }, []);

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
            onMouseEnter={() => openDropdown(menu)}
            onMouseLeave={closeDropdown}
          >
            <Link href={`/${menu}`}>
              <button className="button-primary px-4 py-2">{menu.charAt(0).toUpperCase() + menu.slice(1)}</button>
            </Link>
            {dropdown === menu && (
              <div className="absolute left-0 mt-2 bg-white text-black p-2 rounded shadow-md w-40 z-50"
                onMouseEnter={() => {
                  if (hoverTimeout) clearTimeout(hoverTimeout);
                }}
                onMouseLeave={closeDropdown}
              >
                {/*<Link href={`/${menu}`} className="block px-4 py-2 hover:bg-softMint">Overview</Link>*/}
                {menu === "dashboard" && <Link href="/dashboard/my-royalties" className="block px-4 py-2 hover:bg-softMint">My Royalties</Link>}
                {menu === "swap" && <Link href="/swap" className="block px-4 py-2 hover:bg-softMint">Swap Coins</Link>}
                {menu === "pools" && (
                  <>
                    <Link href="/pools" className="block px-4 py-2 hover:bg-softMint">My Positions</Link>
                    <Link href="/pools/create-pool" className="block px-4 py-2 hover:bg-softMint">Create Pool</Link>
                    <Link href="/pools/add-liquidity" className="block px-4 py-2 hover:bg-softMint">Add Liquidity</Link>
                    <Link href="/pools/burn-liquidity" className="block px-4 py-2 hover:bg-softMint">Burn Liquidity</Link>
                  </>
                )}
                {menu === "launchpad" && (
                  <>
                    <Link href="/launchpad/create-coin" className="block px-4 py-2 hover:bg-softMint">Create Coin</Link>
                    {/*<Link href="/launchpad/coming-soon" className="block px-4 py-2 hover:bg-softMint">Coming Soon</Link>*/}
                  </>
                )}

              </div>
            )}
          </div>
        )).concat([
          // 🔥 Perfect clone of internal buttons, but with external <a> tag
          <div key="external-link" className="relative group">
            <a
              href="https://bridge.sui.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="button-primary px-4 py-2">BRIDGE</button>
            </a>
          </div>
          <div key="external-link" className="relative group">
            <a
              href="https://medium.com/@suirewardsme/introducing-sui-rewards-me-the-worlds-first-rewards-dex-on-the-sui-blockchain-76e6832f140d"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="button-primary px-4 py-2">START HERE</button>
            </a>
          </div>
        ])}
      </div>

      <div className="ml-4 mb-2 flex items-center">
        {/* ✅ Merge Coins Modal */}
        {walletAdapter && walletConnected && <MergeCoinsModal adapter={walletAdapter} />}
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
                  {/*<Link href={`/${menu}`} className="block px-4 py-2 hover:bg-softMint">Overview</Link>*/}
                  {menu === "dashboard" && <Link href="/dashboard/my-royalties" className="block px-4 py-2 hover:bg-softMint">My Royalties</Link>}
                  {menu === "swap" && <Link href="/swap" className="block px-4 py-2 hover:bg-softMint">Swap Coins</Link>}
                  {menu === "pools" && (
                    <>
                      <Link href="/pools" className="block px-4 py-2 hover:bg-softMint">My Positions</Link>
                      <Link href="/pools/create-pool" className="block px-4 py-2 hover:bg-softMint">Create Pool</Link>
                      <Link href="/pools/add-liquidity" className="block px-4 py-2 hover:bg-softMint">Add Liquidity</Link>
                      <Link href="/pools/burn-liquidity" className="block px-4 py-2 hover:bg-softMint">Burn Liquidity</Link>
                    </>
                  )}
                  {menu === "launchpad" && (
                    <>
                      <Link href="/launchpad/create-coin" className="block px-4 py-2 hover:bg-softMint">Create Coin</Link>
                      {/*<Link href="/launchpad/coming-soon" className="block px-4 py-2 hover:bg-softMint">Coming Soon</Link>*/}
                    </>
                  )}
                </div>
              )}
            </div>
          )).concat([
            // 🔥 Perfect clone of internal buttons, but with external <a> tag
            <div key="external-link" className="relative group">
              <a
                href="https://bridge.sui.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="block px-4 py-2 hover:bg-softMint">BRIDGE</button>
              </a>
            </div>
            <div key="external-link" className="relative group">
              <a
                href="https://medium.com/@suirewardsme/introducing-sui-rewards-me-the-worlds-first-rewards-dex-on-the-sui-blockchain-76e6832f140d"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="block px-4 py-2 hover:bg-softMint">START HERE</button>
              </a>
            </div>
          ])}

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
