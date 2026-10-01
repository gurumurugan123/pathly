import { create } from 'zustand';
import type { AIQueryResponse } from '../services/ai';

export type GraphMode =
  | 'NORMAL'
  | 'RELATIONSHIP_STRENGTH'
  | 'REFERRAL_OPPORTUNITIES'
  | 'APPLICATION_FOCUS'
  | 'FOLLOW_UPS'
  | 'COMPANY_COVERAGE';

interface UIState {
  selectedNodeId: string | null;
  selectedNodeType: 'person' | 'company' | 'user' | 'application' | null;
  selectedEntityId: number | null;

  focusedApplicationId: number | null;
  focusedCompanyId: number | null;
  focusedContactIds: number[];

  highlightedNodeIds: string[];
  graphMode: GraphMode;
  isAIAssistantOpen: boolean;
  isAICommandPaletteOpen: boolean;
  isNotificationCenterOpen: boolean;
  isInsightSheetOpen: boolean;
  isDailyBriefOpen: boolean;
  aiQueryResult: AIQueryResponse | null;

  searchQuery: string;
  statusFilter: string;
  showLabels: boolean;

  isAddPersonModalOpen: boolean;
  isAddCompanyModalOpen: boolean;
  isAddApplicationModalOpen: boolean;
  isAddFollowUpModalOpen: boolean;

  setSelectedNode: (nodeId: string | null, nodeType?: 'person' | 'company' | 'user' | 'application' | null, entityId?: number | null) => void;
  clearSelectedNode: () => void;

  setFocusedApplication: (appId: number | null, companyId?: number | null, contactIds?: number[]) => void;
  clearFocusedApplication: () => void;
  focusCompany: (companyId: number) => void;
  focusPerson: (personId: number) => void;

  setHighlightedNodeIds: (ids: string[]) => void;
  setGraphMode: (mode: GraphMode) => void;
  clearGraphFocus: () => void;

  setAIAssistantOpen: (open: boolean) => void;
  setAICommandPaletteOpen: (open: boolean) => void;
  toggleAICommandPalette: () => void;
  setNotificationCenterOpen: (open: boolean) => void;
  setInsightSheetOpen: (open: boolean) => void;
  setDailyBriefOpen: (open: boolean) => void;
  toggleDailyBrief: () => void;
  setAIQueryResult: (result: AIQueryResponse | null) => void;

  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
  toggleLabels: () => void;

  setAddPersonModalOpen: (open: boolean) => void;
  setAddCompanyModalOpen: (open: boolean) => void;
  setAddApplicationModalOpen: (open: boolean) => void;
  setAddFollowUpModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  selectedNodeType: null,
  selectedEntityId: null,

  focusedApplicationId: null,
  focusedCompanyId: null,
  focusedContactIds: [],

  highlightedNodeIds: [],
  graphMode: 'NORMAL',
  isAIAssistantOpen: false,
  isAICommandPaletteOpen: false,
  isNotificationCenterOpen: false,
  isInsightSheetOpen: false,
  isDailyBriefOpen: false,
  aiQueryResult: null,

  searchQuery: '',
  statusFilter: 'ALL',
  showLabels: true,

  isAddPersonModalOpen: false,
  isAddCompanyModalOpen: false,
  isAddApplicationModalOpen: false,
  isAddFollowUpModalOpen: false,

  setSelectedNode: (nodeId, nodeType = null, entityId = null) =>
    set({ selectedNodeId: nodeId, selectedNodeType: nodeType, selectedEntityId: entityId }),

  clearSelectedNode: () =>
    set({ selectedNodeId: null, selectedNodeType: null, selectedEntityId: null }),

  setFocusedApplication: (appId, companyId = null, contactIds = []) =>
    set({
      focusedApplicationId: appId,
      focusedCompanyId: companyId,
      focusedContactIds: contactIds,
    }),

  clearFocusedApplication: () =>
    set({
      focusedApplicationId: null,
      focusedCompanyId: null,
      focusedContactIds: [],
    }),

  focusCompany: (companyId: number) =>
    set({
      selectedNodeId: `company-${companyId}`,
      selectedNodeType: 'company',
      selectedEntityId: companyId,
      focusedCompanyId: companyId,
      highlightedNodeIds: [`company-${companyId}`],
    }),

  focusPerson: (personId: number) =>
    set({
      selectedNodeId: `person-${personId}`,
      selectedNodeType: 'person',
      selectedEntityId: personId,
      focusedContactIds: [personId],
      highlightedNodeIds: [`person-${personId}`],
    }),

  setHighlightedNodeIds: (ids: string[]) => set({ highlightedNodeIds: ids }),
  setGraphMode: (mode: GraphMode) => set({ graphMode: mode }),

  clearGraphFocus: () =>
    set({
      focusedApplicationId: null,
      focusedCompanyId: null,
      focusedContactIds: [],
      highlightedNodeIds: [],
      graphMode: 'NORMAL',
    }),

  setAIAssistantOpen: (open: boolean) => set({ isAIAssistantOpen: open }),
  setAICommandPaletteOpen: (open: boolean) => set({ isAICommandPaletteOpen: open }),
  toggleAICommandPalette: () => set((state) => ({ isAICommandPaletteOpen: !state.isAICommandPaletteOpen })),
  setNotificationCenterOpen: (open: boolean) => set({ isNotificationCenterOpen: open }),
  setInsightSheetOpen: (open: boolean) => set({ isInsightSheetOpen: open }),
  setDailyBriefOpen: (open: boolean) => set({ isDailyBriefOpen: open }),
  toggleDailyBrief: () => set((state) => ({ isDailyBriefOpen: !state.isDailyBriefOpen })),
  setAIQueryResult: (result: AIQueryResponse | null) => set({ aiQueryResult: result }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),

  setAddPersonModalOpen: (open) => set({ isAddPersonModalOpen: open }),
  setAddCompanyModalOpen: (open) => set({ isAddCompanyModalOpen: open }),
  setAddApplicationModalOpen: (open) => set({ isAddApplicationModalOpen: open }),
  setAddFollowUpModalOpen: (open) => set({ isAddFollowUpModalOpen: open }),
}));
