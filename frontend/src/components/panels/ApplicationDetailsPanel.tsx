import React, { useState } from 'react';
import { X, ExternalLink, MapPin, Building, Trash2, Plus, Calendar, Clock, History as HistoryIcon, Focus, UserPlus, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApplicationDetail, updateApplicationStatus, deleteApplication, addApplicationContact, removeApplicationContact } from '../../services/applications';
import { fetchPeople } from '../../services/people';
import { updateFollowUp } from '../../services/followups';
import { getAppStatusConfig, CONTACT_ROLE_CONFIG, APPLICATION_STATUS_CONFIG } from '../../config/appStatuses';
import { useUIStore } from '../../stores/uiStore';

interface ApplicationDetailsPanelProps {
  applicationId: number;
  onClose: () => void;
}

export const ApplicationDetailsPanel: React.FC<ApplicationDetailsPanelProps> = ({ applicationId, onClose }) => {
  const queryClient = useQueryClient();
  const setFocusedApplication = useUIStore((state) => state.setFocusedApplication);
  const setAddFollowUpModalOpen = useUIStore((state) => state.setAddFollowUpModalOpen);

  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'followups' | 'history'>('overview');
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('');
  const [selectedRole, setSelectedRole] = useState('REFERRAL_CONTACT');

  const [statusNoteInput, setStatusNoteInput] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);

  // Fetch Application detail
  const { data: application, isLoading: isAppLoading } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => fetchApplicationDetail(applicationId),
  });

  // Fetch People for contact association
  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: () => fetchPeople(),
  });

  // Update Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status, note }: { appId: number; status: string; note?: string }) =>
      updateApplicationStatus(appId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setShowStatusModal(false);
      setStatusNoteInput('');
    },
  });

  // Add Contact mutation
  const addContactMutation = useMutation({
    mutationFn: ({ appId, personId, role }: { appId: number; personId: number; role: string }) =>
      addApplicationContact(appId, personId, role),
    onSuccess: () => {
      setSelectedPersonId('');
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });

  // Remove Contact mutation
  const removeContactMutation = useMutation({
    mutationFn: ({ appId, contactId }: { appId: number; contactId: number }) =>
      removeApplicationContact(appId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });

  // Complete FollowUp mutation
  const completeFollowUpMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateFollowUp(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  // Delete Application mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      onClose();
    },
  });

  if (isAppLoading || !application) {
    return (
      <div className="w-80 md:w-96 bg-white border-l border-slate-200 h-full p-6 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-2" />
        <span className="text-xs">Loading application details...</span>
      </div>
    );
  }

  const appStatusCfg = getAppStatusConfig(application.current_status);
  const contactIds = (application.contacts || []).map((c) => c.person);

  const handleFocusOnGraph = () => {
    setFocusedApplication(application.id, application.company_id, contactIds);
  };

  const handlePromptStatusChange = (statusKey: string) => {
    setTargetStatus(statusKey);
    setShowStatusModal(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!targetStatus) return;
    await updateStatusMutation.mutateAsync({ appId: application.id, status: targetStatus, note: statusNoteInput });
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId) return;
    addContactMutation.mutate({ appId: application.id, personId: Number(selectedPersonId), role: selectedRole });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete application for ${application.job_title}?`)) {
      deleteMutation.mutate(application.id);
    }
  };

  return (
    <div className="w-full md:w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-navy-800 text-white font-bold text-sm flex items-center justify-center shadow-md flex-shrink-0">
            {application.company_name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{application.job_title}</h3>
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold mt-0.5">
              <Building className="w-3 h-3" />
              {application.company_name}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action Toolbar */}
      <div className="p-3 border-b border-slate-100 bg-white flex items-center gap-2">
        <button
          onClick={handleFocusOnGraph}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
          title="Highlight YOU -> Company -> Contacts on Graph"
        >
          <Focus className="w-3.5 h-3.5" />
          <span>Focus on Graph</span>
        </button>

        {application.job_url && (
          <a
            href={application.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Open Job Listing"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          onClick={handleDelete}
          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
          title="Delete Application"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 px-2 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'contacts'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Contacts ({application.contacts?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'followups'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Follow-ups ({application.follow_ups?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          History
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Status Header Badge */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-600">Application Stage</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${appStatusCfg.bgClass} ${appStatusCfg.textClass} ${appStatusCfg.borderClass}`}>
                {appStatusCfg.label}
              </span>
            </div>

            {/* Job Metadata */}
            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-500">Location:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {application.job_location || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-500">Employment Type:</span>
                <span className="font-semibold text-slate-800">{application.employment_type}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-500">Source:</span>
                <span className="font-semibold text-slate-800">{application.source}</span>
              </div>
              {application.applied_at && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Applied On:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Status Change Selector */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Change Status Stage</h4>
              <div className="grid grid-cols-2 gap-2">
                {APPLICATION_STATUS_CONFIG.slice(0, 8).map((st) => (
                  <button
                    key={st.key}
                    onClick={() => handlePromptStatusChange(st.key)}
                    className={`py-2 px-2.5 text-left text-xs font-semibold rounded-lg border transition-all ${
                      st.key === application.current_status
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-4">
            {/* Add Contact Form */}
            <form onSubmit={handleAddContact} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800">Link Contact to Application</h4>

              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- Select Contact --</option>
                {(people || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.company_detail?.name || 'No company'})
                  </option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="REFERRAL_CONTACT">Referral Contact</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="HIRING_MANAGER">Hiring Manager</option>
                <option value="INTERVIEWER">Interviewer</option>
                <option value="CONTACT">General Contact</option>
              </select>

              <button
                type="submit"
                disabled={!selectedPersonId || addContactMutation.isPending}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Link Contact</span>
              </button>
            </form>

            {/* Linked Contacts Roster */}
            <div className="space-y-2">
              {application.contacts && application.contacts.length > 0 ? (
                application.contacts.map((c) => {
                  const roleCfg = CONTACT_ROLE_CONFIG[c.relationship_role] || CONTACT_ROLE_CONFIG.CONTACT;
                  return (
                    <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900">{c.person_name}</h5>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${roleCfg.bg} ${roleCfg.text}`}>
                          {roleCfg.label}
                        </span>
                      </div>

                      <button
                        onClick={() => removeContactMutation.mutate({ appId: application.id, contactId: c.id })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Remove Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No linked referral contacts for this application.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'followups' && (
          <div className="space-y-4">
            <button
              onClick={() => setAddFollowUpModalOpen(true)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule New Follow-up</span>
            </button>

            <div className="space-y-2">
              {application.follow_ups && application.follow_ups.length > 0 ? (
                application.follow_ups.map((f) => (
                  <div key={f.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${f.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {f.title}
                      </span>
                      <button
                        onClick={() => completeFollowUpMutation.mutate({ id: f.id, completed: !f.completed })}
                        className={`p-1 rounded-md transition-colors ${
                          f.completed ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-teal-600'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                    {f.description && <p className="text-slate-600 text-[11px]">{f.description}</p>}
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(f.due_date).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No follow-ups scheduled yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Application Timeline
            </h4>

            {application.status_events && application.status_events.length > 0 ? (
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 pl-4 py-1">
                {application.status_events.map((evt) => {
                  const toCfg = getAppStatusConfig(evt.to_status);
                  return (
                    <div key={evt.id} className="relative group">
                      <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${toCfg.bgClass} ${toCfg.textClass} ${toCfg.borderClass}`}>
                            {toCfg.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(evt.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {evt.note && <p className="text-slate-700 italic pt-1">{evt.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No history events recorded yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt Status Note Modal */}
      {showStatusModal && targetStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Stage to "{getAppStatusConfig(targetStatus).label}"
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Log Note (Optional)
              </label>
              <textarea
                value={statusNoteInput}
                onChange={(e) => setStatusNoteInput(e.target.value)}
                placeholder="e.g. Scheduled interview with engineering manager..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                disabled={updateStatusMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
