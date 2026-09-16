import React from "react";

interface WikiHeaderBarProps {
  children: React.ReactNode;
  className?: string;
}

export function WikiHeaderBar({ children, className = "" }: WikiHeaderBarProps) {
  return (
    <div
      className={`px-4 py-3 border-b border-zinc-800/80 bg-[#12151B]/95 sticky top-0 z-20 backdrop-blur-md shrink-0 ${className}`}
    >
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}
