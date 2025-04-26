'use client';

import { useEffect, useRef, useState } from 'react';
import {
    createChart,
    ColorType,
    type CandlestickData,
    type Time,
    type CandlestickSeriesPartialOptions,
    CandlestickSeries,
} from 'lightweight-charts';

type Candle = {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
};

interface ChartProps {
    poolId: string;
    coinASymbol: string; // "SUI" | "USDC"
}

export default function Chart({ poolId, coinASymbol }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const latestCandles = useRef<CandlestickData[]>([]);
    const intervals = ['1m', '5m', '15m', '1h', '4h', '24h'];
    const [interval, setInterval] = useState<string>('15m');
    let ws: WebSocket | null = null;

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0f172a' },
                textColor: '#f8fafc',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            crosshair: {
                vertLine: { color: '#64748b', width: 1, style: 0 },
                horzLine: { color: '#64748b', width: 1, style: 0 },
            },
            timeScale: {
                borderColor: '#334155',
                timeVisible: true,
                secondsVisible: true,
            },
            rightPriceScale: {
                borderColor: '#334155',
                visible: true,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#4ade80',
            downColor: '#f87171',
            borderVisible: false,
            wickUpColor: '#4ade80',
            wickDownColor: '#f87171',
        } satisfies CandlestickSeriesPartialOptions);

        const fetchChartData = async () => {
            const res = await fetch(`/api/chart-data?poolId=${poolId}&interval=${interval}`);
            const rawData: Candle[] = await res.json();

            let coinAPriceUSD = 1;
            if (coinASymbol === 'SUI') {
                try {
                    const priceRes = await fetch('/api/get-coina-price?symbol=SUIUSD');
                    const { price } = await priceRes.json();
                    coinAPriceUSD = price ?? 1;
                } catch (e) {
                    console.error('Failed to fetch Coin A price:', e);
                }
            } else if (coinASymbol === 'USDC') {
                coinAPriceUSD = 1;
            }

            const usdCandles: CandlestickData[] = rawData.map(candle => ({
                time: candle.time,
                open: candle.open * coinAPriceUSD,
                high: candle.high * coinAPriceUSD,
                low: candle.low * coinAPriceUSD,
                close: candle.close * coinAPriceUSD,
            }));

            latestCandles.current = usdCandles; // ✍️ Save in ref
            series.setData(usdCandles);

            chart.timeScale().fitContent();

            series.applyOptions({
                priceFormat: {
                    type: 'custom',
                    minMove: 0.000001,
                    formatter: (price: number) => {
                        if (price >= 1) return `$${price.toFixed(2)}`;
                        if (price >= 0.01) return `$${price.toFixed(4)}`;
                        return `$${price.toFixed(9)}`;
                    },
                },
            });
        };

        fetchChartData();

        setTimeout(() => {
            ws = new WebSocket('ws://159.203.34.221:3000'); // ✅ Assign to outer ws

            ws.onopen = () => {
                console.log('🔌 WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket Event:', data);

                    if (data.type === 'swap' && data.poolId === poolId) {
                        console.log('📈 Live swap detected — refreshing full chart...');
                        fetchChartData();
                    }
                } catch (err) {
                    console.error('WebSocket message error:', err);
                }
            };

            ws.onclose = () => {
                console.log('❌ WebSocket disconnected');
            };
        }, 300);

        const resizeObserver = new ResizeObserver(() => {
            chart.applyOptions({
                width: chartContainerRef.current!.clientWidth,
                height: chartContainerRef.current!.clientHeight,
            });
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            if (ws) ws.close();
        };
    }, [poolId, interval, coinASymbol]);

    return (
        <div className="w-full">
            <div className="flex justify-end mb-2">
                <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="bg-slate-800 text-slate-100 border border-slate-600 rounded px-2 py-1 text-sm"
                >
                    {intervals.map((int) => (
                        <option key={int} value={int}>
                            {int}
                        </option>
                    ))}
                </select>
            </div>

            <div
                ref={chartContainerRef}
                className="w-full h-[400px]"
            />
        </div>
    );
}