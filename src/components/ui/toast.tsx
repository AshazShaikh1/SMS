import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { CheckCircle2, AlertTriangle, AlertCircle, X, Info } from "lucide-react";

export interface ToastProps {
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = "success",
  onClose,
  duration = 3000,
}: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 flex items-center gap-3.5 rounded-xl border p-4 shadow-lg animate-in slide-in-from-bottom-5 fade-in duration-200 min-w-[280px] max-w-sm",
        type === "success" && "bg-[#E6F4EA] border-[#10B981]/25 text-[#09090b]",
        type === "warning" && "bg-[#FEF3C7] border-[#F59E0B]/25 text-[#09090b]",
        type === "error" && "bg-[#FEE2E2] border-[#EF4444]/25 text-[#09090b]",
        type === "info" && "bg-[#f0fdfa] border-[#0d9488]/25 text-[#09090b]"
      )}
    >
      <div className="shrink-0">
        {type === "success" && <CheckCircle2 className="w-5 h-5 text-[#10B981]" />}
        {type === "warning" && <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />}
        {type === "error" && <AlertCircle className="w-5 h-5 text-[#EF4444]" />}
        {type === "info" && <Info className="w-5 h-5 text-[#0d9488]" />}
      </div>
      <div className="flex-1 text-xs font-semibold leading-normal">{message}</div>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 rounded-lg hover:bg-black/5 text-zinc-500 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
