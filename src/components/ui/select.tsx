import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Check, ChevronDown } from "lucide-react";

export interface SelectProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onChange, children, className, disabled }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Extract options from children nodes dynamically
    const options = React.useMemo(() => {
      return React.Children.toArray(children)
        .map((child) => {
          if (React.isValidElement(child) && child.type === "option") {
            const el = child as React.ReactElement<{ value: any; children: React.ReactNode }>;
            return {
              value: String(el.props.value),
              label: String(el.props.children),
            };
          }
          return null;
        })
        .filter(Boolean) as { value: string; label: string }[];
    }, [children]);

    const selectedOption = options.find((opt) => opt.value === value) || options[0];

    // Handle clicking outside to close
    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
      if (disabled) return;
      onChange({ target: { value: val } } as any);
      setIsOpen(false);
    };

    return (
      <div ref={containerRef} className="relative w-full focus-within:z-30">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border border-[#d4d4d8] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#09090b] shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(6,78,59,0.15)] focus:border-[#064e3b] transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-left",
            className
          )}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : "Select option..."}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-zinc-500 transition-transform duration-150 shrink-0",
              isOpen && "transform rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-1.5 shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[#a1a1aa]">No options available</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-[#52525b] hover:bg-[#F4F4F5] hover:text-[#09090b] transition-colors text-left font-medium cursor-pointer",
                      isSelected && "bg-[#ecfdf5] text-[#064e3b] hover:bg-[#ecfdf5]"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#064e3b] shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
