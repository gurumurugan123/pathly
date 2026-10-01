import React, { useState } from 'react';
import { Briefcase, Calendar, CheckCircle2, ChevronRight, Focus, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApplications } from '../../services/applications';
import { fetchFollowUps, updateFollowUp } from '../../services/followups';
import { getAppStatusConfig } from '../../config/appStatuses';
import { useUIStore } from '../../stores/uiStore';

export const CompactBottomPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'applications' | 'followups'>('applications');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const setSelectedNode = useUIStore((state) => state.setSelectedNode);
  const setFocusedApplication = useUIStore((state) => state.setFocusedApplication);
  const setAddApplicationModalOpen = useUIStore((state) => state.setAddApplicationModalOpen);
  const setAddFollowUpModalOpen = useUIStore((state) => state.setAddFollowUpModalOpen);

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
  });

  const { data: followups } = useQuery({
    queryKey: ['followups'],
    queryFn: () => fetchFollowUps('upcoming', false),
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateFollowUp(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  const activeApps = (applications || []).filter(
    (app) => !['REJECTED', 'WITHDRAWN', 'CLOSED'].includes(app.current_status)
  );

  return (
    <div className="bg-white border-t border-slate-200 shadow-md z-20 transition-all duration-300 flex flex-col">
      <div className="px-6 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <button
            onClick={() => { setActiveTab('applications'); setIsCollapsed(false); }}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
              activeTab === 'applications' && !isCollapsed
                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Active Applications ({activeApps.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('followups'); setIsCollapsed(false); }}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
              activeTab === 'followups' && !isCollapsed
                ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming Follow-ups ({followups?.length || 0})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'applications' ? (
            <button
              onClick={() => setAddApplicationModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
            >
              <Plus className="w-3 h-3" />
              <span>New App</span>
            </button>
          ) : (
            <button
              onClick={() => setAddFollowUpModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
            >
              <Plus className="w-3 h-3" />
              <span>New Reminder</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-md"
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 max-h-48 overflow-y-auto bg-white">
          {activeTab === 'applications' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeApps.length > 0 ? (
                activeApps.map((app) => {
                  const statusCfg = getAppStatusConfig(app.current_status);
                  const contactIds = (app.contacts || []).map((c) => c.person);
                  return (
                    <div
                      key={app.id}
                      className="p-3 bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-blue-400 rounded-xl transition-all shadow-2xs space-y-1.5 group flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs truncate max-w-[170px]">
                            {app.job_title}
                          </h5>
                          <span className="text-[11px] text-blue-600 font-semibold block truncate">
                            {app.company_name}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bgClass} ${statusCfg.textClass} ${statusCfg.borderClass}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-500 truncate">
                          {app.primary_contact_name ? `Contact: ${app.primary_contact_name}` : 'No referral link'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setFocusedApplication(app.id, app.company_id, contactIds)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                            title="Focus on Graph"
                          >
                            <Focus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedNode(`application-${app.id}`, 'application', app.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                            title="Open Application Drawer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-4 text-xs text-slate-400">
                  No active job applications. Click "+ New App" to start tracking.
                </div>
              )}
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="space-y-2">
              {followups && followups.length > 0 ? (
                followups.map((f) => (
                  <div key={f.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => completeFollowUpMutation.mutate({ id: f.id, completed: true })}
                        className="text-slate-400 hover:text-teal-600"
                        title="Mark Completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{f.title}</span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {f.company_name ? `${f.company_name} • ` : ''}
                          Due: {new Date(f.due_date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">
                      Pending
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  No upcoming follow-ups scheduled.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
