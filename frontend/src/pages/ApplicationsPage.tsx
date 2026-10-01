import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApplications } from '../services/applications';
import { Sidebar } from '../components/layout/Sidebar';
import { ApplicationDetailsPanel } from '../components/panels/ApplicationDetailsPanel';
import { AddApplicationModal } from '../components/modals/AddApplicationModal';
import { AddPersonModal } from '../components/modals/AddPersonModal';
import { AddCompanyModal } from '../components/modals/AddCompanyModal';
import { AddFollowUpModal } from '../components/modals/AddFollowUpModal';
import { AICommandPalette } from '../components/ai/AICommandPalette';
import { AIAssistantDrawer } from '../components/ai/AIAssistantDrawer';
import { getAppStatusConfig, APPLICATION_STATUS_CONFIG } from '../config/appStatuses';
import { Plus, Search, Filter, Briefcase, Building, ExternalLink, ChevronRight, UserCheck } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

interface ApplicationsPageProps {
  onNavigate?: (page: string) => void;
}

export const ApplicationsPage: React.FC<ApplicationsPageProps> = ({ onNavigate }) => {
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');

  const isAddPersonModalOpen = useUIStore((state) => state.isAddPersonModalOpen);
  const setAddPersonModalOpen = useUIStore((state) => state.setAddPersonModalOpen);

  const isAddCompanyModalOpen = useUIStore((state) => state.isAddCompanyModalOpen);
  const setAddCompanyModalOpen = useUIStore((state) => state.setAddCompanyModalOpen);

  const isAddApplicationModalOpen = useUIStore((state) => state.isAddApplicationModalOpen);
  const setAddApplicationModalOpen = useUIStore((state) => state.setAddApplicationModalOpen);

  const isAddFollowUpModalOpen = useUIStore((state) => state.isAddFollowUpModalOpen);
  const setAddFollowUpModalOpen = useUIStore((state) => state.setAddFollowUpModalOpen);

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
  });

  const uniqueCompanies = Array.from(new Set((applications || []).map((app) => app.company_name)));

  const filteredApps = (applications || []).filter((app) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      app.job_title.toLowerCase().includes(q) ||
      app.company_name.toLowerCase().includes(q) ||
      (app.primary_contact_name && app.primary_contact_name.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || app.current_status === statusFilter;
    const matchesCompany = companyFilter === 'ALL' || app.company_name === companyFilter;

    return matchesQuery && matchesStatus && matchesCompany;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar activePage="applications" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Job Applications Roster</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage and track all job postings, referral contacts, and interview stages
            </p>
          </div>

          <button
            onClick={() => setAddApplicationModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Application</span>
          </button>
        </header>

        {/* Filter Controls Bar */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job title, company, or referral contact..."
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-white text-slate-900 font-semibold py-1">All Statuses</option>
                {APPLICATION_STATUS_CONFIG.map((s) => (
                  <option key={s.key} value={s.key} className="bg-white text-slate-900 font-semibold py-1">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-white text-slate-900 font-semibold py-1">All Companies</option>
                {uniqueCompanies.map((c) => (
                  <option key={c} value={c} className="bg-white text-slate-900 font-semibold py-1">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Applications List Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading applications roster...</div>
          ) : filteredApps.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3.5 pl-5">Job Title & Company</th>
                    <th className="p-3.5">Status Stage</th>
                    <th className="p-3.5">Referral Contact</th>
                    <th className="p-3.5">Employment & Location</th>
                    <th className="p-3.5">Applied Date</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map((app) => {
                    const statusCfg = getAppStatusConfig(app.current_status);
                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedAppId(app.id)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      >
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {app.job_title}
                          </div>
                          <div className="text-blue-600 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3" />
                            {app.company_name}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusCfg.bgClass} ${statusCfg.textClass} ${statusCfg.borderClass}`}>
                            {statusCfg.label}
                          </span>
                        </td>

                        <td className="p-3.5">
                          {app.primary_contact_name ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                              {app.primary_contact_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No referral contact</span>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-600">
                          <div>{app.employment_type}</div>
                          <div className="text-[10px] text-slate-400">{app.job_location || 'Remote'}</div>
                        </td>

                        <td className="p-3.5 text-slate-600">
                          {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Not applied'}
                        </td>

                        <td className="p-3.5 text-right pr-5">
                          <div className="flex items-center justify-end gap-2">
                            {app.job_url && (
                              <a
                                href={app.job_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                                title="Open Job Link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-bold text-slate-700 text-sm">No applications found</p>
              <p className="text-xs mt-0.5">Try clearing filters or add a new job application.</p>
            </div>
          )}
        </div>
      </div>

      {selectedAppId && (
        <ApplicationDetailsPanel applicationId={selectedAppId} onClose={() => setSelectedAppId(null)} />
      )}

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
