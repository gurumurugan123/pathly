import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchRecommendations } from '../../services/intelligence';
import { useUIStore } from '../../stores/uiStore';

export const InsightFloatingPill: React.FC = () => {
  const setInsightSheetOpen = useUIStore((state) => state.setInsightSheetOpen);

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: fetchRecommendations,
    refetchInterval: 30000,
  });

  const activeCount = recommendations?.length || 0;

  if (activeCount === 0) return null;

  return (
    <button
      type="button"
      onClick={() => setInsightSheetOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 hover:from-amber-500/20 hover:to-purple-500/20 text-slate-800 text-xs font-bold rounded-full border border-amber-300/60 shadow-2xs transition-all cursor-pointer backdrop-blur-md"
      title="View Career Intelligence Recommendations"
    >
      <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
      <span>{activeCount} things need attention</span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
    </button>
  );
};
