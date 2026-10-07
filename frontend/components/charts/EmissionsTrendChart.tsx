"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { BarChart3 } from "lucide-react";

export interface TrendDataPoint {
  period: string;
  month: string;
  shortMonth?: string;
  emissions: number;
}

interface EmissionsTrendChartProps {
  className?: string;
  data?: TrendDataPoint[];
  range: "3M" | "6M" | "12M";
  onRangeChange: (range: "3M" | "6M" | "12M") => void;
  hasEnoughData?: boolean;
  emptyMessage?: string;
}

export const EmissionsTrendChart: React.FC<EmissionsTrendChartProps> = ({
  className,
  data = [],
  range,
  onRangeChange,
  hasEnoughData = true,
  emptyMessage = "Add activity data for another reporting period to view an emissions trend.",
}) => {
  // Check if we actually have enough data to draw a trend line
  const validPoints = data.filter((d) => Number.isFinite(d.emissions));
  const distinctNonZero = validPoints.filter((d) => d.emissions > 0).length;
  const showEmpty = !hasEnoughData || validPoints.length < 2 || (validPoints.length > 0 && distinctNonZero < 1);

  // SVG dimensions
  const width = 640;
  const height = 230;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };

  const values = validPoints.map((p) => p.emissions);
  const maxDataVal = values.length > 0 ? Math.max(...values, 0) : 1;
  // Nice round max ceiling for Y-axis (at least 2.0 as in reference design)
  const maxCeiling = maxDataVal <= 0.5 ? 1.0 : maxDataVal <= 1.0 ? 1.5 : maxDataVal <= 2.0 ? 2.0 : Math.ceil(maxDataVal * 1.2 * 10) / 10;
  const minVal = 0;
  const yRange = maxCeiling - minVal || 1;

  const getX = (index: number) => {
    const usableWidth = width - padding.left - padding.right;
    return validPoints.length <= 1
      ? padding.left + usableWidth / 2
      : padding.left + (index / (validPoints.length - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    const usableHeight = height - padding.top - padding.bottom;
    const normalized = (val - minVal) / yRange;
    return height - padding.bottom - normalized * usableHeight;
  };

  // Build points & area path
  const points = validPoints.map((d, i) => `${getX(i)},${getY(d.emissions)}`).join(" ");
  const areaPath =
    validPoints.length > 1
      ? `${points} L ${getX(validPoints.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`
      : "";

  // 4 Y-ticks from 0 to maxCeiling
  const yTicks = [
    maxCeiling,
    Number((maxCeiling * 0.75).toFixed(2)),
    Number((maxCeiling * 0.5).toFixed(2)),
    Number((maxCeiling * 0.25).toFixed(2)),
    0,
  ];

  return (
    <div
      className={cn(
        "bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between",
        className
      )}
    >
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
              type="button"
              onClick={() => onRangeChange(p)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                range === p
                  ? "bg-[#2E7D32] text-white shadow-xs font-bold"
                  : "text-[#6B7280] hover:text-[#111827]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart or Empty State */}
      {showEmpty ? (
        <div className="h-56 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <div className="w-10 h-10 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#9CA3AF]" />
          </div>
          <p className="text-sm font-semibold text-[#111827]">Not enough historical data</p>
          <p className="text-xs text-[#6B7280] max-w-xs">{emptyMessage}</p>
        </div>
      ) : (
        <div className="w-full pt-4 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines and Y-axis tick values */}
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
                    {tick % 1 === 0 ? tick.toFixed(0) : tick.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaPath && <polygon points={areaPath} fill="url(#trendAreaGradient)" />}

            {/* Line stroke */}
            {points && (
              <polyline
                fill="none"
                stroke="#2E7D32"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            )}

            {/* Data Points */}
            {validPoints.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.emissions);
              const label = d.shortMonth || d.month.split(" ")[0];
              const year = d.month.split(" ")[1] || "";

              return (
                <g key={d.period} className="group cursor-pointer">
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
                  <title>{`${d.month}: ${d.emissions.toFixed(3)} tCO₂e`}</title>

                  {/* X Axis Label */}
                  <text
                    x={cx}
                    y={height - padding.bottom + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6B7280"
                    fontWeight="500"
                  >
                    {label} {year}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};
