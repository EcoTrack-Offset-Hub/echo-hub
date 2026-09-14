import React from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, errorMessage, options, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#374151] select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "w-full appearance-none rounded-lg border border-[#E2E8E3] bg-white px-3.5 py-2 pr-10 text-sm text-[#111827] shadow-xs transition-colors outline-hidden focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32]",
              errorMessage ? "border-[#DC2626]" : "",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {errorMessage ? (
          <p className="text-xs text-[#DC2626] font-medium">{errorMessage}</p>
        ) : helperText ? (
          <p className="text-xs text-[#6B7280]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
