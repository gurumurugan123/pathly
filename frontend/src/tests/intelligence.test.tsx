import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { InsightFloatingPill } from '../components/intelligence/InsightFloatingPill';
import { HeaderNotificationCenter } from '../components/intelligence/HeaderNotificationCenter';
import { InsightSheet } from '../components/intelligence/InsightSheet';
import { GraphModeToolbar } from '../components/graph/GraphModeToolbar';
import { useUIStore } from '../stores/uiStore';

vi.mock('../services/intelligence', async () => {
  const actual = await vi.importActual('../services/intelligence');
  return {
    ...actual,
    fetchRecommendations: vi.fn().mockResolvedValue([
      {
        id: 1,
        type: 'REFERRAL_OPPORTUNITY',
        priority: 'HIGH',
        title: 'Referral Opportunity at Zoho',
        description: 'You have active applications and 2 contacts at Zoho.',
        reason: '- Active application for Backend Engineer\n- 2 contacts at Zoho\n- No referral linked',
        entity_type: 'application',
        entity_id: 10,
        deduplication_key: 'referral_opp_10',
        metadata: {},
        status: 'NEW',
        created_at: new Date().toISOString(),
      },
    ]),
    fetchNotifications: vi.fn().mockResolvedValue({
      unread_count: 2,
      notifications: [
        {
          id: 1,
          title: 'Referral alert',
          message: 'Contact Suresh at Zoho',
          is_read: false,
          entity_type: 'person',
          entity_id: 5,
          created_at: new Date().toISOString(),
        },
      ],
    }),
    fetchGraphOverlay: vi.fn().mockResolvedValue({
      mode: 'REFERRAL_OPPORTUNITIES',
      emphasized_node_ids: ['person-5', 'company-1'],
      metadata: {},
    }),
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

describe('JobGraph Phase 4 - Intelligence & Recommendations Frontend Tests', () => {
  beforeEach(() => {
    useUIStore.setState({
      graphMode: 'NORMAL',
      isNotificationCenterOpen: false,
      isInsightSheetOpen: false,
      highlightedNodeIds: [],
    });
    vi.clearAllMocks();
  });

  it('renders InsightFloatingPill with active count and opens InsightSheet when clicked', async () => {
    renderWithQueryClient(<InsightFloatingPill />);

    await waitFor(() => {
      expect(screen.getByText(/1 things need attention/i)).toBeTruthy();
    });

    const pillBtn = screen.getByRole('button');
    fireEvent.click(pillBtn);

    expect(useUIStore.getState().isInsightSheetOpen).toBe(true);
  });

  it('renders HeaderNotificationCenter badge and popover panel', async () => {
    renderWithQueryClient(<HeaderNotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy();
    });

    const bellBtn = screen.getByTitle('Notifications');
    fireEvent.click(bellBtn);

    expect(screen.getByText(/Referral alert/i)).toBeTruthy();
    expect(screen.getByText(/Contact Suresh at Zoho/i)).toBeTruthy();
  });

  it('renders InsightSheet recommendations with explainable reasons', async () => {
    act(() => {
      useUIStore.setState({ isInsightSheetOpen: true });
    });

    renderWithQueryClient(<InsightSheet />);

    await waitFor(() => {
      expect(screen.getByText(/Needs Attention/i)).toBeTruthy();
      expect(screen.getByText(/Referral Opportunity at Zoho/i)).toBeTruthy();
    });

    const dataBtn = screen.getByText(/View Data/i);
    fireEvent.click(dataBtn);

    expect(screen.getByText(/Active application for Backend Engineer/i)).toBeTruthy();
  });

  it('updates graph mode in store when GraphModeToolbar item is clicked', async () => {
    renderWithQueryClient(<GraphModeToolbar />);

    const triggerBtn = screen.getByRole('button', { name: /Mode:/i });
    fireEvent.click(triggerBtn);

    const modeBtn = screen.getByRole('button', { name: /Referral Opportunities/i });
    fireEvent.click(modeBtn);

    await waitFor(() => {
      expect(useUIStore.getState().graphMode).toBe('REFERRAL_OPPORTUNITIES');
    });
  });
});
