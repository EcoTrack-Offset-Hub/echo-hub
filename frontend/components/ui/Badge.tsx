import React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "gold"
    | "neutral"
    | "scope1"
    | "scope2"
    | "scope3";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  icon,
  className,
  ...props
}) => {
  const variantStyles = {
    success: "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]",
    warning: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]",
    danger: "bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]",
    info: "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]",
    gold: "bg-[#FEF9C3] text-[#A16207] border-[#FDE047]",
    neutral: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
    scope1: "bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]",
    scope2: "bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]",
    scope3: "bg-[#D1FAE5] text-[#059669] border-[#A7F3D0]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
};
