import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { pathname } = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/models', label: 'Models' },
    { to: '/chat', label: 'Chat' },
  ];

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4" cy="4" r="2.5" fill="white" />
            <circle cx="10" cy="4" r="2.5" fill="rgba(255,255,255,0.55)" />
            <circle cx="4" cy="10" r="2.5" fill="rgba(255,255,255,0.55)" />
            <circle cx="10" cy="10" r="2.5" fill="rgba(255,255,255,0.35)" />
          </svg>
        </span>
        rmcluster
      </Link>

      <nav className="navbar-nav" aria-label="Main navigation">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={pathname === to ? 'active' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="navbar-actions">
        <ThemeToggle />
      </div>
    </header>
  );
}
