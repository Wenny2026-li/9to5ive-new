import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/documents', label: 'Knowledge Base', icon: '📚' },
  { to: '/reviews', label: 'Review Queue', icon: '🔍' },
  { to: '/impact-analysis', label: 'Impact Analysis', icon: '🎯' },
  { to: '/chat', label: 'AI Assistant', icon: '💬' },
  { to: '/audit', label: 'Audit Trail', icon: '📋' },
];

export default function Layout({ children, userName, onChangeName }) {
  const loc = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, background: '#1e293b', color: '#cbd5e1', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>9To5ive New</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Knowledge Platform</div>
        </div>
        <div style={{ flex: 1, padding: '8px 0' }}>
          {nav.map(n => (
            <Link
              key={n.to}
              to={n.to}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                color: loc.pathname === n.to || (n.to !== '/' && loc.pathname.startsWith(n.to)) ? '#f8fafc' : '#94a3b8',
                background: loc.pathname === n.to || (n.to !== '/' && loc.pathname.startsWith(n.to)) ? '#334155' : 'transparent',
                textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                borderLeft: loc.pathname === n.to || (n.to !== '/' && loc.pathname.startsWith(n.to)) ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Signed in as</div>
          <button
            onClick={onChangeName}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, textAlign: 'left' }}
          >
            {userName || 'Set your name →'}
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
