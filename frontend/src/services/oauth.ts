/**
 * Pathly OAuth Service
 *
 * Handles:
 * 1. Fetching app config (is Google/Microsoft enabled? is demo mode on?)
 * 2. Initiating OAuth flows (redirects browser to provider)
 * 3. Handling the OAuth callback token (reads URL params after redirect back)
 * 4. Account linking flow
 */

import { apiRequest } from './api';

export interface AppConfig {
  google_oauth_enabled: boolean;
  microsoft_oauth_enabled: boolean;
  demo_mode: boolean;
}

let _configCache: AppConfig | null = null;

/** Fetch safe public app configuration from backend. Cached after first call. */
export async function fetchAppConfig(): Promise<AppConfig> {
  if (_configCache) return _configCache;
  try {
    _configCache = await apiRequest<AppConfig>('/auth/config/');
    return _configCache;
  } catch {
    // Fallback if backend is unreachable
    return { google_oauth_enabled: false, microsoft_oauth_enabled: false, demo_mode: true };
  }
}

/** Initiate Google OAuth — redirects the browser to Google. */
export async function initiateGoogleOAuth(): Promise<void> {
  const data = await apiRequest<{ auth_url: string }>('/auth/google/');
  window.location.href = data.auth_url;
}

/** Initiate Microsoft OAuth — redirects the browser to Microsoft. */
export async function initiateMicrosoftOAuth(): Promise<void> {
  const data = await apiRequest<{ auth_url: string }>('/auth/microsoft/');
  window.location.href = data.auth_url;
}

export type OAuthCallbackResult =
  | { type: 'success'; access: string; refresh: string }
  | { type: 'needs_linking'; provider: string; email: string; linkToken: string }
  | { type: 'error'; code: string }
  | { type: 'cancelled' }
  | { type: 'none' };

/**
 * Read OAuth result from current URL search params.
 * Called on app startup — the backend redirects back to /?oauth_access=...
 */
export function readOAuthCallback(): OAuthCallbackResult {
  const params = new URLSearchParams(window.location.search);

  // Success
  if (params.has('oauth_access')) {
    return {
      type: 'success',
      access: params.get('oauth_access')!,
      refresh: params.get('oauth_refresh') || '',
    };
  }

  // Needs account linking
  if (params.get('oauth_link_required') === '1') {
    return {
      type: 'needs_linking',
      provider: params.get('provider') || '',
      email: params.get('email') || '',
      linkToken: params.get('link_token') || '',
    };
  }

  // Error
  const errorCode = params.get('oauth_error');
  if (errorCode) {
    if (errorCode === 'cancelled') return { type: 'cancelled' };
    return { type: 'error', code: errorCode };
  }

  return { type: 'none' };
}

/** Clear OAuth URL params after reading them (clean browser history). */
export function clearOAuthParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('oauth_access');
  url.searchParams.delete('oauth_refresh');
  url.searchParams.delete('oauth_error');
  url.searchParams.delete('oauth_link_required');
  url.searchParams.delete('provider');
  url.searchParams.delete('email');
  url.searchParams.delete('link_token');
  window.history.replaceState({}, '', url.toString());
}

/** Link an existing account to an OAuth identity after password verification. */
export async function linkOAuthAccount(linkToken: string, password: string): Promise<{
  user: any;
  access: string;
  refresh: string;
}> {
  return apiRequest('/auth/link-account/', {
    method: 'POST',
    body: JSON.stringify({ link_token: linkToken, password }),
  });
}

/** Human-readable error messages for OAuth error codes. */
export function getOAuthErrorMessage(code: string, provider?: string): string {
  const providerName = provider === 'google' ? 'Google' : provider === 'microsoft' ? 'Microsoft' : 'OAuth';
  switch (code) {
    case 'google_error':
      return "Google sign-in couldn't be completed. Please try again.";
    case 'microsoft_error':
      return "Microsoft sign-in couldn't be completed. Please try again.";
    case 'invalid_state':
      return "Authentication session expired. Please try signing in again.";
    case 'missing_params':
      return "Authentication was incomplete. Please try again.";
    default:
      return `${providerName} sign-in couldn't be completed. Please try again.`;
  }
}
