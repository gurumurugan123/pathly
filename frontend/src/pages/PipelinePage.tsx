import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApplications, updateApplicationStatus } from '../services/applications';
import { Sidebar } from '../components/layout/Sidebar';
import { ApplicationDetailsPanel } from '../components/panels/ApplicationDetailsPanel';
import { AddApplicationModal } from '../components/modals/AddApplicationModal';
import { AddPersonModal } from '../components/modals/AddPersonModal';
import { AddCompanyModal } from '../components/modals/AddCompanyModal';
import { AddFollowUpModal } from '../components/modals/AddFollowUpModal';
import { AICommandPalette } from '../components/ai/AICommandPalette';
import { AIAssistantDrawer } from '../components/ai/AIAssistantDrawer';
import { APPLICATION_STATUS_CONFIG } from '../config/appStatuses';
import { Plus, UserCheck, ExternalLink } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

interface PipelinePageProps {
  onNavigate?: (page: string) => void;
}

export const PipelinePage: React.FC<PipelinePageProps> = ({ onNavigate }) => {
  const queryClient = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);

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

  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: number; status: string }) =>
      updateApplicationStatus(appId, status, 'Moved in Kanban pipeline'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const columns = APPLICATION_STATUS_CONFIG.slice(0, 8);

  const handleDragStart = (e: React.DragEvent, appId: number) => {
    e.dataTransfer.setData('text/plain', String(appId));
    setDraggedAppId(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const appIdStr = e.dataTransfer.getData('text/plain');
    const appId = appIdStr ? Number(appIdStr) : draggedAppId;
    if (appId) {
      updateStatusMutation.mutate({ appId, status: targetStatus });
    }
    setDraggedAppId(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar activePage="pipeline" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-2xs">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Job Application Pipeline</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Drag and drop applications across referral and interview stages
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

        <div className="flex-1 overflow-x-auto p-6 flex gap-4 bg-slate-100 items-start">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Loading pipeline...
            </div>
          ) : (
            columns.map((col) => {
              const columnApps = (applications || []).filter((app) => app.current_status === col.key);
              return (
                <div
                  key={col.key}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className="w-72 flex-shrink-0 bg-slate-200/60 rounded-2xl p-3 flex flex-col max-h-full border border-slate-300/60 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300/80 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <h3 className="font-bold text-slate-800 text-xs">{col.label}</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full shadow-2xs">
                      {columnApps.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[150px]">
                    {columnApps.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => setSelectedAppId(app.id)}
                        className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl p-3 shadow-2xs cursor-grab active:cursor-grabbing transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors leading-tight">
                              {app.job_title}
                            </h4>
                            <span className="text-[11px] text-blue-600 font-semibold block mt-0.5">
                              {app.company_name}
                            </span>
                          </div>
                          {app.job_url && (
                            <a
                              href={app.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {app.primary_contact_name && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                            <span className="truncate">{app.primary_contact_name}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Updated: {new Date(app.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}

                    {columnApps.length === 0 && (
                      <div className="text-center py-8 text-[11px] text-slate-400 italic border-2 border-dashed border-slate-300 rounded-xl">
                        Drop application here
                      </div>
                    )}
                  </div>
                </div>
              );
            })
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
