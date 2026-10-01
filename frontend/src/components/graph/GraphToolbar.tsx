import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Eye, EyeOff, Filter, SlidersHorizontal, ChevronRight, X } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useUIStore } from '../../stores/uiStore';
import { STATUS_CONFIG } from '../../config/statuses';

export const GraphToolbar: React.FC<{ onResetLayout: () => void }> = ({ onResetLayout }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const statusFilter = useUIStore((state) => state.statusFilter);
  const setStatusFilter = useUIStore((state) => state.setStatusFilter);
  const showLabels = useUIStore((state) => state.showLabels);
  const toggleLabels = useUIStore((state) => state.toggleLabels);

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
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => setIsExpanded(true)}
          onMouseEnter={() => setIsExpanded(true)}
          className="bg-white/90 dark:bg-navy-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200/80 dark:border-navy-700/80 flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-navy-800 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 group"
          title="Click or hover to expand Graph Controls"
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:rotate-45 transition-transform" />
          <span>Graph Controls</span>
          {statusFilter !== 'ALL' && (
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setIsExpanded(false)}
      className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-navy-700/80 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Zoom Controls */}
      <button
        onClick={() => zoomIn()}
        className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition-colors cursor-pointer"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <button
        onClick={() => zoomOut()}
        className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition-colors cursor-pointer"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition-colors cursor-pointer"
        title="Fit View"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <button
        onClick={onResetLayout}
        className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition-colors cursor-pointer"
        title="Reset Layout"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-slate-200 dark:bg-navy-700 mx-1" />

      {/* Filter Dropdown */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
        <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1"
        >
          <option value="ALL" className="bg-white text-slate-900 font-semibold py-1">
            All Statuses
          </option>
          {STATUS_CONFIG.map((status) => (
            <option key={status.key} value={status.key} className="bg-white text-slate-900 font-semibold py-1">
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-navy-700 mx-1" />

      {/* Toggle Labels */}
      <button
        onClick={toggleLabels}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          showLabels
            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
            : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-navy-700 hover:bg-slate-200'
        }`}
      >
        {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        <span>Labels</span>
      </button>

      {/* Collapse Button */}
      <button
        onClick={() => setIsExpanded(false)}
        className="p-1.5 ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
        title="Collapse Controls"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
