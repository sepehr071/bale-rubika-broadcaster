import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Settings, Send, History as HistoryIcon, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { vocab } from '@/lib/vocab';
import { useBootstrap } from '@/hooks/useBootstrap';

const NAV = [
  { to: '/', label: vocab.nav.compose, icon: Send, end: true },
  { to: '/history', label: vocab.nav.history, icon: HistoryIcon, end: false },
  { to: '/help', label: vocab.nav.help, icon: HelpCircle, end: false },
];

export default function AppShell() {
  useBootstrap();
  const { pathname } = useLocation();
  const isSetup = pathname.startsWith('/setup');

  return (
    <div className="min-h-full bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight">{vocab.appTitle}</span>
            <span className="text-sm text-ink-muted">{vocab.appSubtitle}</span>
          </div>
          {!isSetup && (
            <nav className="flex items-center gap-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                      'hover:bg-surface-2',
                      isActive ? 'bg-surface-2 text-ink shadow-card' : 'text-ink-2',
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{label}</span>
                </NavLink>
              ))}
              <NavLink
                to="/setup"
                className={({ isActive }) =>
                  cn(
                    'ms-2 inline-flex items-center justify-center rounded-md p-2 transition',
                    'hover:bg-surface-2',
                    isActive ? 'bg-surface-2 text-ink' : 'text-ink-2',
                  )
                }
                aria-label={vocab.nav.setup}
                title={vocab.nav.setup}
              >
                <Settings className="h-4 w-4" aria-hidden />
              </NavLink>
            </nav>
          )}
        </div>
      </header>

      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
}
