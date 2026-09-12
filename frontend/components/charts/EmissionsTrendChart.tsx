"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface TrendDataPoint {
  month: string;
  emissions: number;
}

interface EmissionsTrendChartProps {
  className?: string;
}

export const EmissionsTrendChart: React.FC<EmissionsTrendChartProps> = ({ className }) => {
  const [period, setPeriod] = useState<"3M" | "6M" | "12M">("6M");

  const data6M: TrendDataPoint[] = [
    { month: "Jan", emissions: 3500 },
    { month: "Feb", emissions: 3300 },
    { month: "Mar", emissions: 2950 },
    { month: "Apr", emissions: 2600 },
    { month: "May", emissions: 2500 },
    { month: "Jun", emissions: 2300 },
  ];

  const data3M: TrendDataPoint[] = [
    { month: "Apr", emissions: 2600 },
    { month: "May", emissions: 2500 },
    { month: "Jun", emissions: 2300 },
  ];

  const data12M: TrendDataPoint[] = [
    { month: "Jul", emissions: 4100 },
    { month: "Aug", emissions: 3900 },
    { month: "Sep", emissions: 3800 },
    { month: "Oct", emissions: 3750 },
    { month: "Nov", emissions: 3600 },
    { month: "Dec", emissions: 3550 },
    { month: "Jan", emissions: 3500 },
    { month: "Feb", emissions: 3300 },
    { month: "Mar", emissions: 2950 },
    { month: "Apr", emissions: 2600 },
    { month: "May", emissions: 2500 },
    { month: "Jun", emissions: 2300 },
  ];

  const currentData = period === "3M" ? data3M : period === "12M" ? data12M : data6M;

  // SVG dimensions
  const width = 580;
  const height = 240;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };

  const minVal = 1500;
  const maxVal = 4000;
  const yRange = maxVal - minVal;

  const getX = (index: number) => {
    const usableWidth = width - padding.left - padding.right;
    return padding.left + (index / (currentData.length - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    const usableHeight = height - padding.top - padding.bottom;
    const normalized = (val - minVal) / yRange;
    return height - padding.bottom - normalized * usableHeight;
  };

  // Build SVG path
  const points = currentData.map((d, i) => `${getX(i)},${getY(d.emissions)}`).join(" ");
  const areaPath = `${points} L ${getX(currentData.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`;

  const yTicks = [4000, 3500, 3000, 2500, 2000, 1500];

  return (
    <div className={cn("bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Emissions Trend</h3>
          <p className="text-xs text-[#5F6B61]">Total carbon footprint (tCO₂e)</p>
        </div>

        {/* Time period filter pills */}
        <div className="flex items-center p-0.5 bg-[#F3F4F6] rounded-lg border border-[#E5E7EB] text-xs font-semibold">
          {(["3M", "6M", "12M"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                period === p
                  ? "bg-[#2E7D32] text-white shadow-xs font-bold"
                  : "text-[#6B7280] hover:text-[#111827]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Chart Area */}
      <div className="w-full pt-4 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#F3F4F6"
                  strokeWidth="1.2"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#9CA3AF"
                  fontWeight="500"
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <polygon points={areaPath} fill="url(#trendGradient)" />

          {/* Line stroke */}
          <polyline
            fill="none"
            stroke="#2E7D32"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points */}
          {currentData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.emissions);
            return (
              <g key={d.month} className="group cursor-pointer">
                <circle
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#2E7D32"
                  strokeWidth="2.5"
                  className="transition-transform group-hover:scale-125"
                />
                {/* Tooltip on hover */}
                <title>{`${d.month}: ${d.emissions} tCO₂e`}</title>

                {/* X Axis Label */}
                <text
                  x={cx}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6B7280"
                  fontWeight="500"
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
