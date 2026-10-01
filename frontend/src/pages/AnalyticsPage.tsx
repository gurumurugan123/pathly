import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics } from '../services/analytics';
import { Sidebar } from '../components/layout/Sidebar';
import { AddPersonModal } from '../components/modals/AddPersonModal';
import { AddCompanyModal } from '../components/modals/AddCompanyModal';
import { AddApplicationModal } from '../components/modals/AddApplicationModal';
import { AddFollowUpModal } from '../components/modals/AddFollowUpModal';
import { AICommandPalette } from '../components/ai/AICommandPalette';
import { AIAssistantDrawer } from '../components/ai/AIAssistantDrawer';
import { useUIStore } from '../stores/uiStore';
import { Briefcase, Award, TrendingUp, Users, CheckCircle2, ThumbsUp } from 'lucide-react';
import { getAppStatusConfig } from '../config/appStatuses';

interface AnalyticsPageProps {
  onNavigate?: (page: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigate }) => {
  const isAddPersonModalOpen = useUIStore((state) => state.isAddPersonModalOpen);
  const setAddPersonModalOpen = useUIStore((state) => state.setAddPersonModalOpen);

  const isAddCompanyModalOpen = useUIStore((state) => state.isAddCompanyModalOpen);
  const setAddCompanyModalOpen = useUIStore((state) => state.setAddCompanyModalOpen);

  const isAddApplicationModalOpen = useUIStore((state) => state.isAddApplicationModalOpen);
  const setAddApplicationModalOpen = useUIStore((state) => state.setAddApplicationModalOpen);

  const isAddFollowUpModalOpen = useUIStore((state) => state.isAddFollowUpModalOpen);
  const setAddFollowUpModalOpen = useUIStore((state) => state.setAddFollowUpModalOpen);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
  });

  const metrics = analytics?.metrics || {
    totalApplications: 0,
    activeApplications: 0,
    interviews: 0,
    offers: 0,
    hired: 0,
    referralApplications: 0,
    referralConversionRate: 0,
  };

  const statusDist = analytics?.statusDistribution || {};
  const topCompanies = analytics?.topCompanies || [];

  const cards = [
    { label: 'Total Applications', value: metrics.totalApplications, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Pipeline', value: metrics.activeApplications, icon: TrendingUp, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Interviews Scheduled', value: metrics.interviews, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Offers Received', value: metrics.offers, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Hired', value: metrics.hired, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Referral Conversion Rate', value: `${metrics.referralConversionRate}%`, icon: ThumbsUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar activePage="analytics" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-2xs">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Career & Referral Analytics</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Key hiring funnel metrics, application status distribution, and referral conversion rates
          </p>
        </header>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading analytics...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {cards.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.label} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
                      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${c.color}`} />
                      </div>
                      <div>
                        <span className="text-2xl font-black text-slate-900 leading-none">{c.value}</span>
                        <span className="text-[11px] text-slate-500 block font-medium mt-1 leading-tight">{c.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Application Status Breakdown</h3>
                  <div className="space-y-2.5">
                    {Object.keys(statusDist).length > 0 ? (
                      Object.entries(statusDist).map(([stKey, count]) => {
                        const stCfg = getAppStatusConfig(stKey);
                        const pct = Math.round((count / (metrics.totalApplications || 1)) * 100);
                        return (
                          <div key={stKey} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stCfg.color }} />
                                <span className="text-slate-800">{stCfg.label}</span>
                              </div>
                              <span className="text-slate-500">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: stCfg.color }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-400 text-xs text-center py-6">No application status data yet.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Top Target Companies</h3>
                  <div className="space-y-3">
                    {topCompanies.length > 0 ? (
                      topCompanies.map((comp) => (
                        <div key={comp.job_position__company__name} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-navy-800 text-white font-bold text-xs flex items-center justify-center">
                              {comp.job_position__company__name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs text-slate-900">{comp.job_position__company__name}</span>
                          </div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            {comp.count} {comp.count === 1 ? 'application' : 'applications'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-xs text-center py-6">No company applications logged yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals & AI Drawer */}
      <AICommandPalette />
      <AIAssistantDrawer />
      <AddPersonModal isOpen={isAddPersonModalOpen} onClose={() => setAddPersonModalOpen(false)} />
      <AddCompanyModal isOpen={isAddCompanyModalOpen} onClose={() => setAddCompanyModalOpen(false)} />
      <AddApplicationModal isOpen={isAddApplicationModalOpen} onClose={() => setAddApplicationModalOpen(false)} />
      <AddFollowUpModal isOpen={isAddFollowUpModalOpen} onClose={() => setAddFollowUpModalOpen(false)} />
    </div>
  );
};
