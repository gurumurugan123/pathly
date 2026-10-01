import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Command, ArrowRight, CornerDownLeft, X, Loader2, Users, Briefcase, Calendar, BarChart2 } from 'lucide-react';
import { postAIQuery } from '../../services/ai';
import { useUIStore } from '../../stores/uiStore';

const CATEGORIZED_SUGGESTIONS = [
  {
    category: "Network & Status",
    icon: Users,
    items: [
      "Show everyone from Zoho who replied.",
      "Who accepted my resume?",
      "Show my Cognizant network.",
    ]
  },
  {
    category: "Applications & Referrals",
    icon: Briefcase,
    items: [
      "Show applications without a referral.",
      "How many applications currently have referrals?",
    ]
  },
  {
    category: "Tasks & Follow-ups",
    icon: Calendar,
    items: [
      "Who should I follow up with?",
      "Create a follow-up for Suresh tomorrow",
    ]
  },
  {
    category: "Career Analytics",
    icon: BarChart2,
    items: [
      "How many referrals did I receive?",
      "What is my referral conversion rate?",
      "Which company has the most contacts?",
    ]
  }
];

export const AICommandPalette: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAICommandPaletteOpen = useUIStore((state) => state.isAICommandPaletteOpen);
  const setAICommandPaletteOpen = useUIStore((state) => state.setAICommandPaletteOpen);
  const setAIAssistantOpen = useUIStore((state) => state.setAIAssistantOpen);
  const setAIQueryResult = useUIStore((state) => state.setAIQueryResult);
  const setHighlightedNodeIds = useUIStore((state) => state.setHighlightedNodeIds);

  // Global Keyboard Shortcut Handler for Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAICommandPaletteOpen(!isAICommandPaletteOpen);
      }
      if (e.key === 'Escape' && isAICommandPaletteOpen) {
        setAICommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAICommandPaletteOpen, setAICommandPaletteOpen]);

  // Focus input when palette opens
  useEffect(() => {
    if (isAICommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isAICommandPaletteOpen]);

  if (!isAICommandPaletteOpen) return null;

  const handleExecuteQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setQuery(q);

    try {
      const res = await postAIQuery(q);
      setAIQueryResult(res);

      const combinedNodes = [
        ...(res.selectedPeople || []),
        ...(res.selectedCompanies || []),
        ...(res.selectedApplications || []),
      ];
      setHighlightedNodeIds(combinedNodes);

      // Close Spotlight Command Palette modal so workspace is unobstructed
      setAICommandPaletteOpen(false);

      // Open compact result drawer
      setAIAssistantOpen(true);
    } catch (err: any) {
      setAIQueryResult({
        query: q,
        interpretation: "Error executing query",
        text: err?.message || "Failed to process request.",
        selectedPeople: [],
        selectedCompanies: [],
        selectedApplications: [],
      });
      setAICommandPaletteOpen(false);
      setAIAssistantOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteQuery(query);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white/95 dark:bg-navy-900/95 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-navy-700/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spotlight Command Input Box */}
        <form onSubmit={handleSubmit} className="relative p-4 border-b border-slate-100 dark:border-navy-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Pathly AI anything or type a command..."
            className="w-full text-sm font-medium bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />

          {query ? (
            <button
              type="submit"
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <span>Search</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-navy-800 px-2.5 py-1 rounded-lg flex-shrink-0">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAICommandPaletteOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Categorized Suggestions Area */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {CATEGORIZED_SUGGESTIONS.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                  <Icon className="w-3 h-3" />
                  <span>{cat.category}</span>
                </div>

                <div className="space-y-1">
                  {cat.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleExecuteQuery(item)}
                      className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-indigo-50/80 dark:hover:bg-navy-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate">{item}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Command Palette Footer */}
        <div className="p-3 bg-slate-50/80 dark:bg-navy-950/80 border-t border-slate-100 dark:border-navy-800 px-5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded text-[10px]">↵</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded text-[10px]">esc</kbd> Close</span>
          </div>
          <span className="text-[10px] text-indigo-500 font-bold">Pathly AI Spotlight</span>
        </div>
      </div>
    </div>
  );
};
