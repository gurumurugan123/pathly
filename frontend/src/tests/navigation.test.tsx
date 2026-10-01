import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CompaniesPage } from '../pages/CompaniesPage';
import { PeoplePage } from '../pages/PeoplePage';
import { SettingsPage } from '../pages/SettingsPage';
import { Sidebar } from '../components/layout/Sidebar';

vi.mock('../services/companies', () => ({
  fetchCompanies: vi.fn().mockResolvedValue([
    {
      id: 101,
      name: 'Zoho Corporation',
      website: 'zoho.com',
      industry: 'Software',
      location: 'Chennai',
      people_count: 5,
      applications_count: 2,
      referral_contacts_count: 2,
      last_activity: '2026-09-30T10:00:00Z',
      has_referral: true,
      has_contacts: true,
    },
  ]),
  fetchCompanyStats: vi.fn().mockResolvedValue({
    total_companies: 12,
    active_applications: 5,
    people_connected: 34,
    referral_opportunities: 3,
  }),
  createCompany: vi.fn().mockResolvedValue({ id: 102, name: 'TCS' }),
  deleteCompany: vi.fn().mockResolvedValue({ message: 'Deleted' }),
  updateCompany: vi.fn().mockResolvedValue({ id: 101, name: 'Zoho' }),
}));

vi.mock('../services/people', () => ({
  fetchPeople: vi.fn().mockResolvedValue([
    {
      id: 201,
      name: 'Arun Prakash',
      designation: 'Principal Architect',
      email: 'arun@zoho.com',
      company_detail: { id: 101, name: 'Zoho Corporation' },
      current_status: 'WILLING_TO_REFER',
      connection_type: 'PRIMARY',
      applications_count: 1,
      last_activity: '2026-09-30T11:00:00Z',
    },
  ]),
  fetchPeopleStats: vi.fn().mockResolvedValue({
    total_people: 34,
    replied: 12,
    will_refer: 8,
    referral_given: 4,
  }),
  createPerson: vi.fn().mockResolvedValue({ id: 202, name: 'Ramesh' }),
  deletePerson: vi.fn().mockResolvedValue({ message: 'Deleted' }),
  updatePerson: vi.fn().mockResolvedValue({ id: 201, name: 'Arun' }),
}));

vi.mock('../services/settings', () => ({
  fetchUserSettings: vi.fn().mockResolvedValue({
    theme: 'dark',
    notify_recommendations: true,
    notify_followups: true,
    notify_applications: true,
    notify_interviews: true,
    notify_goals: true,
  }),
  updateUserSettings: vi.fn().mockResolvedValue({ theme: 'dark' }),
  updateUserProfile: vi.fn().mockResolvedValue({ username: 'testuser' }),
  changePassword: vi.fn().mockResolvedValue({ message: 'Success' }),
  deleteAccount: vi.fn().mockResolvedValue({ message: 'Deleted' }),
  exportUserData: vi.fn().mockResolvedValue({ user: {}, companies: [] }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithRouter = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('JobGraph Navigation & Workspaces', () => {
  it('renders Companies page with KPI cards and list', async () => {
    renderWithRouter(<CompaniesPage />);

    expect(screen.getByRole('heading', { name: /Companies/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Zoho Corporation/i)).toBeTruthy();
      expect(screen.getByText(/zoho.com/i)).toBeTruthy();
    });
  });

  it('renders People Network page with KPI cards and roster', async () => {
    renderWithRouter(<PeoplePage />);

    expect(screen.getByRole('heading', { name: /People Network/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/Arun Prakash/i)).toBeTruthy();
      expect(screen.getByText(/Principal Architect/i)).toBeTruthy();
    });
  });

  it('renders Settings page and switches tabs correctly', async () => {
    renderWithRouter(<SettingsPage />);

    expect(screen.getByText(/Profile Details/i)).toBeTruthy();

    const notifTab = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(notifTab);

    expect(screen.getByText(/Notification Preferences/i)).toBeTruthy();
  });

  it('renders Sidebar with active route highlight', () => {
    renderWithRouter(<Sidebar activePage="companies" />);

    // The new Pathly sidebar uses inline styles with a gradient for the active state
    // Check that the active button has a gradient background style applied
    const compBtn = screen.getByRole('button', { name: /Companies/i });
    expect(compBtn).toBeTruthy();
    // The active item should have a background linear-gradient applied inline
    const style = compBtn.getAttribute('style') || '';
    expect(style.includes('linear-gradient') || compBtn.getAttribute('data-active') === 'true' || compBtn.className.includes('active')).toBeTruthy();
  });
});
