import { useState } from 'react';
import { useAppStore } from '../../store/useStore';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  User,
  ShieldAlert,
  Mountain,
  Heart,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const roleLabels = {
  admin: { label: 'Administrator', icon: ShieldAlert, color: 'text-red-400' },
  disaster_officer: { label: 'Disaster Officer', icon: Mountain, color: 'text-amber-400' },
  citizen: { label: 'Citizen', icon: Heart, color: 'text-green-400' },
};

export function Navbar() {
  const { theme, toggleTheme, unreadAlertCount, currentRole, setCurrentRole, user, logout } = useAppStore();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const navigate = useNavigate();

  const RoleIcon = roleLabels[currentRole].icon;

  const handleRoleChange = (role: 'admin' | 'disaster_officer' | 'citizen') => {
    setCurrentRole(role);
    setShowRoleDropdown(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search zones, alerts, sensors..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capri/30 focus:border-capri"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-aztec/5 border border-aztec/10 rounded-lg text-xs font-medium text-aztec hover:bg-aztec/10 transition-colors"
          >
            <RoleIcon className={`w-3.5 h-3.5 ${roleLabels[currentRole].color}`} />
            <span>{roleLabels[currentRole].label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              {(Object.keys(roleLabels) as Array<keyof typeof roleLabels>).map((role) => {
                const RLIcon = roleLabels[role].icon;
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                      currentRole === role ? 'bg-capri/5 text-aztec font-medium' : 'text-gray-700'
                    }`}
                  >
                    <RLIcon className={`w-4 h-4 ${roleLabels[role].color}`} />
                    {roleLabels[role].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>
          {showAlerts && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Alerts</span>
                <button
                  onClick={() => { navigate('/reports'); setShowAlerts(false); }}
                  className="text-xs text-capri hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="px-3 py-2 border-b border-gray-50 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-xs font-medium text-gray-800">Severe - Aizawl</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Risk score exceeded 90. Prepare evacuation.</p>
                </div>
                <div className="px-3 py-2 border-b border-gray-50 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-xs font-medium text-gray-800">High Risk - Mangan NH-10</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Risk score 89. Monitor road corridor.</p>
                </div>
                <div className="px-3 py-2 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-xs font-medium text-gray-800">Rainfall - Shillong</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">95mm expected in 12 hours (IMD).</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-aztec rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-gray-800">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-gray-500">{user?.email || 'admin@ner-sdma.gov.in'}</p>
            </div>
          </button>
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { navigate('/settings'); setShowProfileDropdown(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); setShowProfileDropdown(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
