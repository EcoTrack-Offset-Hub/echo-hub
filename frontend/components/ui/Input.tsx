import React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#374151] select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!errorMessage}
            aria-describedby={errorMessage ? errorId : helperText ? helperId : undefined}
            className={cn(
              "w-full rounded-lg border border-[#E2E8E3] bg-white px-3.5 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] shadow-xs transition-colors outline-hidden focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32]",
              leftIcon ? "pl-10" : "",
              rightIcon ? "pr-10" : "",
              errorMessage
                ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]"
                : "",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-[#9CA3AF]">
              {rightIcon}
            </div>
          )}
        </div>
        {errorMessage ? (
          <p id={errorId} role="alert" className="text-xs text-[#DC2626] font-medium">
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-[#6B7280]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
