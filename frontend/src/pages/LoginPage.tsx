import React, { useState, useEffect } from 'react';
import { LogIn, Sparkles, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import {
  fetchAppConfig,
  initiateGoogleOAuth,
  initiateMicrosoftOAuth,
  type AppConfig,
} from '../services/oauth';
import { PathlyPMark } from '../components/brand/PathlyLogo';

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 21 21" fill="none">
    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
);

// ─── Animated Background Orbs ────────────────────────────────────────────────
const AuthOrbs: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {[
      { top: '15%', left: '10%', size: 360, color: 'rgba(91,95,239,0.22)', duration: '9s' },
      { bottom: '10%', right: '5%', size: 280, color: 'rgba(124,58,237,0.18)', duration: '12s', reverse: true },
      { top: '55%', left: '55%', size: 200, color: 'rgba(14,165,233,0.14)', duration: '15s' },
    ].map((orb, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: (orb as any).top,
          left: (orb as any).left,
          bottom: (orb as any).bottom,
          right: (orb as any).right,
          width: orb.size,
          height: orb.size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          animation: `orbFloat ${orb.duration} ease-in-out infinite${(orb as any).reverse ? ' reverse' : ''}`,
        }}
      />
    ))}
  </div>
);

// ─── Feature Pill ────────────────────────────────────────────────────────────
const FeaturePill: React.FC<{ icon: React.ReactNode; text: string; delay?: string }> = ({ icon, text, delay = '0s' }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.11)',
      borderRadius: '2rem',
      padding: '0.625rem 1.125rem',
      backdropFilter: 'blur(8px)',
      animation: `fadeInUp 0.5s ease ${delay} both`,
    }}
  >
    <span style={{ flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(238,240,248,0.85)' }}>{text}</span>
  </div>
);

// ─── OAuth Button ─────────────────────────────────────────────────────────────
interface OAuthButtonProps {
  provider: 'google' | 'microsoft';
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const OAuthButton: React.FC<OAuthButtonProps> = ({ provider, loading, disabled, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const isGoogle = provider === 'google';
  const label = isGoogle ? 'Continue with Google' : 'Continue with Microsoft';
  const loadingLabel = isGoogle ? 'Connecting to Google...' : 'Connecting to Microsoft...';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        background: hovered ? '#F8F9FF' : '#FFFFFF',
        border: `1.5px solid ${focused ? '#5B5FEF' : hovered ? '#C4C7FF' : '#E4E7F0'}`,
        borderRadius: '0.875rem',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        opacity: disabled || loading ? 0.65 : 1,
        boxShadow: focused
          ? '0 0 0 3px rgba(91,95,239,0.15)'
          : hovered
          ? '0 2px 8px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.05)',
        outline: 'none',
      }}
    >
      {loading ? (
        <div
          style={{
            width: 16,
            height: 16,
            border: '2px solid #CBD5E1',
            borderTopColor: '#5B5FEF',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : (
        isGoogle ? <GoogleIcon size={18} /> : <MicrosoftIcon size={18} />
      )}
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#1E2538',
          letterSpacing: '-0.005em',
        }}
      >
        {loading ? loadingLabel : label}
      </span>
    </button>
  );
};

// ─── Main Login Component ─────────────────────────────────────────────────────
export const LoginPage: React.FC<{ onNavigateToRegister: () => void; oauthError?: string }> = ({
  onNavigateToRegister,
  oauthError,
}) => {
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(oauthError || '');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetchAppConfig().then(setAppConfig);
  }, []);

  useEffect(() => {
    if (oauthError) setError(oauthError);
  }, [oauthError]);

  const isAnyLoading = loading || oauthLoading !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo', 'password123');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setOauthLoading('google');
    try {
      await initiateGoogleOAuth();
      // Browser will redirect; we won't reach here on success
    } catch (err: any) {
      setError(err.message || "Google sign-in couldn't be completed. Please try again.");
      setOauthLoading(null);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError('');
    setOauthLoading('microsoft');
    try {
      await initiateMicrosoftOAuth();
    } catch (err: any) {
      setError(err.message || "Microsoft sign-in couldn't be completed. Please try again.");
      setOauthLoading(null);
    }
  };

  const showOAuth = appConfig && (appConfig.google_oauth_enabled || appConfig.microsoft_oauth_enabled);
  const showDemo = !appConfig || appConfig.demo_mode;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── LEFT PANEL — Brand ─────────────────────────────────────────────── */}
      <div
        className="hidden md:flex"
        style={{
          flex: '0 0 55%',
          background: 'linear-gradient(145deg, #0A0D14 0%, #111830 45%, #0F1117 100%)',
          position: 'relative',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '4rem 5rem',
          overflow: 'hidden',
        }}
      >
        <AuthOrbs />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '3rem', animation: 'fadeInUp 0.4s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.375rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.875rem', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(91,95,239,0.4)', flexShrink: 0 }}>
              <PathlyPMark size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #FFFFFF 30%, #A5B4FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pathly</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(165,180,252,0.8)', fontWeight: 500, letterSpacing: '0.02em' }}>Your Career, Connected.</p>
        </div>

        {/* Hero */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, marginBottom: '3rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1.25rem', animation: 'fadeInUp 0.5s ease 0.1s both' }}>
            Map your network.<br />
            <span style={{ background: 'linear-gradient(135deg, #818CF8, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Land your dream role.</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(148,163,184,0.9)', lineHeight: 1.7, animation: 'fadeInUp 0.5s ease 0.2s both' }}>
            Pathly visualises your professional relationships as a living career graph — so you always know who to reach, and when.
          </p>
        </div>

        {/* Features */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <FeaturePill icon={<span style={{ fontSize: '1rem' }}>🗺️</span>} text="Interactive career relationship graph" delay="0.3s" />
          <FeaturePill icon={<span style={{ fontSize: '1rem' }}>🤝</span>} text="Referral tracking & warm intro paths" delay="0.4s" />
          <FeaturePill icon={<span style={{ fontSize: '1rem' }}>📊</span>} text="Real-time pipeline analytics" delay="0.5s" />
          <FeaturePill icon={<span style={{ fontSize: '1rem' }}>🤖</span>} text="AI-powered outreach intelligence" delay="0.6s" />
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeInUp 0.4s ease 0.15s both' }}>

          {/* Mobile Logo */}
          <div className="md:hidden" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.875rem', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', boxShadow: '0 4px 20px rgba(91,95,239,0.35)' }}>
              <PathlyPMark size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Pathly</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: '0.375rem' }}>Welcome back</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Sign in to your Pathly account to continue.</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.8125rem', fontWeight: 500, borderRadius: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="login-username" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Username or Email</label>
              <input id="login-username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" className="pathly-input" disabled={isAnyLoading} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                <label htmlFor="login-password" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Password</label>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#5B5FEF', fontWeight: 600, padding: 0 }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input id="login-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pathly-input" style={{ paddingRight: '3rem' }} disabled={isAnyLoading} />
                <button type="button" onClick={() => setShowPassword((p) => !p)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="login-submit" type="submit" disabled={isAnyLoading} className="pathly-btn-primary" style={{ marginTop: '0.25rem' }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Signing In...</>
              ) : (
                <><LogIn size={16} />Sign In<ArrowRight size={14} style={{ marginLeft: 'auto' }} /></>
              )}
            </button>
          </form>

          {/* OR Divider */}
          {(showOAuth || showDemo) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
          )}

          {/* OAuth Buttons */}
          {showOAuth && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {appConfig?.google_oauth_enabled && (
                <OAuthButton
                  provider="google"
                  loading={oauthLoading === 'google'}
                  disabled={isAnyLoading}
                  onClick={handleGoogleLogin}
                />
              )}
              {appConfig?.microsoft_oauth_enabled && (
                <OAuthButton
                  provider="microsoft"
                  loading={oauthLoading === 'microsoft'}
                  disabled={isAnyLoading}
                  onClick={handleMicrosoftLogin}
                />
              )}
            </div>
          )}

          {/* Demo Login */}
          {showDemo && (
            <div style={{ marginTop: showOAuth ? '0.75rem' : '0' }}>
              <button id="demo-login-btn" type="button" onClick={handleDemoLogin} disabled={isAnyLoading} className="pathly-btn-secondary">
                <Sparkles size={15} style={{ color: '#F59E0B' }} />
                Try Demo — Instant Access
              </button>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.375rem' }}>
                Pre-loaded with seed data · No sign-up required
              </p>
            </div>
          )}

          {/* Register Link */}
          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <button type="button" onClick={onNavigateToRegister} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B5FEF', fontWeight: 700, fontSize: '0.8125rem', padding: 0 }}>
              Create account
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orbFloat { 0%, 100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
      `}</style>
    </div>
  );
};
