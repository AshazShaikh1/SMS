import React from "react";

export interface SiblingChild {
  id: string;
  name: string;
  gradeSection: string;
}

interface ChildSelectorProps {
  childrenList: SiblingChild[];
  activeStudentId: string;
  onSelect: (id: string) => void;
}

export default function ChildSelector({
  childrenList,
  activeStudentId,
  onSelect,
}: ChildSelectorProps) {
  return (
    <div className="w-full border-b border-zinc-200/50 bg-white/40 backdrop-blur-xs sticky top-0 z-40 py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex overflow-x-auto gap-3 py-1 scrollbar-none max-w-full -webkit-overflow-scrolling-touch">
        {childrenList.map((child) => {
          const isActive = child.id === activeStudentId;
          return (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={`shrink-0 cursor-pointer text-xs font-semibold px-4 py-2 transition-all duration-200 outline-none select-none ${
                isActive
                  ? "bg-[#1572FE] text-white shadow-sm border border-[#1572FE]/80 rounded-full flex items-center gap-2"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 rounded-full px-4 py-2 transition-all"
              }`}
            >
              <span>{child.name} • {child.gradeSection}</span>
            </button>
          );
        })}
      </div>
      
      {/* Scrollbar-none custom styling override */}
      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
