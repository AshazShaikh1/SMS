import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({ className, variant = "primary", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tracking-wide border transition-colors duration-150",
        variant === "primary" && "bg-[#ecfdf5] text-[#064e3b] border-[#ecfdf5]/50",
        variant === "secondary" && "bg-[#F4F4F5] text-[#52525b] border-[#E4E4E7]",
        variant === "success" && "bg-[#E6F4EA] text-[#10B981] border-[#10B981]/20",
        variant === "warning" && "bg-[#FEF3C7] text-[#F59E0B] border-[#F59E0B]/20",
        variant === "danger" && "bg-[#FEE2E2] text-[#EF4444] border-[#EF4444]/20",
        variant === "neutral" && "bg-[#FAF9F6] text-[#52525b] border-[#E4E4E7]",
        className
      )}
      {...props}
    />
  );
}
