import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { TunablesModal } from '../components/tunables/TunablesModal';

export function MainLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Navbar onOpenSettings={() => setSettingsOpen(true)} />
      <main className="max-w-[var(--page-max)] mx-auto px-6 py-8 pt-[calc(var(--navbar-height)+32px)]">
        <Outlet />
      </main>
      <TunablesModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
