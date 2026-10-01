/**
 * AccountLinkingModal
 *
 * Shown when an OAuth provider returns an email that already
 * belongs to a Pathly account with a password set.
 *
 * User must verify their password to link the OAuth identity.
 */

import React, { useState } from 'react';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { linkOAuthAccount } from '../../services/oauth';
import { setAuthToken } from '../../services/api';

interface AccountLinkingModalProps {
  provider: string;
  email: string;
  linkToken: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

const providerName = (p: string) => p === 'google' ? 'Google' : p === 'microsoft' ? 'Microsoft' : p;

export const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
  provider,
  email,
  linkToken,
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await linkOAuthAccount(linkToken, password);
      setAuthToken(data.access);
      setLinked(true);
      setTimeout(() => onSuccess(data.user), 900);
    } catch (err: any) {
      setError(err.message || 'Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10,13,20,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeInUp 0.25s ease both',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '1.5rem',
          padding: '2rem',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'fadeInUp 0.3s ease both',
        }}
      >
        {linked ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={48} style={{ color: '#10B981', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Account linked!
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Your {providerName(provider)} account has been linked. Signing you in...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.875rem', background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 4px 16px rgba(91,95,239,0.3)' }}>
                <Lock size={20} color="white" />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                Link your {providerName(provider)} account
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                The email <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> is already associated with a Pathly account.
                Enter your Pathly password to link your {providerName(provider)} account.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.8125rem', fontWeight: 500, borderRadius: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                  Pathly Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="pathly-input"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button type="submit" disabled={loading} className="pathly-btn-primary">
                {loading ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Linking account...</>
                ) : (
                  <>Verify & Link {providerName(provider)}</>
                )}
              </button>

              <button type="button" onClick={onCancel} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, padding: '0.5rem 0' }}>
                Cancel — use a different method
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
