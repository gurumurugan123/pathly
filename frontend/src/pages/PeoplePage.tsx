import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Building2,
  ThumbsUp,
  Award,
  MessageSquare,
  ExternalLink,
  Eye,
  Crosshair,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { AddPersonModal } from '../components/modals/AddPersonModal';
import { PersonDetailsPanel } from '../components/panels/PersonDetailsPanel';
import { fetchCompanies } from '../services/companies';
import {
  fetchPeople,
  fetchPeopleStats,
  deletePerson,
  updatePerson,
  type PersonItem,
} from '../services/people';
import { useUIStore } from '../stores/uiStore';
import { STATUS_CONFIG, getStatusConfig } from '../config/statuses';

export const PeoplePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');

  const [activePersonId, setActivePersonId] = useState<number | null>(null);
  const [editingPerson, setEditingPerson] = useState<PersonItem | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<PersonItem | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const isAddPersonModalOpen = useUIStore((state) => state.isAddPersonModalOpen);
  const setAddPersonModalOpen = useUIStore((state) => state.setAddPersonModalOpen);
  const focusPerson = useUIStore((state) => state.focusPerson);

  // Queries
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['peopleStats'],
    queryFn: fetchPeopleStats,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies(),
  });

  const { data: people = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['people', searchTerm, selectedStatus, selectedCompanyId],
    queryFn: () =>
      fetchPeople({
        search: searchTerm,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        company_id: selectedCompanyId !== 'ALL' ? selectedCompanyId : undefined,
      }),
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PersonItem> }) => updatePerson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['peopleStats'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      setEditingPerson(null);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: number; force: boolean }) => deletePerson(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['peopleStats'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      setDeletingPerson(null);
      setDeleteWarning(null);
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error || 'Failed to delete person';
      setDeleteWarning(errMsg);
    },
  });

  const handleFocusGraph = (personId: number) => {
    focusPerson(personId);
    navigate('/dashboard');
  };

  const handleConfirmDelete = () => {
    if (!deletingPerson) return;
    deleteMutation.mutate({ id: deletingPerson.id, force: true });
  };

  const statusFilters = ['ALL', ...STATUS_CONFIG.map((s) => s.key)];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-5 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-indigo-600" />
              People Network
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Manage contacts, track relationship stages, and discover referral paths.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddPersonModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Person</span>
          </button>
        </header>

        <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.total_people ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">Total Network</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.replied ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">Replied</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <ThumbsUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.will_refer ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">Willing to Refer</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">
                  {isStatsLoading ? '...' : stats?.referral_given ?? 0}
                </p>
                <p className="text-xs font-semibold text-slate-500">Referral Given</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, title, email, company..."
                  className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Company Select Filter */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Relationship Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
              {statusFilters.map((stKey) => {
                const isSelected = selectedStatus === stKey;
                const statusCfg = getStatusConfig(stKey);
                const label = stKey === 'ALL' ? 'All Statuses' : statusCfg.label;

                return (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setSelectedStatus(stKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* People Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="bg-white border border-rose-200 rounded-3xl p-12 text-center max-w-md mx-auto my-8 space-y-4 shadow-sm">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Couldn't load your network</h3>
                <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Failed to connect to backend.'}</p>
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
          ) : people.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center max-w-lg mx-auto my-8 space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">No people in your network yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Add contacts, alumni, recruiters, or referral partners to start building your career graph.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddPersonModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Person</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {people.map((person) => {
                const initials = person.name
                  ? person.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                  : 'P';
                const statusConfig = getStatusConfig(person.current_status);

                return (
                  <div
                    key={person.id}
                    className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {person.name}
                            </h3>
                            <p className="text-xs text-slate-500 truncate font-medium">
                              {person.designation || 'Contact'}
                            </p>
                            {person.company_detail && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                                {person.company_detail.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingPerson(person)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Person"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingPerson(person);
                              setDeleteWarning(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Person"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between pt-1">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold tracking-tight border ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}>
                          {statusConfig.label}
                        </span>

                        {person.linkedin_url && (
                          <a
                            href={person.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline text-xs font-semibold flex items-center gap-1"
                          >
                            <span>LinkedIn</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePersonId(person.id)}
                        className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFocusGraph(person.id)}
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

      {/* Person Detail Panel */}
      {activePersonId && (
        <PersonDetailsPanel
          personId={activePersonId}
          onClose={() => setActivePersonId(null)}
        />
      )}

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddPersonModalOpen}
        onClose={() => setAddPersonModalOpen(false)}
      />

      {/* Edit Person Modal */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate({ id: editingPerson.id, data: editingPerson });
            }}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-slate-200"
          >
            <h3 className="text-lg font-black text-slate-900">Edit Person</h3>

            <div className="space-y-3 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingPerson.name}
                  onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={editingPerson.designation || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, designation: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1">Email</label>
                <input
                  type="email"
                  value={editingPerson.email || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, email: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1">Phone</label>
                <input
                  type="text"
                  value={editingPerson.phone || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={editingPerson.linkedin_url || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, linkedin_url: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://linkedin.com/in/profile"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
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
      {deletingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Delete {deletingPerson.name}?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will remove <strong>{deletingPerson.name}</strong> from your network graph.
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
                  setDeletingPerson(null);
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
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Person'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
