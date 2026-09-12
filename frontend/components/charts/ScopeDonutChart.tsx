"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface ScopeSegment {
  scope: string;
  percentage: number;
  amount: number | string;
  color: string;
}

interface ScopeDonutChartProps {
  total: string;
  unit?: string;
  title?: string;
  segments?: ScopeSegment[];
  className?: string;
}

export const ScopeDonutChart: React.FC<ScopeDonutChartProps> = ({
  total,
  unit = "tCO₂e",
  title = "Emissions by Scope",
  segments = [
    { scope: "Scope 1", percentage: 29.9, amount: "742 tCO₂e", color: "#16A34A" },
    { scope: "Scope 2", percentage: 39.6, amount: "986 tCO₂e", color: "#0284C7" },
    { scope: "Scope 3", percentage: 30.5, amount: "759 tCO₂e", color: "#10B981" },
  ],
  className,
}) => {
  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className={cn("bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between", className)}>
      <div className="pb-2 border-b border-[#F3F4F6]">
        <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            {segments.map((seg, idx) => {
              const dashLength = (seg.percentage / 100) * circumference;
              const dashOffset = (accumulatedPercent / 100) * circumference;
              accumulatedPercent += seg.percentage;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={-dashOffset}
                  className="transition-all duration-300 hover:opacity-90"
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-lg font-bold text-[#111827]">{total}</span>
            <span className="text-[10px] font-medium text-[#6B7280]">{unit}</span>
          </div>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5 pt-2 border-t border-[#F3F4F6] text-xs">
        {segments.map((s) => (
          <div key={s.scope} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[#4B5563] font-medium">{s.scope}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#6B7280]">{s.percentage}%</span>
              <span className="text-[#111827] font-semibold">{s.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
