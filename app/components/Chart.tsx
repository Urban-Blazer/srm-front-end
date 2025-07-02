"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type CandlestickSeriesPartialOptions,
  CrosshairMode,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import useChartData from "../hooks/useChartData";
import useCoinPrice from "../hooks/useCoinPrice";
import { ChartProps, IntervalType } from "../types";
import useSRMPrice from "../hooks/useSRMPrice";

export default function Chart({
  poolId,
  coinASymbol,
  coinA,
  coinB,
  children,
}: ChartProps) {
  const websocketUrl = "wss://api.suirewards.me";
  const wsRef = useRef<WebSocket | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const latestCandles = useRef<CandlestickData[]>([]);
  const intervals = ["1m", "5m", "15m", "1h", "4h", "24h"];
  const [interval, setInterval] = useState<IntervalType>("1h");
  const isSRMCoinA = coinASymbol === "SRM";
  const [isUSDCandle, setIsUSDCandle] = useState(true);
  const {
    data: chartData,
    refetch: refetchChartData,
    isPending: isChartDataPending,
  } = useChartData(poolId, interval, 15000);
  const { data: coinAPriceUSD, isPending: isCoinPricePending } = useCoinPrice(
    coinASymbol === "SUI" ? coinASymbol : "USDC"
  );
  let ws: WebSocket | null = null;
  const {
    price: srmPriceInSui,
    srmAmount,
    isLoading,
    isPending,
  } = useSRMPrice(1, 30000, isSRMCoinA); // Refetch every 30 seconds
  const isAnyLoading = isChartDataPending || isCoinPricePending || (isSRMCoinA && (isLoading || isPending));
  useEffect(() => {
    if (!chartContainerRef.current || !chartData || !coinAPriceUSD) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#f8fafc",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        vertLine: { color: "#64748b", width: 1, style: 0 },
        horzLine: { color: "#64748b", width: 1, style: 0 },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: true,
      },
      rightPriceScale: {
        borderColor: "#334155",
        visible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#4ade80",
      downColor: "#f87171",
      borderVisible: false,
      wickUpColor: "#4ade80",
      wickDownColor: "#f87171",
      lastValueVisible: true,
    } satisfies CandlestickSeriesPartialOptions);

    const processCandles = (candles: CandlestickData[]) => {
      // Check each candle for gaps between the close of the previous candle and the open of the current candle
      // Fix gaps while preserving wicks (high/low values)
      const processedCandles = candles.map((candle, index) => {
        if (index === 0) return candle;

        const prevCandle = candles[index - 1];

        // Case 1: Gap up (current open > previous close)
        if (candle.open > prevCandle.close) {
          // Preserve the original range between open and low
          const originalOpenLowRange = candle.open - candle.low;
          // Preserve the original range between high and open
          const originalHighOpenRange = candle.high - candle.open;

          const newOpen = prevCandle.close;
          // Adjust low to maintain the same range from the new open
          const newLow = Math.min(candle.low, newOpen - originalOpenLowRange);
          // Adjust high to maintain the same range from the new open
          const newHigh = Math.max(
            candle.high,
            newOpen + originalHighOpenRange
          );

          return {
            ...candle,
            open: newOpen,
            low: newLow,
            high: newHigh,
          };
        }

        // Case 2: Gap down (current open < previous close)
        if (candle.open < prevCandle.close) {
          // Preserve the original range between open and low
          const originalOpenLowRange = candle.open - candle.low;
          // Preserve the original range between high and open
          const originalHighOpenRange = candle.high - candle.open;

          const newOpen = prevCandle.close;
          // Adjust low to maintain the same range from the new open
          const newLow = Math.min(candle.low, newOpen - originalOpenLowRange);
          // Adjust high to maintain the same range from the new open
          const newHigh = Math.max(
            candle.high,
            newOpen + originalHighOpenRange
          );

          return {
            ...candle,
            open: newOpen,
            low: newLow,
            high: newHigh,
          };
        }

        return candle;
      });

      return processedCandles;
    };

    const setChartData = async () => {
      const rawData = chartData;
      const coinBDecimals = coinB?.decimals ?? 9;
      let candles: CandlestickData[] = [];
      const isSRMCoinA = coinASymbol === "SRM";
      const srmPriceInUsdc =
        srmPriceInSui && isSRMCoinA ? srmPriceInSui * coinAPriceUSD : 1;
      const usdPrice = isSRMCoinA ? srmPriceInUsdc : coinAPriceUSD;
      let price = isUSDCandle ? usdPrice : 1;
      console.log({
        coinASymbol,
        price,
        coinBDecimals,
        srmPriceInSui,
        srmAmount,
      });
      if (coinBDecimals === 9) {
        candles = rawData.map((candle) => ({
          time: candle.time,
          open: candle.open * price,
          high: candle.high * price,
          low: candle.low * price,
          close: candle.close * price,
        }));
      } else {
        candles = rawData.map((candle) => ({
          time: candle.time,
          open:
            (candle.open / Math.pow(10, 9)) *
            Math.pow(10, coinBDecimals) *
            price,
          high:
            (candle.high / Math.pow(10, 9)) *
            Math.pow(10, coinBDecimals) *
            price,
          low:
            (candle.low / Math.pow(10, 9)) *
            Math.pow(10, coinBDecimals) *
            price,
          close:
            (candle.close / Math.pow(10, 9)) *
            Math.pow(10, coinBDecimals) *
            price,
        }));
      }

      candles = processCandles(candles);
      latestCandles.current = candles; // ✍️ Save in ref
      series.setData(candles);

      chart.timeScale().fitContent();

      series.applyOptions({
        priceFormat: {
          type: "custom",
          minMove: 0.000001,
          formatter: (price: number) => {
            if (price >= 1) return `$${price.toFixed(2)}`;
            if (price >= 0.01) return `$${price.toFixed(4)}`;
            return `$${price.toFixed(8)}`;
          },
        },
      });
    };

    // WebSocket reconexión
    const connectWebSocket = () => {
      if (!poolId) return;

      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.warn("✅ Connected to WebSocket for Chart");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket Event:", data);

          if (data.type === "swap" && data.poolId === poolId) {
            console.log("📈 Live swap detected — refreshing full chart...");
            refetchChartData();
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("❌ WebSocket error:", err);
      };

      ws.onclose = () => {
        console.warn("🔌 WebSocket closed (Chart), reconnecting...");
        setTimeout(connectWebSocket, 5000); // Intenta reconectar después de 5 segundos
      };
    };

    setChartData();

    setTimeout(connectWebSocket, 300);

    const resizeObserver = new ResizeObserver(() => {
      chartContainerRef.current &&
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: 500,
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
  }, [poolId, interval, coinASymbol, coinAPriceUSD, chartData, refetchChartData, coinA?.decimals, coinB?.decimals, isUSDCandle, srmPriceInSui, srmAmount]);

  return (
    <div className="w-full min-h-[500px]">
      <div className="flex flex-col lg:flex-row justify-between gap-2 mb-2 overflow-hidden">
        {children}
        {/* sui/usd price selector */}
        <select
          value={isUSDCandle ? "true" : "false"}
          onChange={(e) => setIsUSDCandle(e.target.value === "true")}
          className="bg-[#130e18] text-slate-100 border border-[#221d14] px-2 py-1 text-sm"
        >
          <option value="false">{coinASymbol}</option>
          <option value="true">USD</option>
        </select>
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value as IntervalType)}
          className="bg-[#130e18] text-slate-100 border border-[#221d14] px-2 py-1 text-sm"
        >
          {intervals.map((int) => (
            <option key={int} value={int}>
              {int}
            </option>
          ))}
        </select>
      </div>

      {isAnyLoading && (
        <div className="w-full h-[500px] animate-pulse flex bg-gray-900 border border-gray-800 shadow-md p-4" />
      )}

      <div
        ref={chartContainerRef}
        className={`w-full h-full ${isAnyLoading ? "hidden" : ""}`}
      />
    </div>
  );
}
