import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  showText = true,
  size = "md",
  href = "/dashboard",
}) => {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const content = (
    <div className={cn("flex items-center gap-2.5 font-bold tracking-tight select-none", className)}>
      <div
        className={cn(
          "bg-[#2E7D32] rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0",
          iconSizes[size]
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-bold", textSizes[size])}>
          <span className="text-[#111827]">Eco</span>
          <span className="text-[#2E7D32]">Track</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
};
