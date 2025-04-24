'use client';

import { useEffect, useRef } from 'react';
import { createChart, Time } from 'lightweight-charts';

type DataPoint = {
    time: Time; // UNIX seconds
    value: number; // price or volume
};

export default function TradingChart({ poolId }: { poolId: string }) {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        const chart = createChart(chartRef.current, {
            width: chartRef.current.clientWidth,
            height: 300,
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#ffffff',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const lineSeries = chart.addLineSeries({
            color: '#00FFB2',
            lineWidth: 2,
        });

        fetch(`/api/chart-data?pool_id=${poolId}`)
            .then((res) => res.json())
            .then((data: DataPoint[]) => {
                lineSeries.setData(data);
            });

        const resizeObserver = new ResizeObserver(() => {
            chart.applyOptions({ width: chartRef.current!.clientWidth });
        });
        resizeObserver.observe(chartRef.current);

        return () => {
            chart.remove();
            resizeObserver.disconnect();
        };
    }, [poolId]);

    return (
        <div className="w-full rounded overflow-hidden border border-white/10 bg-black/20 backdrop-blur-md p-2 shadow-md">
            <div ref={chartRef} className="w-full h-[300px]" />
        </div>
    );
}