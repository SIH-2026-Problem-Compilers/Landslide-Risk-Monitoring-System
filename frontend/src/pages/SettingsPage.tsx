import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAppStore } from '../store/useStore';
import {
  Moon, Sun, Bell, Database, Shield, User, Globe,
} from 'lucide-react';

export function SettingsPage() {
  const { theme, toggleTheme, user, currentRole } = useAppStore();
  const [dataCleaning] = useState<Record<string, string>>({
    weather: 'completed',
    sensor: 'processing',
    satellite: 'idle',
  });

  return (
    <div>
      <PageHeader title="Settings" subtitle="System preferences and configuration" />

      <div className="max-w-3xl space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-aztec" />
            Profile
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Name</span>
              <span className="text-sm font-medium text-gray-800">{user?.name || 'Admin User'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email</span>
              <span className="text-sm font-medium text-gray-800">{user?.email || 'admin@ner-sdma.gov.in'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Role</span>
              <span className="text-sm font-medium text-aztec capitalize">{currentRole.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-aztec" />
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Theme</p>
              <p className="text-xs text-gray-500">Switch between light and dark mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'light' ? 'Dark' : 'Light'} Mode
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-aztec" />
            Notification Preferences
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Emergency Alerts', description: 'Critical and emergency-level alerts', checked: true },
              { label: 'Risk Updates', description: 'Changes in risk zone status', checked: true },
              { label: 'Sensor Notifications', description: 'Sensor offline and warning alerts', checked: false },
              { label: 'Report Updates', description: 'Status changes on citizen reports', checked: true },
            ].map((pref) => (
              <label key={pref.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-800">{pref.label}</p>
                  <p className="text-xs text-gray-500">{pref.description}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={pref.checked}
                  className="w-4 h-4 text-aztec rounded border-gray-300 focus:ring-capri"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Data Cleaning Service Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-aztec" />
            Data Cleaning Service
            <span className="text-[10px] text-gray-400 font-normal">(Future Integration)</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            These services will process and clean incoming data before it reaches the dashboard.
            Currently showing mock processing status.
          </p>
          <div className="space-y-3">
            {[
              { label: 'Weather Data', endpoint: 'POST /clean/weather', status: dataCleaning.weather },
              { label: 'Sensor Data', endpoint: 'POST /clean/sensor', status: dataCleaning.sensor },
              { label: 'Satellite Data', endpoint: 'POST /clean/satellite', status: dataCleaning.satellite },
            ].map((svc) => (
              <div key={svc.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{svc.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{svc.endpoint}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  svc.status === 'completed' ? 'bg-green-50 text-green-700' :
                  svc.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                  svc.status === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-aztec" />
            Security
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <p className="text-sm font-medium text-gray-800">Change Password</p>
              <p className="text-xs text-gray-500">Update your account password</p>
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <p className="text-sm font-medium text-gray-800">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500">Add an extra layer of security</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
