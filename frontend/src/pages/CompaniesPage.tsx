import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  Users,
  Briefcase,
  Sparkles,
  ExternalLink,
  Eye,
  Crosshair,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { AddCompanyModal } from '../components/modals/AddCompanyModal';
import { CompanyDetailsPanel } from '../components/panels/CompanyDetailsPanel';
import { exportCompaniesToCsv } from '../utils/exportUtils';

import {
  fetchCompanies,
  fetchCompanyStats,
  deleteCompany,
  updateCompany,
  type CompanyItem,
} from '../services/companies';
import { useUIStore } from '../stores/uiStore';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  // Selected company for detail sheet / edit / delete
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyItem | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const isAddCompanyModalOpen = useUIStore((state) => state.isAddCompanyModalOpen);
  const setAddCompanyModalOpen = useUIStore((state) => state.setAddCompanyModalOpen);
  const focusCompany = useUIStore((state) => state.focusCompany);

  // Queries
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['companyStats'],
    queryFn: fetchCompanyStats,
  });

  const { data: companies = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['companies', searchTerm, activeFilter],
    queryFn: () => fetchCompanies({ search: searchTerm, filter: activeFilter !== 'ALL' ? activeFilter.toLowerCase() : undefined }),
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CompanyItem> }) => updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companyStats'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      setEditingCompany(null);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: number; force: boolean }) => deleteCompany(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companyStats'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      setDeletingCompany(null);
      setDeleteWarning(null);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error || 'Failed to delete company';
      setDeleteWarning(errMsg);
    },
  });

  const handleFocusGraph = (companyId: number) => {
    focusCompany(companyId);
    navigate('/dashboard');
  };

  const handleConfirmDelete = () => {
    if (!deletingCompany) return;
    deleteMutation.mutate({ id: deletingCompany.id, force: true });
  };

  const filters = [
    { key: 'ALL', label: 'All Companies' },
    { key: 'active_applications', label: 'Active Applications' },
    { key: 'has_referral', label: 'Has Referral' },
    { key: 'no_referral', label: 'No Referral' },
    { key: 'has_contacts', label: 'Has Contacts' },
    { key: 'no_contacts', label: 'No Contacts' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-5 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-indigo-600" />
              Companies
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Manage target companies, track referral coverage, and focus your network graph.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportCompaniesToCsv(companies || [], `pathly-companies-${new Date().toISOString().slice(0, 10)}.csv`)}
              disabled={!companies || companies.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Download companies as CSV spreadsheet"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setAddCompanyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Company</span>
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.total_companies ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">Total Companies</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.active_applications ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">Active Applications</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.people_connected ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">People Connected</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.referral_opportunities ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">Referral Opportunities</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company name, domain..."
                className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === f.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Company Cards Grid / List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="bg-white border border-rose-200 rounded-3xl p-12 text-center max-w-md mx-auto my-8 space-y-4 shadow-sm">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Couldn't load your companies</h3>
                <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Failed to connect to backend service.'}</p>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center max-w-lg mx-auto my-8 space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">No companies yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Add the target companies where you are applying or building referral connections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddCompanyModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Company</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map((company) => {
                const logoLetter = company.name ? company.name[0].toUpperCase() : 'C';

                return (
                  <div
                    key={company.id}
                    className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white font-black text-lg flex items-center justify-center shadow-xs flex-shrink-0 border border-slate-700/50">
                            {logoLetter}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {company.name}
                            </h3>
                            {company.website && (
                              <a
                                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium truncate max-w-full"
                              >
                                <span>{company.website.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingCompany(company)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Company"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingCompany(company);
                              setDeleteWarning(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stats Pills */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                          <p className="text-sm font-black text-slate-900">{company.people_count}</p>
                          <p className="text-[10px] font-semibold text-slate-500">People</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                          <p className="text-sm font-black text-slate-900">{company.applications_count}</p>
                          <p className="text-[10px] font-semibold text-slate-500">Applications</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                          <p className="text-sm font-black text-amber-600">{company.referral_contacts_count}</p>
                          <p className="text-[10px] font-semibold text-slate-500">Referrals</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCompanyId(company.id)}
                        className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFocusGraph(company.id)}
                        className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Focus Graph</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedCompanyId && (
        <CompanyDetailsPanel
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
        />
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setAddCompanyModalOpen(false)}
      />

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate({ id: editingCompany.id, data: editingCompany });
            }}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-slate-200"
          >
            <h3 className="text-lg font-black text-slate-900">Edit Company</h3>

            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1">Website Domain</label>
                <input
                  type="text"
                  value={editingCompany.website || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. zoho.com"
                />
              </div>

              <div>
                <label className="block mb-1">Industry</label>
                <input
                  type="text"
                  value={editingCompany.industry || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, industry: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1">Location</label>
                <input
                  type="text"
                  value={editingCompany.location || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, location: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Delete {deletingCompany.name}?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently remove <strong>{deletingCompany.name}</strong> from your career network.
            </p>

            {deleteWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800">
                {deleteWarning}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingCompany(null);
                  setDeleteWarning(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
