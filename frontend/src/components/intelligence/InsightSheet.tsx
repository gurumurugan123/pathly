import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, CheckCircle2, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRecommendations, postRecommendationAction, type Recommendation } from '../../services/intelligence';
import { useUIStore } from '../../stores/uiStore';

export const InsightSheet: React.FC = () => {
  const queryClient = useQueryClient();
  const isInsightSheetOpen = useUIStore((state) => state.isInsightSheetOpen);
  const setInsightSheetOpen = useUIStore((state) => state.setInsightSheetOpen);
  const setSelectedNode = useUIStore((state) => state.setSelectedNode);
  const setHighlightedNodeIds = useUIStore((state) => state.setHighlightedNodeIds);

  const [expandedReasonId, setExpandedReasonId] = useState<number | null>(null);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: fetchRecommendations,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'dismiss' | 'complete' }) =>
      postRecommendationAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['brief'] });
    },
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isInsightSheetOpen) {
        setInsightSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInsightSheetOpen, setInsightSheetOpen]);

  if (!isInsightSheetOpen) return null;

  const handleFocusEntity = (rec: Recommendation) => {
    if (rec.entity_type && rec.entity_id) {
      const typeKey = rec.entity_type === 'person' ? 'person' : rec.entity_type === 'company' ? 'company' : 'application';
      const nodeId = `${typeKey}-${rec.entity_id}`;
      setSelectedNode(nodeId, typeKey, rec.entity_id);
      setHighlightedNodeIds([nodeId]);
      setInsightSheetOpen(false);
    }
  };

  return (
    <div
      onClick={() => setInsightSheetOpen(false)}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 cursor-default"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-navy-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/80 flex items-center justify-center border border-indigo-400/30 shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="font-black text-base tracking-tight">Needs Attention</h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Data-driven career recommendations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInsightSheetOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
              Analyzing career network data...
            </div>
          ) : !recommendations || recommendations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700">All recommendations cleared!</p>
              <p className="text-slate-400">Your network and applications are completely up to date.</p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${
                        rec.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : rec.priority === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.priority}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {rec.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => actionMutation.mutate({ id: rec.id, action: 'complete' })}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-md transition-colors cursor-pointer"
                      title="Mark Completed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => actionMutation.mutate({ id: rec.id, action: 'dismiss' })}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{rec.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rec.description}</p>
                </div>

                {/* Explainable Reason Collapsible */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setExpandedReasonId(expandedReasonId === rec.id ? null : rec.id)}
                    className="font-bold text-[11px] text-slate-600 hover:text-slate-900 flex items-center justify-between w-full cursor-pointer"
                  >
                    <span>Why this recommendation?</span>
                    <span className="text-indigo-600 text-[10px]">
                      {expandedReasonId === rec.id ? 'Hide Data' : 'View Data'}
                    </span>
                  </button>
                  {expandedReasonId === rec.id && (
                    <div className="mt-2 pt-2 border-t border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                      {rec.reason}
                    </div>
                  )}
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={() => handleFocusEntity(rec)}
                  className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Focus in Graph</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
