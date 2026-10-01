import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { PipelinePage } from './pages/PipelinePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { PeoplePage } from './pages/PeoplePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountLinkingModal } from './components/modals/AccountLinkingModal';
import { applyTheme } from './utils/theme';
import {
  readOAuthCallback,
  clearOAuthParams,
  getOAuthErrorMessage,
} from './services/oauth';
import { setAuthToken } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// ─── Pathly Loading Screen ────────────────────────────────────────────────────
const LoadingScreen: React.FC = () => (
  <div style={{ height: '100vh', width: '100vw', background: '#0A0D14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
    <div style={{ width: 56, height: 56, borderRadius: '1rem', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(91,95,239,0.5)', animation: 'pulse 2s ease-in-out infinite' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #FFFFFF 30%, #A5B4FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '0.25rem' }}>Pathly</p>
      <p style={{ fontSize: '0.75rem', color: 'rgba(100,116,139,0.8)', fontWeight: 500 }}>Loading your career graph...</p>
    </div>
    <div style={{ width: 40, height: 3, borderRadius: 99, background: 'rgba(91,95,239,0.2)', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, #5B5FEF, transparent)', animation: 'shimmer 1.2s ease-in-out infinite' }} />
    </div>
    <style>{`
      @keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 4px 24px rgba(91,95,239,0.5); } 50% { transform: scale(1.05); box-shadow: 0 6px 32px rgba(91,95,239,0.7); } }
      @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
    `}</style>
  </div>
);

// ─── State for OAuth linking modal ────────────────────────────────────────────
interface LinkingState {
  provider: string;
  email: string;
  linkToken: string;
}

// ─── App Content ──────────────────────────────────────────────────────────────
export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [oauthError, setOauthError] = useState<string>('');
  const [linkingState, setLinkingState] = useState<LinkingState | null>(null);

  // 1. Apply saved theme on startup
  useEffect(() => {
    const saved = localStorage.getItem('pathly_theme') || 'system';
    applyTheme(saved);
  }, []);

  // 2. On startup, check for OAuth callback in URL
  useEffect(() => {
    const result = readOAuthCallback();

    if (result.type === 'success') {
      // Set JWT token and re-verify auth
      setAuthToken(result.access);
      if (result.refresh) {
        localStorage.setItem('pathly_refresh_token', result.refresh);
      }
      clearOAuthParams();
      checkAuth();
      return;
    }

    if (result.type === 'needs_linking') {
      clearOAuthParams();
      setLinkingState({
        provider: result.provider,
        email: result.email,
        linkToken: result.linkToken,
      });
      return;
    }

    if (result.type === 'error') {
      clearOAuthParams();
      setOauthError(getOAuthErrorMessage(result.code));
      return;
    }

    if (result.type === 'cancelled') {
      clearOAuthParams();
      // Just show login page cleanly — no error needed for user cancellation
      return;
    }

    // type === 'none' — normal startup
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLinkingSuccess = (_user: any) => {
    setLinkingState(null);
    checkAuth();
  };

  if (isLoading) return <LoadingScreen />;

  // Account linking modal is shown on top of the login page
  const showLinkingModal = !isAuthenticated && linkingState !== null;

  if (!isAuthenticated) {
    return (
      <>
        {authView === 'login' ? (
          <LoginPage
            onNavigateToRegister={() => setAuthView('register')}
            oauthError={oauthError}
          />
        ) : (
          <RegisterPage onNavigateToLogin={() => setAuthView('login')} />
        )}

        {showLinkingModal && (
          <AccountLinkingModal
            provider={linkingState!.provider}
            email={linkingState!.email}
            linkToken={linkingState!.linkToken}
            onSuccess={handleLinkingSuccess}
            onCancel={() => setLinkingState(null)}
          />
        )}
      </>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/applications" element={<ApplicationsPage />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/companies" element={<CompaniesPage />} />
      <Route path="/people" element={<PeoplePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
