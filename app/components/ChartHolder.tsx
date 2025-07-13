'use client';

import {
    CandlestickSeries,
    ColorType,
    createChart,
    type CandlestickData,
    type CandlestickSeriesPartialOptions
} from 'lightweight-charts';
import { useCallback, useEffect, useRef, useState } from 'react';
import useChartData from '../hooks/useChartData';
import { IntervalType } from '../types';
import useCoinPrice from '../hooks/useCoinPrice';
import { Spinner } from './Spinner';


interface ChartProps {
    poolId?: string;
    coinASymbol?: string; // "SUI" | "USDC"
}

export default function ChartHolder({ poolId, coinASymbol }: ChartProps) {
    const websocketUrl = "wss://api.suirewards.me";
    const wsRef = useRef<WebSocket | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const latestCandles = useRef<CandlestickData[]>([]);
    const intervals = ['1m', '5m', '15m', '1h', '4h', '24h'];
    const [interval, setInterval] = useState<IntervalType>('1h');
    const { data: chartData, refetch: refetchChartData, isPending: isChartDataPending } = useChartData(poolId, interval);
    const { data: coinAPriceUSD, isPending: isCoinPricePending } = useCoinPrice(coinASymbol);
    const isAnyLoading = isChartDataPending || isCoinPricePending;
    let ws: WebSocket | null = null;

    // WebSocket reconexión
    const connectWebSocket = useCallback(() => {
        if (!poolId) return;

        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.warn('✅ Connected to WebSocket for Chart');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 WebSocket Event:', data);

                if (data.type === 'swap' && data.poolId === poolId) {
                    console.log('📈 Live swap detected — refreshing full chart...');                    refetchChartData();
                }
            } catch (err) {
                console.error('WebSocket message error:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('❌ WebSocket error:', err);
        };

        ws.onclose = () => {
            console.warn('🔌 WebSocket closed (Chart), reconnecting...');
            setTimeout(connectWebSocket, 5000); // Intenta reconectar después de 5 segundos
        };
    }, [poolId, refetchChartData, websocketUrl]);

    useEffect(() => {
        if (!chartContainerRef.current || !chartData || !coinAPriceUSD) return;

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

        const setChartData = async () => {
            const rawData = chartData;

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
                        return `$${price.toFixed(8)}`;
                    },
                },
            });
        };

        setChartData();

        setTimeout(connectWebSocket, 300);

        const resizeObserver = new ResizeObserver(() => {
            chartContainerRef.current && chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            });
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [poolId, interval, coinASymbol, coinAPriceUSD, chartData, connectWebSocket]);

    return (
        <div className="w-full min-h-[480px]">
            <div className="flex justify-end mb-2">
                <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as IntervalType)}
                    className="bg-slate-800 text-slate-100 border border-slate-600 px-2 py-1 text-sm"
                >
                    {intervals.map((int) => (
                        <option key={int} value={int}>
                            {int}
                        </option>
                    ))}
                </select>
            </div>

            {isAnyLoading && (
                <div className='w-full h-[400px] animate-pulse flex bg-gray-900 border border-gray-800 shadow-md p-4'>
                    {/* <h2 className="text-white text-lg font-semibold">Chart</h2>
                    <Spinner /> */}
                </div>
            )}

            <div
                ref={chartContainerRef}
                className="w-full h-[400px]"
            />
        </div>
    );
}