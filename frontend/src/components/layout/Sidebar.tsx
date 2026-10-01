import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { NAVIGATION_ITEMS } from '../../config/navigation';

interface SidebarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

// ─── Pathly P Lettermark ─────────────────────────────────────────────────────
const PathlyIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Pathly">
    <path
      d="M20 8 L20 54 C14 57 9 62 9 68 C9 75 15 80 22 80 C29 80 36 76 40 70 C43 65 43 59 43 54 C54 57 65 55 73 49 C83 42 86 30 83 19 C80 9 70 3 58 3 C44 3 30 5 20 8 Z M37 13 C45 10 56 11 64 16 C72 21 74 30 71 38 C68 45 60 50 51 49 L37 48 Z M20 62 C25 59 33 58 39 60 C35 66 30 72 25 75 C22 77 18 76 17 73 C16 69 17 65 20 62 Z"
      fill="white"
      fillRule="evenodd"
    />
  </svg>
);


export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleNavClick = (path: string, id: string) => {
    navigate(path);
    if (onNavigate) onNavigate(id);
  };

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: 'var(--navy-900)',
        borderRight: '1px solid var(--navy-700)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 30,
        userSelect: 'none',
      }}
    >
      {/* ── Top ──────────────────────────────────────────────────────────── */}
      <div>
        {/* Logo */}
        <div
          style={{
            padding: '1.375rem 1.375rem 1.125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid var(--navy-800)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(91,95,239,0.35)',
            }}
          >
            <PathlyIcon size={18} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1,
                background: 'linear-gradient(135deg, #FFFFFF 30%, #A5B4FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Pathly
            </h1>
            <p
              style={{
                fontSize: '0.625rem',
                color: 'rgba(165,180,252,0.7)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              Your Career, Connected.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '0.75rem 0.625rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isPathActive =
              location.pathname === item.path ||
              (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
            const isActive = activePage ? activePage === item.id : isPathActive;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.path, item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 700 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  ...(isActive
                    ? {
                        background: 'linear-gradient(135deg, rgba(91,95,239,0.9), rgba(124,58,237,0.85))',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 14px rgba(91,95,239,0.3)',
                      }
                    : {
                        background: 'transparent',
                        color: 'rgba(148,163,184,0.85)',
                      }),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,37,56,0.8)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#EEF0F8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(148,163,184,0.85)';
                  }
                }}
              >
                <Icon
                  style={{
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    opacity: isActive ? 1 : 0.7,
                  }}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom — User ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '0.875rem',
          borderTop: '1px solid var(--navy-800)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #5B5FEF, #7C3AED)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(91,95,239,0.3)',
            }}
          >
            {user?.username ? user.username[0].toUpperCase() : 'U'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#EEF0F8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.username || 'User'}
            </p>
            <p
              style={{
                fontSize: '0.65rem',
                color: 'rgba(100,116,139,0.9)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email || 'Signed in'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            color: 'rgba(100,116,139,0.8)',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#F87171';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(100,116,139,0.8)';
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};
