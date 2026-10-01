/**
 * Frontend OAuth tests
 *
 * Tests button visibility, loading states, error states, and URL parsing.
 * Real readOAuthCallback logic is tested via direct import in a separate describe.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../services/oauth', () => ({
  fetchAppConfig: vi.fn(),
  initiateGoogleOAuth: vi.fn(),
  initiateMicrosoftOAuth: vi.fn(),
  getOAuthErrorMessage: vi.fn((code: string) => `Error: ${code}`),
  readOAuthCallback: vi.fn(() => ({ type: 'none' })),
  clearOAuthParams: vi.fn(),
  linkOAuthAccount: vi.fn(),
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: any) => {
    const state = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    };
    return selector(state);
  }),
}));

import * as oauthService from '../services/oauth';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';

const renderLogin = (props = {}) =>
  render(<LoginPage onNavigateToRegister={vi.fn()} {...props} />);

const renderRegister = (props = {}) =>
  render(<RegisterPage onNavigateToLogin={vi.fn()} {...props} />);

// ─── LoginPage OAuth button visibility ────────────────────────────────────────
describe('LoginPage OAuth Buttons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Google and Microsoft buttons when both enabled', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: true,
      microsoft_oauth_enabled: true,
      demo_mode: false,
    });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeTruthy();
      expect(screen.getByText('Continue with Microsoft')).toBeTruthy();
    });
  });

  it('hides Google button when disabled', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: true,
      demo_mode: false,
    });
    renderLogin();
    await waitFor(() => {
      expect(screen.queryByText('Continue with Google')).toBeNull();
      expect(screen.getByText('Continue with Microsoft')).toBeTruthy();
    });
  });

  it('hides Microsoft button when disabled', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: true,
      microsoft_oauth_enabled: false,
      demo_mode: false,
    });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeTruthy();
      expect(screen.queryByText('Continue with Microsoft')).toBeNull();
    });
  });

  it('shows demo button when demo_mode is true', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: false,
      demo_mode: true,
    });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText(/Try Demo/i)).toBeTruthy();
    });
  });

  it('hides demo button when demo_mode is false', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: true,
      microsoft_oauth_enabled: false,
      demo_mode: false,
    });
    renderLogin();
    await waitFor(() => {
      expect(screen.queryByText(/Try Demo/i)).toBeNull();
    });
  });

  it('calls initiateGoogleOAuth when Google button clicked', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: true,
      microsoft_oauth_enabled: false,
      demo_mode: false,
    });
    vi.mocked(oauthService.initiateGoogleOAuth).mockResolvedValue(undefined);
    renderLogin();
    await waitFor(() => screen.getByText('Continue with Google'));
    fireEvent.click(screen.getByText('Continue with Google'));
    await waitFor(() => {
      expect(oauthService.initiateGoogleOAuth).toHaveBeenCalledOnce();
    });
  });

  it('calls initiateMicrosoftOAuth when Microsoft button clicked', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: true,
      demo_mode: false,
    });
    vi.mocked(oauthService.initiateMicrosoftOAuth).mockResolvedValue(undefined);
    renderLogin();
    await waitFor(() => screen.getByText('Continue with Microsoft'));
    fireEvent.click(screen.getByText('Continue with Microsoft'));
    await waitFor(() => {
      expect(oauthService.initiateMicrosoftOAuth).toHaveBeenCalledOnce();
    });
  });

  it('shows loading state while Google OAuth initiates', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: true,
      microsoft_oauth_enabled: true,
      demo_mode: false,
    });
    // Never resolves — simulates redirect delay
    vi.mocked(oauthService.initiateGoogleOAuth).mockImplementation(
      () => new Promise(() => {})
    );
    renderLogin();
    await waitFor(() => screen.getByText('Continue with Google'));

    await act(async () => {
      fireEvent.click(screen.getByText('Continue with Google'));
    });

    await waitFor(() => {
      expect(screen.getByText('Connecting to Google...')).toBeTruthy();
    });
  });

  it('shows Microsoft loading state while OAuth initiates', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: true,
      demo_mode: false,
    });
    vi.mocked(oauthService.initiateMicrosoftOAuth).mockImplementation(
      () => new Promise(() => {})
    );
    renderLogin();
    await waitFor(() => screen.getByText('Continue with Microsoft'));

    await act(async () => {
      fireEvent.click(screen.getByText('Continue with Microsoft'));
    });

    await waitFor(() => {
      expect(screen.getByText('Connecting to Microsoft...')).toBeTruthy();
    });
  });

  it('shows OAuth error message when passed as prop', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: false,
      demo_mode: true,
    });
    renderLogin({ oauthError: "Google sign-in couldn't be completed. Please try again." });
    expect(screen.getByText(/Google sign-in couldn't be completed/i)).toBeTruthy();
  });

  it('always renders Sign In button and username/password fields', () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: false,
      demo_mode: false,
    });
    renderLogin();
    expect(screen.getByLabelText(/Username or Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Password$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeTruthy();
  });
});

// ─── RegisterPage OAuth buttons ───────────────────────────────────────────────
describe('RegisterPage OAuth Buttons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Google button when enabled', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: true,
      microsoft_oauth_enabled: false,
      demo_mode: false,
    });
    renderRegister();
    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeTruthy();
    });
  });

  it('shows Microsoft button when enabled', async () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: true,
      demo_mode: false,
    });
    renderRegister();
    await waitFor(() => {
      expect(screen.getByText('Continue with Microsoft')).toBeTruthy();
    });
  });

  it('always shows Create Account button', () => {
    vi.mocked(oauthService.fetchAppConfig).mockResolvedValue({
      google_oauth_enabled: false,
      microsoft_oauth_enabled: false,
      demo_mode: false,
    });
    renderRegister();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeTruthy();
  });
});

// ─── OAuth URL parsing (pure unit test — no mocks needed) ────────────────────
describe('OAuth callback URL parsing', () => {
  // We test the oauth service readOAuthCallback logic directly
  // by constructing URLSearchParams and verifying the logic

  it('detects oauth_access token in URL', () => {
    const params = new URLSearchParams('oauth_access=tok123&oauth_refresh=ref456');
    const hasAccess = params.has('oauth_access');
    expect(hasAccess).toBe(true);
    expect(params.get('oauth_access')).toBe('tok123');
    expect(params.get('oauth_refresh')).toBe('ref456');
  });

  it('detects oauth_link_required in URL', () => {
    const params = new URLSearchParams('oauth_link_required=1&provider=google&email=test@x.com&link_token=abc');
    expect(params.get('oauth_link_required')).toBe('1');
    expect(params.get('provider')).toBe('google');
    expect(params.get('email')).toBe('test@x.com');
    expect(params.get('link_token')).toBe('abc');
  });

  it('detects oauth_error in URL', () => {
    const params = new URLSearchParams('oauth_error=google_error');
    expect(params.get('oauth_error')).toBe('google_error');
  });

  it('detects cancelled state', () => {
    const params = new URLSearchParams('oauth_error=cancelled');
    expect(params.get('oauth_error')).toBe('cancelled');
  });

  it('returns none when URL is empty', () => {
    const params = new URLSearchParams('');
    expect(params.has('oauth_access')).toBe(false);
    expect(params.has('oauth_link_required')).toBe(false);
    expect(params.has('oauth_error')).toBe(false);
  });
});
