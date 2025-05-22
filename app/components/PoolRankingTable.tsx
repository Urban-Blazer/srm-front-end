// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import CopyIcon from "@svg/copy-icon.svg";

type Pool = {
    pool_id: string;
    buyTxCount: number;
    sellTxCount: number;
    buyVolume: number;
    sellVolume: number;
    totalVolume: number;
    lp_builder_fee: string;
    burn_fee: string;
    creator_royalty_fee: string;
    rewards_fee: string;
    creator_royalty_wallet: string;
    timestamp: string;
    coinA_symbol?: string;
    coinB_symbol?: string;
    coinA_image?: string;
    coinB_image?: string;
    coinA_decimals?: number;
};

type PoolSortKey = 'buyVolume' | 'sellVolume' | 'totalVolume' | 'timestamp';

const formatBpsToPercent = (bps: string) => {
    const num = Number(bps);
    return isNaN(num) ? '-' : `${(num / 100).toFixed(2)}%`;
};

const timeAgoFromTimestamp = (timestamp: string): string => {
    const now = Date.now();
    const diffMs = now - Number(timestamp);
    const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
    const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.length > 0 ? parts.join(' ') : 'just now';
};

const formatTokenAmount = (amount: number, decimals: number) =>
    (amount / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function PoolRankingTable() {
    const [data, setData] = useState<Pool[]>([]);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [range, setRange] = useState<'24h' | '7d' | 'all'>('24h');

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/pool-ranking?range=${range}`);
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error('[DEBUG] Fetch failed:', err);
            }
        };

        fetchData();
    }, [range]);

    const [sortKey, setSortKey] = useState<'buyVolume' | 'sellVolume' | 'totalVolume' | 'timestamp' | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const sortedData = [...data].sort((a, b) => {
        if (!sortKey) return 0;
        const aVal = sortKey === 'timestamp' ? Number(a[sortKey]) : parseFloat(a[sortKey] as any);
        const bVal = sortKey === 'timestamp' ? Number(b[sortKey]) : parseFloat(b[sortKey] as any);

        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">New Pool Rankings</h1>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-royalPurple text-white"
                        value={sortKey ?? ''}
                        onChange={(e) => {
                            const selected = e.target.value as PoolSortKey | '';
                            setSortKey(selected || null);
                        }}
                    >
                        <option value="">Sort by...</option>
                        <option value="buyVolume">Buy Volume</option>
                        <option value="sellVolume">Sell Volume</option>
                        <option value="totalVolume">Total Volume</option>
                        <option value="timestamp">Created</option>
                    </select>

                    <button
                        onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                        className="border px-2 py-1 text-sm rounded bg-royalPurple text-white"
                    >
                        {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                    </button>

                    <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-royalPurple text-white"
                        value={range}
                        onChange={(e) => setRange(e.target.value as '24h' | '7d' | 'all')}
                    >
                        <option value="24h">24h</option>
                        <option value="7d">7d</option>
                        <option value="all">Lifetime</option>
                    </select>
                </div>
            </div>


            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-teal-900 text-white">
                        <tr>
                            {[
                                'Pool', 'Buy TXs', 'Buy Volume', 'Sell TXs', 'Sell Volume', 'Total Volume',
                                'LP Fee', 'Burn Fee', 'Creator Fee', 'Rewards Fee', 'Royalty Wallet', 'Created'
                            ].map((label) => (
                                <th key={label} className="border p-2 text-center">
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-teal-900">
                        {sortedData.map((pool) => ( 
                            <tr key={pool.pool_id} className="bg-white hover:bg-gray-50">
                                <td className="border p-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {pool.coinA_image && <img src={pool.coinA_image} className="w-5 h-5 rounded-full" />}
                                        {pool.coinB_image && <img src={pool.coinB_image} className="w-5 h-5 rounded-full" />}
                                        <span>{pool.coinA_symbol} / {pool.coinB_symbol}</span>
                                    </div>
                                </td>
                                <td className="border p-2 text-center">{pool.buyTxCount}</td>
                                <td className="border p-2 text-center">
                                    <div className="flex items-center justify-end gap-1">
                                        <span>{pool.buyVolume}</span>
                                        {pool.coinA_image && <img src={pool.coinA_image} className="w-4 h-4 rounded-full" alt="coinA" />}
                                    </div>
                                </td>
                                <td className="border p-2 text-center">{pool.sellTxCount}</td>
                                <td className="border p-2 text-center">
                                    <div className="flex items-center justify-end gap-1">
                                        <span>{pool.sellVolume}</span>
                                        {pool.coinA_image && <img src={pool.coinA_image} className="w-4 h-4 rounded-full" alt="coinA" />}
                                    </div>
                                </td>
                                <td className="border p-2 text-center">
                                    <div className="flex items-center justify-end gap-1">
                                        <span>{pool.totalVolume}</span>
                                        {pool.coinA_image && <img src={pool.coinA_image} className="w-4 h-4 rounded-full" alt="coinA" />}
                                    </div>
                                </td>
                                <td className="border p-2 text-center">{formatBpsToPercent(pool.lp_builder_fee)}</td>
                                <td className="border p-2 text-center">{formatBpsToPercent(pool.burn_fee)}</td>
                                <td className="border p-2 text-center">{formatBpsToPercent(pool.creator_royalty_fee)}</td>
                                <td className="border p-2 text-center">{formatBpsToPercent(pool.rewards_fee)}</td>
                                <td className="border p-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{pool.creator_royalty_wallet.slice(0, 6)}...{pool.creator_royalty_wallet.slice(-4)}</span>
                                        <button
                                            onClick={() => handleCopy(pool.creator_royalty_wallet)}
                                            className="bg-white p-1 rounded hover:bg-softMint"
                                            title="Copy Wallet"
                                        >
                                            <CopyIcon className="w-2 h-2 hover:opacity-70" />
                                        </button>
                                        {copiedText === pool.creator_royalty_wallet && (
                                            <span className="text-xs text-green-500 ml-1">Copied!</span>
                                        )}
                                    </div>
                                </td>
                                <td className="border p-2 text-center">
                                    {timeAgoFromTimestamp(pool.timestamp)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}