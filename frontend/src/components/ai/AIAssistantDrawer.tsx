import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../stores/uiStore';
import { executeAIMutation } from '../../services/ai';

export const AIAssistantDrawer: React.FC = () => {
  const queryClient = useQueryClient();

  const isAIAssistantOpen = useUIStore((state) => state.isAIAssistantOpen);
  const setAIAssistantOpen = useUIStore((state) => state.setAIAssistantOpen);
  const aiQueryResult = useUIStore((state) => state.aiQueryResult);
  const setAIQueryResult = useUIStore((state) => state.setAIQueryResult);
  const clearGraphFocus = useUIStore((state) => state.clearGraphFocus);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  if (!isAIAssistantOpen || !aiQueryResult) return null;

  const { query, interpretation, text, selectedPeople, selectedCompanies, selectedApplications, pendingMutation } = aiQueryResult;

  const handleConfirmMutation = async () => {
    if (!pendingMutation) return;

    setIsExecuting(true);
    setExecutionMessage(null);

    try {
      const res = await executeAIMutation(pendingMutation.action, pendingMutation.params);
      if (res.success) {
        setExecutionMessage(res.message);
        // Refresh all application & graph queries
        queryClient.invalidateQueries({ queryKey: ['graph'] });
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        queryClient.invalidateQueries({ queryKey: ['people'] });
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });

        // Clear pending mutation after execution
        setAIQueryResult({
          ...aiQueryResult,
          pendingMutation: null,
          text: `✅ ${res.message}`,
        });
      }
    } catch (err: any) {
      setExecutionMessage(err?.message || "Failed to execute mutation");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancelMutation = () => {
    setAIQueryResult({
      ...aiQueryResult,
      pendingMutation: null,
      text: "Mutation cancelled.",
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-md w-full bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Drawer Header */}
      <div className="p-4 bg-gradient-to-r from-navy-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/80 flex items-center justify-center border border-indigo-400/40 shadow-xs">
            <Sparkles className="w-4 h-4 text-indigo-200" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight">AI Graph Assistant</h3>
            <p className="text-[10px] text-indigo-300 font-medium">{interpretation || "Natural language insights"}</p>
          </div>
        </div>

        <button
          onClick={() => setAIAssistantOpen(false)}
          className="p-1 text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* User Query Tag */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Query</span>
          <p className="font-bold text-slate-800">"{query}"</p>
        </div>

        {/* AI Answer Text */}
        <div className="text-xs text-slate-700 leading-relaxed font-medium bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
          {text}
        </div>

        {/* Selection Stats / Graph Actions */}
        {(selectedPeople.length > 0 || selectedCompanies.length > 0 || selectedApplications.length > 0) && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              <span className="font-bold text-blue-900">
                Highlighted {selectedPeople.length + selectedCompanies.length + selectedApplications.length} nodes on graph
              </span>
            </div>
            <button
              onClick={clearGraphFocus}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
            >
              Clear focus
            </button>
          </div>
        )}

        {/* Mutation Confirmation Card */}
        {pendingMutation && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="font-extrabold text-xs">Mutation Confirmation Required</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-2">
              {pendingMutation.summary?.entity_name && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold text-slate-500">Target:</span>
                  <span className="font-bold text-slate-900">{pendingMutation.summary.entity_name}</span>
                </div>
              )}

              {pendingMutation.summary?.company_name && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold text-slate-500">Company:</span>
                  <span className="font-bold text-slate-900">{pendingMutation.summary.company_name}</span>
                </div>
              )}

              {pendingMutation.summary?.current_status && pendingMutation.summary?.new_status && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                    {pendingMutation.summary.current_status}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[11px]">
                    {pendingMutation.summary.new_status}
                  </span>
                </div>
              )}

              {pendingMutation.summary.due_date && (
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-500">Due Date:</span>
                  <span className="font-bold text-indigo-600">{pendingMutation.summary.due_date}</span>
                </div>
              )}
            </div>

            {executionMessage && (
              <p className="text-xs font-semibold text-emerald-700">{executionMessage}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelMutation}
                disabled={isExecuting}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-amber-100/80 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMutation}
                disabled={isExecuting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm Action</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
