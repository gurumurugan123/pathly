import React, { useState, useEffect } from 'react';
import { UserPlus, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import {
  fetchAppConfig,
  initiateGoogleOAuth,
  initiateMicrosoftOAuth,
  type AppConfig,
} from '../services/oauth';
import { PathlyPMark } from '../components/brand/PathlyLogo';

// ─── SVG Icons (same as LoginPage) ───────────────────────────────────────────
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

// ─── OAuth Button ─────────────────────────────────────────────────────────────
const OAuthButton: React.FC<{
  provider: 'google' | 'microsoft';
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ provider, loading, disabled, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isGoogle = provider === 'google';

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
        boxShadow: focused ? '0 0 0 3px rgba(91,95,239,0.15)' : hovered ? '0 2px 8px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
        outline: 'none',
      }}
    >
      {loading
        ? <div style={{ width: 16, height: 16, border: '2px solid #CBD5E1', borderTopColor: '#5B5FEF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
        : isGoogle ? <GoogleIcon size={18} /> : <MicrosoftIcon size={18} />}
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E2538', letterSpacing: '-0.005em' }}>
        {loading ? (isGoogle ? 'Connecting to Google...' : 'Connecting to Microsoft...') : (isGoogle ? 'Continue with Google' : 'Continue with Microsoft')}
      </span>
    </button>
  );
};

// ─── Password Strength ────────────────────────────────────────────────────────
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.pass).length;
  const colors = ['#EF4444', '#F59E0B', '#10B981'];

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: '0.375rem' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < strength ? colors[strength - 1] : 'var(--border-subtle)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {checks.map((c) => (
          <span key={c.label} style={{ fontSize: '0.65rem', color: c.pass ? '#10B981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 500, transition: 'color 0.2s' }}>
            <CheckCircle size={9} /> {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Main Register Component ──────────────────────────────────────────────────
export const RegisterPage: React.FC<{ onNavigateToLogin: () => void }> = ({ onNavigateToLogin }) => {
  const register = useAuthStore((state) => state.register);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetchAppConfig().then(setAppConfig);
  }, []);

  const isAnyLoading = loading || oauthLoading !== null;
  const showOAuth = appConfig && (appConfig.google_oauth_enabled || appConfig.microsoft_oauth_enabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await register({ username, email, password });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(''); setOauthLoading('google');
    try { await initiateGoogleOAuth(); } catch (err: any) {
      setError(err.message || "Google sign-in couldn't be completed."); setOauthLoading(null);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError(''); setOauthLoading('microsoft');
    try { await initiateMicrosoftOAuth(); } catch (err: any) {
      setError(err.message || "Microsoft sign-in couldn't be completed."); setOauthLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── FORM PANEL (left on register for variety) ─────────────────────── */}
      <div style={{ flex: 1, background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeInUp 0.4s ease 0.1s both' }}>

          {/* Mobile Logo */}
          <div className="md:hidden" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.875rem', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', boxShadow: '0 4px 20px rgba(91,95,239,0.35)' }}>
              <PathlyPMark size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Pathly</span>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: '0.375rem' }}>Create your account</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Start mapping your career network with Pathly.</p>
          </div>

          {/* OAuth Buttons FIRST (primary) */}
          {showOAuth && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {appConfig?.google_oauth_enabled && <OAuthButton provider="google" loading={oauthLoading === 'google'} disabled={isAnyLoading} onClick={handleGoogleLogin} />}
                {appConfig?.microsoft_oauth_enabled && <OAuthButton provider="microsoft" loading={oauthLoading === 'microsoft'} disabled={isAnyLoading} onClick={handleMicrosoftLogin} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>
            </>
          )}

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
              <label htmlFor="register-username" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Username</label>
              <input id="register-username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="choose_a_username" className="pathly-input" disabled={isAnyLoading} />
            </div>
            <div>
              <label htmlFor="register-email" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Work Email</label>
              <input id="register-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="pathly-input" disabled={isAnyLoading} />
            </div>
            <div>
              <label htmlFor="register-password" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input id="register-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="pathly-input" style={{ paddingRight: '3rem' }} disabled={isAnyLoading} />
                <button type="button" onClick={() => setShowPassword((p) => !p)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div>
              <label htmlFor="register-confirm" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Confirm Password</label>
              <input id="register-confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" className="pathly-input" disabled={isAnyLoading} />
              {confirmPassword && password !== confirmPassword && (
                <p style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '0.25rem', fontWeight: 500 }}>Passwords don't match</p>
              )}
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '-0.25rem' }}>
              By creating an account you agree to Pathly's <span style={{ color: '#5B5FEF', fontWeight: 600 }}>Terms</span> and <span style={{ color: '#5B5FEF', fontWeight: 600 }}>Privacy Policy</span>.
            </p>

            <button id="register-submit" type="submit" disabled={isAnyLoading} className="pathly-btn-primary">
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Creating Account...</>
              ) : (
                <><UserPlus size={16} />Create Account<ArrowRight size={14} style={{ marginLeft: 'auto' }} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button type="button" onClick={onNavigateToLogin} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B5FEF', fontWeight: 700, fontSize: '0.8125rem', padding: 0 }}>Sign in</button>
          </p>
        </div>
      </div>

      {/* ── BRAND PANEL ───────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex"
        style={{ flex: '0 0 42%', background: 'linear-gradient(145deg, #0A0D14 0%, #111830 45%, #0F1117 100%)', position: 'relative', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '4rem', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '20%', right: '10%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,95,239,0.22) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'orbFloat 10s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'orbFloat 14s ease-in-out infinite reverse' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginBottom: '2.5rem', animation: 'fadeInUp 0.4s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '0.875rem', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(91,95,239,0.4)', flexShrink: 0 }}>
              <PathlyPMark size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #FFFFFF 30%, #A5B4FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pathly</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(165,180,252,0.8)', fontWeight: 500 }}>Your Career, Connected.</p>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: 340 }}>
          {[
            { num: '10k+', label: 'Career paths mapped' },
            { num: '3.2x', label: 'Faster referral rate' },
            { num: '94%', label: 'Placement success' },
            { num: '45min', label: 'Average setup time' },
          ].map((s, i) => (
            <div key={s.num} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '1rem', padding: '1.25rem', backdropFilter: 'blur(8px)', animation: `fadeInUp 0.5s ease ${0.2 + i * 0.1}s both` }}>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.375rem' }}>{s.num}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.85)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.8rem', color: 'rgba(100,116,139,0.7)', marginTop: '2rem', animation: 'fadeInUp 0.5s ease 0.6s both' }}>
          Join thousands building smarter career networks with Pathly.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orbFloat { 0%, 100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
      `}</style>
    </div>
  );
};
