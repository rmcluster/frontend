import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Navbar />
      <main className="max-w-[var(--page-max)] mx-auto px-6 py-8 pt-[calc(var(--navbar-height)+32px)]">
        <Outlet />
      </main>
    </div>
  );
}
