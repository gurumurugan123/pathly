import React, { useState, useRef, useEffect } from 'react';
import { Info, ChevronUp, X } from 'lucide-react';
import { STATUS_CONFIG } from '../../config/statuses';

export const GraphLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const primaryStatuses = STATUS_CONFIG.slice(0, 7);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isExpanded) {
    return (
      <div className="absolute bottom-4 left-4 z-20">
        <button
          onClick={() => setIsExpanded(true)}
          onMouseEnter={() => setIsExpanded(true)}
          className="bg-white/90 dark:bg-navy-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200/80 dark:border-navy-700/80 flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-navy-800 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 group"
          title="Click or hover to expand Legend key"
        >
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>Legend</span>
          <div className="flex items-center gap-1 ml-1">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="w-2 h-2 rounded bg-navy-800" />
            <span className="w-2 h-2 rounded-full bg-teal-500" />
          </div>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-y-0.5 transition-transform ml-0.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setIsExpanded(false)}
      className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-navy-700/80 max-w-md text-xs animate-in fade-in zoom-in-95 duration-150 space-y-3"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-800 pb-2">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Legend</span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-xs" />
              <span className="text-slate-600 dark:text-slate-300 font-bold text-[11px]">YOU</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-navy-800 shadow-xs" />
              <span className="text-slate-600 dark:text-slate-300 font-bold text-[11px]">Company</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-800 border-2 border-teal-500 shadow-xs" />
              <span className="text-slate-600 dark:text-slate-300 font-bold text-[11px]">Person</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Collapse Legend"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {primaryStatuses.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px] truncate">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
