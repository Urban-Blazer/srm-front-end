import { useEffect, useState, useRef } from 'react';

interface Coin {
    typeName: string;
    decimals: number;
    image?: string;
    name?: string;
    symbol?: string;
}

interface RecentSwap {
    wallet: string;
    tokenin: any;
    amountin: number;
    tokenout: any;
    amountout: number;
    is_buy: boolean;
    reserve_a: number;
    reserve_b: number;
    timestamp: string;
}

interface RecentTransactionsProps {
    poolId: string;
    websocketUrl: string;
    coinA: Coin;
    coinB: Coin;
}

export default function RecentTransactions({ poolId, websocketUrl, coinA, coinB }: RecentTransactionsProps) {
    const [recentSwaps, setRecentSwaps] = useState<RecentSwap[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const [coinAPriceUSD, setCoinAPriceUSD] = useState<number>(1);
    const [currentTime, setCurrentTime] = useState<number>(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000); // every 1 second

        return () => clearInterval(interval); // cleanup on unmount
    }, []);

    useEffect(() => {
        if (!poolId) return;

        // 1. Fetch initial recent swaps
        const fetchRecentSwaps = async () => {
            try {
                const res = await fetch(`/api/recent-transactions?poolId=${poolId}`);
                const data: RecentSwap[] = await res.json();
                setRecentSwaps(data.slice(0, 20));
            } catch (err) {
                console.error('❌ Failed to fetch recent swaps:', err);
            }
        };

        fetchRecentSwaps(); // 🛠️ Call immediately

        // 2. Setup WebSocket for live updates
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('✅ Connected to WebSocket for RecentTransactions');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'recentSwap' && data.poolId === poolId) {
                    setRecentSwaps((prev) => {
                        const combined = [...data.swaps, ...prev];
                        const unique = Array.from(new Map(combined.map(item => [item.timestamp, item])).values());
                        return unique.slice(0, 20);
                    });
                }
            } catch (err) {
                console.error('❌ Error parsing WebSocket message:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('❌ WebSocket error:', err);
        };

        ws.onclose = () => {
            console.warn('🔌 WebSocket closed (RecentTransactions)');
        };

        return () => {
            ws.close();
        };
    }, [poolId, websocketUrl]);

    useEffect(() => {
        const fetchCoinAPrice = async () => {
            if (!coinA?.symbol) return;

            if (coinA.symbol.toUpperCase() === 'USDC') {
                setCoinAPriceUSD(1); // USDC is pegged
            } else if (coinA.symbol.toUpperCase() === 'SUI') {
                try {
                    const res = await fetch(`/api/get-coina-price?symbol=SUIUSD`);
                    const { price } = await res.json();
                    if (price) {
                        setCoinAPriceUSD(price);
                    }
                } catch (err) {
                    console.error('❌ Failed to fetch Coin A price:', err);
                    setCoinAPriceUSD(1); // fallback
                }
            } else {
                // Default fallback for unknown coins
                setCoinAPriceUSD(1);
            }
        };

        fetchCoinAPrice();
    }, [coinA.symbol]);

    const formatAgo = (timestamp: string) => {
        const now = currentTime;
        const diffSeconds = Math.floor((now - Number(timestamp)) / 1000);

        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
        return `${Math.floor(diffSeconds / 86400)}d ago`;
    };

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    function calculateUsdPriceFromReserves(
        reserveA: number,
        reserveB: number,
        coinAPriceUSD: number
    ): number {
        if (reserveB === 0) return 0;
        return (reserveA / reserveB) * coinAPriceUSD;
    }

    return (
        <div className="bg-slate-800 rounded-lg p-4 w-full mt-8">

            <h2 className="text-slate-100 font-semibold text-lg mb-4">Recent Transactions</h2>

            <div className="overflow-x-auto overflow-y-auto max-h-80 min-w-full">
                {recentSwaps.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center">No recent transactions yet.</p>
                ) : (
                    <table className="w-full text-slate-300 text-sm">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase">
                                    <th className="py-3 px-4 text-center">Time</th>
                                    <th className="py-3 px-4 text-center">Side</th>
                                    <th className="py-3 px-4 text-center">Price</th>
                                    <th className="py-3 px-4 text-center">Total Value</th>
                                    <th className="py-3 px-4 text-center">Amount ({coinA.symbol || 'CoinA'})</th>
                                    <th className="py-3 px-4 text-center">Amount ({coinB.symbol || 'CoinB'})</th>
                                    <th className="py-3 px-4 text-center">Maker</th>
                                </tr>
                            </thead>
                        <tbody>
                                {recentSwaps.map((swap, idx) => {
                                    const reserveA = Number(swap.reserve_a);
                                    const reserveB = Number(swap.reserve_b);

                                    // Calculate the "onchain" price of CoinB in CoinA
                                    const livePriceCoinBUSD = calculateUsdPriceFromReserves(reserveA, reserveB, coinAPriceUSD);

                                    const coinADecimals = coinA.decimals ?? 9;
                                    const coinBDecimals = coinB.decimals ?? 9;

                                    const amountCoinA = swap.is_buy
                                        ? Number(swap.amountin) / Math.pow(10, coinADecimals)
                                        : Number(swap.amountout) / Math.pow(10, coinADecimals);

                                    const amountCoinB = swap.is_buy
                                        ? Number(swap.amountout) / Math.pow(10, coinBDecimals)
                                        : Number(swap.amountin) / Math.pow(10, coinBDecimals);

                                    const totalValueUSD = swap.is_buy
                                        ? amountCoinA * coinAPriceUSD
                                        : amountCoinB * livePriceCoinBUSD;

                                    return (
                                        <tr key={idx} className="border-t border-slate-700">
                                            <td className={`py-3 px-4 text-center ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>{formatAgo(swap.timestamp)}</td>
                                            <td className={`py-3 px-4 text-center ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>
                                                {swap.is_buy ? 'Buy' : 'Sell'}
                                            </td>
                                            <td className={`py-3 px-4 text-center ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>${livePriceCoinBUSD.toFixed(4)}</td>
                                            <td className={`py-3 px-4 text-center ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>${totalValueUSD.toFixed(2)}</td>
                                            <td className={`py-3 px-4 text-center ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>
                                                {amountCoinA.toFixed(4)}
                                            </td>
                                            <td className={`py-3 px-4 text-center ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>
                                                {amountCoinB.toFixed(4)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <a
                                                    href={`https://suiscan.xyz/mainnet/account/${swap.wallet}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 underline"
                                                >
                                                    {shortenAddress(swap.wallet)}
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// Helpers
const formatNumber = (n: number) => {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};

const formatTime = (timestamp: string) => {
    const d = new Date(Number(timestamp));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const extractSymbol = (token: any) => {
    return token?.symbol || '???';
};