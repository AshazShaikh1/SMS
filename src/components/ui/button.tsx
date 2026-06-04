import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          // Variants
          variant === "primary" && "bg-emerald-950 text-emerald-50 hover:bg-emerald-900 border border-emerald-900 shadow-sm",
          variant === "secondary" && "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200",
          variant === "outline" && "bg-transparent text-zinc-700 hover:bg-zinc-100 border border-zinc-200",
          variant === "ghost" && "bg-transparent text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
          variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
          // Sizes
          size === "sm" && "text-xs px-3 py-1.5",
          size === "md" && "text-sm px-4 py-2",
          size === "lg" && "text-base px-6 py-3",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
