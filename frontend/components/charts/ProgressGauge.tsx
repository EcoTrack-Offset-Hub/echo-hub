"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface ProgressGaugeProps {
  percentage: number;
  targetText?: string;
  progressText?: string;
  className?: string;
}

export const ProgressGauge: React.FC<ProgressGaugeProps> = ({
  percentage = 62,
  targetText = "Target: 20% reduction by 2030",
  progressText = "Current progress: 8.4% reduction",
  className,
}) => {
  const size = 130;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("bg-white p-5 rounded-2xl border border-[#E2E8E3] shadow-xs flex flex-col justify-between", className)}>
      <div className="pb-2 border-b border-[#F3F4F6]">
        <h3 className="text-sm font-bold text-[#111827]">Reduction Progress</h3>
      </div>

      <div className="flex items-center justify-center py-3">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />
            {/* Value ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#2E7D32"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xl font-extrabold text-[#111827]">{percentage}%</span>
            <span className="text-[10px] text-[#6B7280]">of target</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[#F3F4F6] text-center space-y-1">
        <p className="text-xs font-semibold text-[#111827]">{targetText}</p>
        <p className="text-[11px] text-[#2E7D32] font-medium">{progressText}</p>
      </div>
    </div>
  );
};
