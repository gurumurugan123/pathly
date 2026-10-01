import React, { useState } from 'react';
import { Sparkles, Send, HelpCircle, Loader2 } from 'lucide-react';
import { postAIQuery } from '../../services/ai';
import { useUIStore } from '../../stores/uiStore';

const QUICK_EXAMPLES = [
  "Show everyone from Zoho who replied.",
  "Who accepted my resume?",
  "Show applications without a referral.",
  "Who should I follow up with?",
  "Show my Cognizant network.",
  "How many referrals did I receive?",
];

export const AICommandCenter: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setAIAssistantOpen = useUIStore((state) => state.setAIAssistantOpen);
  const setAIQueryResult = useUIStore((state) => state.setAIQueryResult);
  const setHighlightedNodeIds = useUIStore((state) => state.setHighlightedNodeIds);

  const handleSearch = async (queryToSubmit?: string) => {
    const q = (queryToSubmit || prompt).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setPrompt(q);

    try {
      const res = await postAIQuery(q);
      setAIQueryResult(res);
      setAIAssistantOpen(true);

      const combinedNodes = [
        ...(res.selectedPeople || []),
        ...(res.selectedCompanies || []),
        ...(res.selectedApplications || []),
      ];
      setHighlightedNodeIds(combinedNodes);
    } catch (err: any) {
      setAIQueryResult({
        query: q,
        interpretation: "Error processing query",
        text: err?.message || "Failed to reach AI Assistant. Please check connection.",
        selectedPeople: [],
        selectedCompanies: [],
        selectedApplications: [],
      });
      setAIAssistantOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="w-full bg-slate-900 border-b border-navy-700 p-4 select-none shadow-md">
      <div className="max-w-5xl mx-auto space-y-2.5">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-700/60 text-indigo-300">
              AI Command
            </span>
          </div>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Pathly AI anything... (e.g. 'Show everyone from Zoho who replied', 'Who accepted my resume?')"
            className="w-full pl-36 pr-12 py-3 bg-navy-950 border border-indigo-500/30 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner font-medium"
          />

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl disabled:opacity-40 transition-all shadow-md flex items-center justify-center cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>

        {/* Quick Example Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 flex-shrink-0">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            Examples:
          </span>
          {QUICK_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleSearch(ex)}
              className="text-[11px] px-3 py-1 bg-navy-800/80 hover:bg-indigo-900/60 border border-slate-700/80 hover:border-indigo-500/50 text-slate-300 hover:text-white rounded-full transition-all flex-shrink-0 font-medium cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
