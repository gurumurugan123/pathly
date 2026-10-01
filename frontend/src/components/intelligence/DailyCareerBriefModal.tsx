import React from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDailyBrief } from '../../services/intelligence';
import { useUIStore } from '../../stores/uiStore';

export const DailyCareerBriefModal: React.FC = () => {
  const isDailyBriefOpen = useUIStore((state) => state.isDailyBriefOpen);
  const setDailyBriefOpen = useUIStore((state) => state.setDailyBriefOpen);
  const setInsightSheetOpen = useUIStore((state) => state.setInsightSheetOpen);

  const { data: brief, isLoading } = useQuery({
    queryKey: ['brief'],
    queryFn: fetchDailyBrief,
    enabled: isDailyBriefOpen,
  });

  if (!isDailyBriefOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => setDailyBriefOpen(false)}
    >
      <div 
        className="bg-slate-900 border border-slate-700/60 text-white rounded-3xl p-6 shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Career Intelligence</span>
              <span className="text-slate-500 font-normal">|</span>
              <span className="text-slate-300 font-medium text-[11px]">{brief?.date || 'Today'}</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">Daily Intelligence Brief</h2>
          </div>

          <button
            type="button"
            onClick={() => setDailyBriefOpen(false)}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full mb-2" />
            <span className="text-xs font-semibold">Analyzing network intelligence...</span>
          </div>
        ) : brief ? (
          <>
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Highlights</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {brief.brief_highlights.map((highlight, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-slate-200 leading-relaxed font-medium">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Recommended Actions</h4>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  {brief.top_recommendation_count} actionable intelligence item(s) ready for review.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDailyBriefOpen(false);
                  setInsightSheetOpen(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Review Recommendations ({brief.top_recommendation_count})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
