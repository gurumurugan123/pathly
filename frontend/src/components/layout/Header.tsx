import React from 'react';
import { Search, UserPlus, Building2, Users, CheckCircle2, MessageSquare, ThumbsUp, Award, Sparkles } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { HeaderNotificationCenter } from '../intelligence/HeaderNotificationCenter';
import { InsightFloatingPill } from '../intelligence/InsightFloatingPill';
import type { Stats } from '../../types';

interface HeaderProps {
  stats: Stats;
}

export const Header: React.FC<HeaderProps> = ({ stats }) => {
  const searchQuery = useUIStore((state) => state.searchQuery);
  const setSearchQuery = useUIStore((state) => state.setSearchQuery);
  const setAddPersonModalOpen = useUIStore((state) => state.setAddPersonModalOpen);
  const setAddCompanyModalOpen = useUIStore((state) => state.setAddCompanyModalOpen);

  const kpis = [
    { label: 'Total Connections', value: stats.totalPeople || 0, icon: Users, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Resume Accepted', value: stats.resumeAccepted || 0, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Replied', value: stats.replied || 0, icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Willing to Refer', value: stats.willRefer || 0, icon: ThumbsUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Referral Given', value: stats.referralGiven || 0, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-4 space-y-4 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Your Referral Network</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Visualize your connections, track your resume status and get referrals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people, companies, status..."
              className="w-64 text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          <InsightFloatingPill />

          <button
            type="button"
            onClick={() => useUIStore.getState().toggleDailyBrief()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 shadow-2xs transition-all cursor-pointer"
            title="Open Daily Career Brief"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>✦ Career Brief</span>
          </button>

          <button
            onClick={() => useUIStore.getState().toggleAICommandPalette()}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200/80 shadow-2xs transition-all cursor-pointer"
            title="Open AI Command Palette (Ctrl+K)"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Ask Pathly AI</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-indigo-200 text-indigo-900 rounded-md text-[10px] font-mono shadow-2xs">
              ⌘K
            </kbd>
          </button>

          <HeaderNotificationCenter />

          <button
            onClick={() => setAddPersonModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Person</span>
          </button>

          <button
            onClick={() => setAddCompanyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add Company</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-900 block leading-none">{kpi.value}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-1 truncate">{kpi.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </header>
  );
};
