import React from "react";
import { cn } from "@/lib/utils/cn";

export interface FinancialHealthBarProps {
  collected: number;
  remaining: number;
  className?: string;
}

export function FinancialHealthBar({
  collected,
  remaining,
  className,
}: FinancialHealthBarProps) {
  const total = collected + remaining;
  const collectedPercent = total > 0 ? (collected / total) * 100 : 0;
  const remainingPercent = 100 - collectedPercent;

  return (
    <div className={cn("space-y-3 mt-4", className)}>
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
        <span className="text-[#1572FE]">
          Collected: ₹{collected.toLocaleString("en-IN")} ({collectedPercent.toFixed(0)}%)
        </span>
        <span className="text-[#F59E0B]">
          Remaining: ₹{remaining.toLocaleString("en-IN")} ({remainingPercent.toFixed(0)}%)
        </span>
      </div>
      
      {/* Visual split progress bar with gradients */}
      <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden flex">
        {collectedPercent > 0 && (
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-[#1572FE] transition-all duration-700 ease-out"
            style={{ width: `${collectedPercent}%` }}
          />
        )}
        {remainingPercent > 0 && (
          <div
            className="h-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] transition-all duration-700 ease-out"
            style={{ width: `${remainingPercent}%` }}
          />
        )}
      </div>
      
      <p className="text-[10px] text-zinc-405 font-medium leading-normal">
        School financial health (Base expected revenue vs outstanding dues).
      </p>
    </div>
  );
}
