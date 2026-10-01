import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReactFlowProvider } from '@xyflow/react';
import { fetchGraphData } from '../services/graph';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { AICommandPalette } from '../components/ai/AICommandPalette';
import { AIAssistantDrawer } from '../components/ai/AIAssistantDrawer';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { PersonDetailsPanel } from '../components/panels/PersonDetailsPanel';
import { CompanyDetailsPanel } from '../components/panels/CompanyDetailsPanel';
import { ApplicationDetailsPanel } from '../components/panels/ApplicationDetailsPanel';
import { CompactBottomPanel } from '../components/dashboard/CompactBottomPanel';
import { AddPersonModal } from '../components/modals/AddPersonModal';
import { AddCompanyModal } from '../components/modals/AddCompanyModal';
import { AddApplicationModal } from '../components/modals/AddApplicationModal';
import { AddFollowUpModal } from '../components/modals/AddFollowUpModal';
import { GraphModeToolbar } from '../components/graph/GraphModeToolbar';
import { DailyCareerBriefModal } from '../components/intelligence/DailyCareerBriefModal';
import { InsightSheet } from '../components/intelligence/InsightSheet';
import { useUIStore } from '../stores/uiStore';

interface DashboardPageProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ activePage = 'dashboard', onNavigate }) => {
  const selectedNodeType = useUIStore((state) => state.selectedNodeType);
  const selectedEntityId = useUIStore((state) => state.selectedEntityId);
  const clearSelectedNode = useUIStore((state) => state.clearSelectedNode);

  const isAddPersonModalOpen = useUIStore((state) => state.isAddPersonModalOpen);
  const setAddPersonModalOpen = useUIStore((state) => state.setAddPersonModalOpen);

  const isAddCompanyModalOpen = useUIStore((state) => state.isAddCompanyModalOpen);
  const setAddCompanyModalOpen = useUIStore((state) => state.setAddCompanyModalOpen);

  const isAddApplicationModalOpen = useUIStore((state) => state.isAddApplicationModalOpen);
  const setAddApplicationModalOpen = useUIStore((state) => state.setAddApplicationModalOpen);

  const isAddFollowUpModalOpen = useUIStore((state) => state.isAddFollowUpModalOpen);
  const setAddFollowUpModalOpen = useUIStore((state) => state.setAddFollowUpModalOpen);

  const { data: graphResponse, isLoading, isError, error } = useQuery({
    queryKey: ['graph'],
    queryFn: fetchGraphData,
    refetchOnWindowFocus: false,
  });

  const nodes = graphResponse?.nodes || [];
  const edges = graphResponse?.edges || [];
  const stats = graphResponse?.stats || {
    totalPeople: 0,
    resumeAccepted: 0,
    replied: 0,
    willRefer: 0,
    referralGiven: 0,
    contactFound: 0,
    contacted: 0,
    resumeSent: 0,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <Header stats={stats} />

        <div className="flex-1 flex relative overflow-hidden flex-col justify-between mt-2">
          <div className="flex-1 flex relative overflow-hidden">
            {/* Floating Graph Mode Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <GraphModeToolbar />
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-3" />
                <span className="text-xs font-semibold">Building your referral network graph...</span>
              </div>
            ) : isError ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-rose-600 p-6">
                <p className="font-bold text-sm">Failed to load graph data</p>
                <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Check connection'}</p>
              </div>
            ) : (
              <ReactFlowProvider>
                <GraphCanvas initialNodes={nodes} initialEdges={edges} />
              </ReactFlowProvider>
            )}

            {/* Contextual Right Details Panel */}
            {selectedNodeType === 'person' && selectedEntityId && (
              <PersonDetailsPanel personId={selectedEntityId} onClose={clearSelectedNode} />
            )}

            {selectedNodeType === 'company' && selectedEntityId && (
              <CompanyDetailsPanel companyId={selectedEntityId} onClose={clearSelectedNode} />
            )}

            {selectedNodeType === 'application' && selectedEntityId && (
              <ApplicationDetailsPanel applicationId={selectedEntityId} onClose={clearSelectedNode} />
            )}
          </div>

          {/* Compact Bottom Summary Panel */}
          <CompactBottomPanel />
        </div>
      </div>

      {/* Phase 4 Contextual Intelligence Modals & Sheets */}
      <DailyCareerBriefModal />
      <InsightSheet />

      {/* AI Spotlight Command Palette & Assistant Drawer */}
      <AICommandPalette />
      <AIAssistantDrawer />

      {/* Modals */}
      <AddPersonModal isOpen={isAddPersonModalOpen} onClose={() => setAddPersonModalOpen(false)} />
      <AddCompanyModal isOpen={isAddCompanyModalOpen} onClose={() => setAddCompanyModalOpen(false)} />
      <AddApplicationModal isOpen={isAddApplicationModalOpen} onClose={() => setAddApplicationModalOpen(false)} />
      <AddFollowUpModal isOpen={isAddFollowUpModalOpen} onClose={() => setAddFollowUpModalOpen(false)} />
    </div>
  );
};
