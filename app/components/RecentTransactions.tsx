import { RecentSwap, RecentTransactionsProps } from '@/app/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePoolStats } from '../hooks/usePoolStats';
import useRecentSwaps from '../hooks/useRecentSwaps';
import { Spinner } from './Spinner';


export default function RecentTransactions({ poolId, websocketUrl, coinA, coinB }: RecentTransactionsProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const [coinAPriceUSD, setCoinAPriceUSD] = useState<number>(1);
    const [currentTime, setCurrentTime] = useState<number>(Date.now());
    const { data: recentSwaps, refetch: refetchRecentSwaps, isLoading: isRecentSwapsLoading } = useRecentSwaps(poolId, 60 * 1000);
    const { refetch: refetchPoolStats } = usePoolStats(poolId, 60 * 1000);

    const handleRecentSwapWS = useCallback((event: MessageEvent<any>) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'recentSwap' && data.poolId === poolId) {
                refetchPoolStats();
                refetchRecentSwaps();
                // refetchPairStats();
            }
        } catch (err) {
            console.error('❌ Error parsing WebSocket message:', err);
        }

    }, [poolId, refetchPoolStats, refetchRecentSwaps]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000); // every 1 second

        return () => clearInterval(interval); // cleanup on unmount
    }, []);

    // WebSocket reconexión
    const connectWebSocket = useCallback(() => {
        if (!poolId) return;

        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('✅ Connected to WebSocket for RecentTransactions');
        };

        ws.onmessage = handleRecentSwapWS;

        ws.onerror = (err) => {
            console.error('❌ WebSocket error:', err);
        };

        ws.onclose = () => {
            console.warn('🔌 WebSocket closed (RecentTransactions), reconnecting...');
            setTimeout(connectWebSocket, 5000); // Intenta reconectar después de 5 segundos
        };
    }, [handleRecentSwapWS, poolId, websocketUrl]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]);

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

    function calculateActualCPC(swap: RecentSwap, coinADecimals: number, coinBDecimals: number, coinAPriceUSD: number): number {
        const amountIn = Number(swap.amountin);
        const amountOut = Number(swap.amountout);

        if (swap.is_buy) {
            // Buying CoinB with CoinA → CPC = (amountIn / 10^A) * coinAPrice / (amountOut / 10^B)
            const inUSD = (amountIn / Math.pow(10, coinADecimals)) * coinAPriceUSD;
            const outAmount = amountOut / Math.pow(10, coinBDecimals);
            return outAmount > 0 ? inUSD / outAmount : 0;
        } else {
            // Selling CoinB for CoinA → CPC = (amountOut / 10^A) * coinAPrice / (amountIn / 10^B)
            const outUSD = (amountOut / Math.pow(10, coinADecimals)) * coinAPriceUSD;
            const inAmount = amountIn / Math.pow(10, coinBDecimals);
            return inAmount > 0 ? outUSD / inAmount : 0;
        }
    }


    return (
        <div className="w-full">
            <div className="overflow-x-auto overflow-y-auto max-h-96 min-w-full">
                {isRecentSwapsLoading ? (
                    <Spinner />
                ) : !recentSwaps || recentSwaps.length === 0 ? (
                    <p className="text-sm text-left">No recent transactions yet.</p>
                ) : (
                    <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs uppercase">
                                    <th className="py-1 px-4 text-left">Time</th>
                                    <th className="py-1 px-4 text-left">Side</th>
                                    <th className="py-1 px-4 text-left">Actual CPC (USD)</th>
                                    <th className="py-1 px-4 text-left">Total Value</th>
                                    <th className="py-1 px-4 text-left">Amount ({coinA.symbol || 'CoinA'})</th>
                                    <th className="py-1 px-4 text-left">Amount ({coinB.symbol || 'CoinB'})</th>
                                    <th className="py-1 px-4 text-left">Maker</th>
                                </tr>
                            </thead>
                        <tbody>
                                {recentSwaps.map((swap, idx) => {

                                    // Calculate the "onchain" price of CoinB in CoinA
                                    const coinADecimals = coinA.decimals ?? 9;
                                    const coinBDecimals = coinB.decimals ?? 9;
                                    const actualCPC = calculateActualCPC(swap, coinADecimals, coinBDecimals, coinAPriceUSD);

                                    const amountCoinA = swap.is_buy
                                        ? Number(swap.amountin) / Math.pow(10, coinADecimals)
                                        : Number(swap.amountout) / Math.pow(10, coinADecimals);

                                    const amountCoinB = swap.is_buy
                                        ? Number(swap.amountout) / Math.pow(10, coinBDecimals)
                                        : Number(swap.amountin) / Math.pow(10, coinBDecimals);

                                    const totalValueUSD = swap.is_buy
                                        ? amountCoinA * coinAPriceUSD
                                        : amountCoinB * actualCPC;

                                    return (
                                        <tr key={idx} className="">
                                            <td className={`py-1 px-4 text-left ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>{formatAgo(swap.timestamp)}</td>
                                            <td className={`py-1 px-4 text-left ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>
                                                {swap.is_buy ? 'Buy' : 'Sell'}
                                            </td>
                                            <td className={`py-1 px-4 text-left ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>${actualCPC.toFixed(7)}</td>
                                            <td className={`py-1 px-4 text-left ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>${totalValueUSD.toFixed(2)}</td>
                                            <td className={`py-1 px-4 text-left ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>
                                                {amountCoinA.toFixed(4)}
                                            </td>
                                            <td className={`py-1 px-4 text-left ${swap.is_buy ? 'text-green-400' : 'text-red-400'}`}>
                                                {amountCoinB.toFixed(4)}
                                            </td>
                                            <td className="py-1 px-4 text-left">
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