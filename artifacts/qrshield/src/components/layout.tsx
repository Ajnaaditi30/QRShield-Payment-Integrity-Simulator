import { Link, useLocation } from 'wouter';
import {
  Activity, Bell, BookOpen, ChevronRight, Clock3, FlaskConical,
  LayoutDashboard, QrCode, Shield, ShieldCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getGetHealthQueryKey, useGetHealth } from '@workspace/api-client-react';

const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/generate', label: 'Generate QR', icon: QrCode },
  { href: '/tampering', label: 'Tampering Lab', icon: FlaskConical },
  { href: '/verification', label: 'Verification Center', icon: ShieldCheck },
  { href: '/history', label: 'Activity History', icon: Clock3 },
  { href: '/about', label: 'About the Project', icon: BookOpen },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const health = useGetHealth({ query: { queryKey: getGetHealthQueryKey(), refetchInterval: 30000 } });
  const currentPage = links.find((link) => link.href === location)?.label ?? 'QRShield';
  const isOnline = health.data?.status?.toLowerCase() === 'ok' || health.data?.status?.toLowerCase() === 'healthy';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <Link href="/" className="brand" data-testid="link-brand">
            <span className="brand-mark"><Shield size={20} strokeWidth={2.1} /><QrCode className="brand-qr" size={10} strokeWidth={2.4} /></span>
            <span><span className="brand-title">QRShield</span><span className="brand-sub">Integrity lab</span></span>
          </Link>
          <nav aria-label="Primary navigation">
            <div className="nav-label">Workspace</div>
            <div className="nav-list">
              {links.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} aria-current={location === href ? 'page' : undefined} data-testid={`link-nav-${href === '/' ? 'overview' : href.slice(1)}`}>
                  <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="lab-note">
            <div className="lab-note-title"><ShieldCheck size={14} /> Classroom sandbox</div>
            <p>Fictional payloads only. This lab does not process payments or connect to banking or UPI networks.</p>
          </div>
          <div style={{ padding: '13px 12px 0', color: '#697592', fontSize: 9, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Activity size={12} /> ACADEMIC SECURITY LAB
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><span className="mono">QRSHIELD</span><ChevronRight size={12} /> {currentPage}</div>
          <div className="topbar-right">
            <div className="environment" data-testid="status-api-health"><span className="status-dot" style={{ background: health.isError ? '#e8757d' : isOnline ? '#66d3ad' : '#d5ae69' }} />{health.isLoading ? 'Checking API' : health.isError ? 'API unavailable' : isOnline ? 'API operational' : `API ${health.data?.status ?? 'connected'}`}</div>
            <span className="tag"><FlaskConical size={11} /> DEMO MODE</span>
            <Link className="topbar-icon" href="/history" aria-label="Open activity history" data-testid="link-topbar-activity"><Bell size={15} /></Link>
            <div className="analyst"><span className="analyst-avatar">SA</span><span className="analyst-name">Security Analyst</span></div>
          </div>
        </header>
        <div className="page-content animate-in">{children}</div>
      </main>
    </div>
  );
}
