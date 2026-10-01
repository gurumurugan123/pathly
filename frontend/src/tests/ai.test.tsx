import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AICommandPalette } from '../components/ai/AICommandPalette';
import { AIAssistantDrawer } from '../components/ai/AIAssistantDrawer';
import { PersonDetailsPanel } from '../components/panels/PersonDetailsPanel';
import { useUIStore } from '../stores/uiStore';
import * as aiServices from '../services/ai';

vi.mock('../services/ai');
vi.mock('../services/people', () => {
  const personMock = {
    id: 5,
    name: 'Suresh Kumar',
    designation: 'Senior Engineer',
    company_name: 'Zoho',
    email: 'suresh@zoho.com',
    current_status: 'WILLING_TO_REFER',
    notes: [],
  };
  return {
    fetchPersonDetail: vi.fn().mockResolvedValue(personMock),
    fetchPersonDetails: vi.fn().mockResolvedValue(personMock),
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('JobGraph Phase 3 - AI & UX Frontend Tests', () => {
  beforeEach(() => {
    // Reset UI Store state
    useUIStore.setState({
      isAICommandPaletteOpen: false,
      isAIAssistantOpen: false,
      highlightedNodeIds: [],
      aiQueryResult: null,
      selectedNodeId: null,
      selectedNodeType: null,
    });
    vi.clearAllMocks();
  });

  it('toggles Command Palette with Cmd+K and closes with Escape', () => {
    renderWithQueryClient(<AICommandPalette />);

    // Initially palette modal is closed
    expect(screen.queryByPlaceholderText(/Ask Pathly AI anything/i)).toBeNull();

    // Trigger Cmd+K
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(useUIStore.getState().isAICommandPaletteOpen).toBe(true);
    expect(screen.getByPlaceholderText(/Ask Pathly AI anything/i)).toBeTruthy();

    // Trigger Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUIStore.getState().isAICommandPaletteOpen).toBe(false);
  });

  it('updates graph highlighting upon AI response', async () => {
    const mockQueryResult: aiServices.AIQueryResponse = {
      query: 'Show people from Zoho',
      interpretation: 'Finding people at Zoho',
      text: 'Found 2 people at Zoho',
      selectedPeople: ['person-5'],
      selectedCompanies: ['company-1'],
      selectedApplications: [],
      pendingMutation: null,
    };

    vi.spyOn(aiServices, 'postAIQuery').mockResolvedValueOnce(mockQueryResult);

    renderWithQueryClient(<AICommandPalette />);

    act(() => {
      useUIStore.setState({ isAICommandPaletteOpen: true });
    });

    const input = screen.getByPlaceholderText(/Ask Pathly AI anything/i);
    fireEvent.change(input, { target: { value: 'Show people from Zoho' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(useUIStore.getState().highlightedNodeIds).toEqual(
        expect.arrayContaining(['person-5', 'company-1'])
      );
      expect(useUIStore.getState().isAICommandPaletteOpen).toBe(false);
    });
  });

  it('renders pending mutation confirmation dialog and executes upon confirm', async () => {
    const mockQueryResult: aiServices.AIQueryResponse = {
      query: 'Mark Suresh as willing to refer me',
      interpretation: 'Prepare status update for Suresh',
      text: 'Confirmation required before updating relationship.',
      selectedPeople: [],
      selectedCompanies: [],
      selectedApplications: [],
      pendingMutation: {
        action: 'update_relationship_status',
        params: { person_id: 5, new_status: 'WILL_REFER' },
        summary: {
          entity_type: 'person',
          entity_name: 'Suresh Kumar',
          company_name: 'Zoho',
          current_status: 'Contacted',
          new_status: 'Will Refer',
        },
      },
    };

    act(() => {
      useUIStore.setState({
        isAIAssistantOpen: true,
        aiQueryResult: mockQueryResult,
      });
    });

    vi.spyOn(aiServices, 'executeAIMutation').mockResolvedValueOnce({
      success: true,
      message: 'Relationship updated successfully',
      entity: { id: 5 },
    });

    renderWithQueryClient(<AIAssistantDrawer />);

    expect(screen.getByText(/Mutation Confirmation Required/i)).toBeTruthy();
    expect(screen.getByText(/Suresh Kumar/i)).toBeTruthy();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Action/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(aiServices.executeAIMutation).toHaveBeenCalledWith(
        'update_relationship_status',
        { person_id: 5, new_status: 'WILL_REFER' }
      );
    });
  });

  it('renders Contextual Sheet when an entity is selected', async () => {
    renderWithQueryClient(<PersonDetailsPanel personId={5} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Suresh Kumar/i)).toBeTruthy();
      expect(screen.getByText(/Senior Engineer/i)).toBeTruthy();
    });
  });
});
