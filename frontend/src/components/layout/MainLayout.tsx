import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAppStore } from '../../store/useStore';

export function MainLayout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <Navbar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
