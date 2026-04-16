import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function MainLayout() {
  return (
    <div className="main-layout">
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
