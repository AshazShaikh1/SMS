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
          "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1572FE] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          // Centralized Classes mapped to design tokens
          variant === "primary" && "btn-primary",
          variant === "secondary" && "btn-secondary",
          variant === "outline" && "bg-transparent text-zinc-700 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-5 py-2.5",
          variant === "ghost" && "bg-transparent text-zinc-700 hover:bg-zinc-55 hover:text-zinc-900 rounded-xl px-4 py-2",
          variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl px-5 py-2.5",
          // Extra sizing defaults (override padding only if not primary/secondary)
          !(variant === "primary" || variant === "secondary" || variant === "outline" || variant === "danger") && [
            size === "sm" && "text-xs px-3 py-1.5",
            size === "md" && "text-sm px-4 py-2",
            size === "lg" && "text-base px-6 py-3",
          ],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
