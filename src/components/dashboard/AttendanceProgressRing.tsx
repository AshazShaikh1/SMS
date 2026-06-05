import React from "react";
import { cn } from "@/lib/utils/cn";

export interface AttendanceProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AttendanceProgressRing({
  percentage,
  size = 72,
  strokeWidth = 6,
  className,
}: AttendanceProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  
  // Unique gradient ID to prevent conflicts when rendering multiple rings
  const gradientId = `attendance-grad-${size}-${percentage}`;

  return (
    <div className={cn("relative flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" /> {/* Teal Emerald */}
            <stop offset="100%" stopColor="#064e3b" /> {/* Deep Emerald */}
          </linearGradient>
        </defs>
        {/* Background track circle */}
        <circle
          className="stroke-zinc-100"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Active progress circle with gradient */}
        <circle
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text badge */}
      <span className="absolute text-[11px] font-extrabold text-zinc-900 font-mono tracking-tight">
        {percentage}%
      </span>
    </div>
  );
}
