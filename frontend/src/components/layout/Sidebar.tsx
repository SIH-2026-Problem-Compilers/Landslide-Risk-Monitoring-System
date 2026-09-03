import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../store/useStore';
import {
  LayoutDashboard,
  Map,
  BarChart3,
  Brain,
  FileText,
  Route,
  Bell,
  Siren,
  Radio,
  History,
  Settings,
  ChevronLeft,
  Mountain,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'disaster_officer', 'citizen'] },
  { to: '/gis', label: 'GIS Monitoring', icon: Map, roles: ['admin', 'disaster_officer'] },
  { to: '/analytics', label: 'Risk Analytics', icon: BarChart3, roles: ['admin', 'disaster_officer'] },
  { to: '/predictions', label: 'Predictions', icon: Brain, roles: ['admin', 'disaster_officer'] },
  { to: '/reports', label: 'Citizen Reports', icon: FileText, roles: ['admin', 'disaster_officer', 'citizen'] },
  { to: '/roads', label: 'Road Monitoring', icon: Route, roles: ['admin', 'disaster_officer'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'disaster_officer'] },
  { to: '/emergency', label: 'Emergency Response', icon: Siren, roles: ['admin', 'disaster_officer'] },
  { to: '/sensors', label: 'Sensor Monitoring', icon: Radio, roles: ['admin', 'disaster_officer'] },
  { to: '/historical', label: 'Historical Events', icon: History, roles: ['admin', 'disaster_officer'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed, currentRole } = useAppStore();

  const filteredItems = navItems.filter(item => item.roles.includes(currentRole));

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-aztec text-white transition-all duration-300 flex flex-col ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 bg-capri rounded-lg flex items-center justify-center shrink-0">
          <Mountain className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold leading-tight">NER</h1>
            <p className="text-[10px] text-capri-light opacity-80">Landslide Monitoring</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        <div className="space-y-1 px-2">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Collapse Button */}
      <div className="p-2 border-t border-white/10 shrink-0">
        <button
          onClick={toggleSidebarCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
