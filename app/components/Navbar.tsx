"use client";
import Link from "next/link";
import StickyHeader from "./StickyHeader";

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-gray-800 text-white relative z-50">
      <div className="text-xl font-bold">
        <Link href="/">SRM DEX</Link> {/* ✅ Ensure home page link works */}
      </div>

      {/* ✅ Navigation Links */}
      <ul className="flex space-x-6 ml-auto pr-10">
        <li><Link href="/dashboard" className="hover:text-blue-400">Dashboard</Link></li>
        <li><Link href="/swap" className="hover:text-blue-400">Swap</Link></li>
        <li><Link href="/launchpad" className="hover:text-blue-400">Launchpad</Link></li>
        <li><Link href="/pools" className="hover:text-blue-400">Pools</Link></li>
        <li><Link href="/liquidity" className="hover:text-blue-400">Liquidity</Link></li>
      </ul>

      {/* Wallet Connect Button */}
      <div className="ml-auto">
        <StickyHeader />
      </div>
    </nav>
  );
}