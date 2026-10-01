import React, { useState, useRef, useEffect } from 'react';
import { Layers, Sparkles, UserCheck, Target, Clock, Building, ChevronDown, Check } from 'lucide-react';
import { useUIStore, type GraphMode } from '../../stores/uiStore';
import { fetchGraphOverlay } from '../../services/intelligence';

const MODES: { mode: GraphMode; label: string; icon: any; description: string }[] = [
  { mode: 'NORMAL', label: 'Default', icon: Layers, description: 'Standard network graph view' },
  { mode: 'RELATIONSHIP_STRENGTH', label: 'Relationship Strength', icon: UserCheck, description: 'Emphasize strong connections & warmth' },
  { mode: 'REFERRAL_OPPORTUNITIES', label: 'Referral Opportunities', icon: Sparkles, description: 'Applications missing internal referrals' },
  { mode: 'APPLICATION_FOCUS', label: 'Application Focus', icon: Target, description: 'Active applications & status clusters' },
  { mode: 'FOLLOW_UPS', label: 'Follow Ups', icon: Clock, description: 'Overdue or upcoming follow-up actions' },
  { mode: 'COMPANY_COVERAGE', label: 'Company Coverage', icon: Building, description: 'Target company contact density' },
];

export const GraphModeToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const graphMode = useUIStore((state) => state.graphMode);
  const setGraphMode = useUIStore((state) => state.setGraphMode);
  const setHighlightedNodeIds = useUIStore((state) => state.setHighlightedNodeIds);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeItem = MODES.find((m) => m.mode === graphMode) || MODES[0];
  const ActiveIcon = activeItem.icon;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMode = async (mode: GraphMode) => {
    setGraphMode(mode);
    setIsOpen(false);
    if (mode === 'NORMAL') {
      setHighlightedNodeIds([]);
    } else {
      try {
        const overlay = await fetchGraphOverlay(mode);
        setHighlightedNodeIds(overlay.emphasized_node_ids || []);
      } catch (err) {
        console.error("Failed to load graph overlay", err);
      }
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-bold rounded-2xl border border-slate-200/90 shadow-md transition-all cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span className="text-slate-400 font-medium">Mode:</span>
        <span className="text-slate-900 font-bold flex items-center gap-1.5">
          <ActiveIcon className="w-3.5 h-3.5 text-indigo-500" />
          {activeItem.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Select Graph Lens
          </div>
          <div className="mt-1 space-y-0.5">
            {MODES.map((item) => {
              const Icon = item.icon;
              const isActive = graphMode === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => handleSelectMode(item.mode)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        {item.label}
                      </div>
                      <div className={`text-[11px] leading-tight ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
