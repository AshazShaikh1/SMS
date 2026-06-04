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
        variant === "primary" && "bg-emerald-50 text-emerald-900 border-emerald-200/50",
        variant === "secondary" && "bg-zinc-100 text-zinc-900 border-zinc-200",
        variant === "success" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        variant === "warning" && "bg-amber-500/10 text-amber-700 border-amber-500/20",
        variant === "danger" && "bg-red-500/10 text-red-700 border-red-500/20",
        variant === "neutral" && "bg-zinc-50 text-zinc-600 border-zinc-200",
        className
      )}
      {...props}
    />
  );
}
