import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LogoIcon } from '../icons/LogoIcon';

type NavbarProps = {
  onOpenSettings?: () => void;
};

export function Navbar({ onOpenSettings }: NavbarProps) {
  const { pathname } = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/models', label: 'Models' },
    { to: '/chat', label: 'Chat' },
    { to: '/files', label: 'Files' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-[var(--navbar-height)] bg-[var(--bg-surface)]/80 backdrop-blur border-b border-[var(--border)]">
      <Link
        to="/"
        className="flex items-center gap-2 font-[var(--font-heading)] font-bold text-[var(--text-primary)] text-base"
      >
        <span className="w-6.5 h-6.5 rounded-sm bg-(--accent) grid place-items-center shrink-0">
          <LogoIcon size={14} />
        </span>
        rmcluster
      </Link>

      <nav className="flex items-center gap-1" aria-label="Main navigation">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={
              pathname === to
                ? 'px-3 py-1.5 text-sm rounded-md text-[var(--text-primary)] bg-[var(--bg-elevated)] transition-colors'
                : 'px-3 py-1.5 text-sm rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors'
            }
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-(--text-muted) transition-colors hover:bg-(--bg-elevated) hover:text-(--text-primary) cursor-pointer"
          aria-label="Open settings"
          title="Settings"
        >
          <Settings size={16} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
