import { create } from 'zustand';
import type { User, UserRole } from '../types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (auth: boolean) => void;
  logout: () => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Role Switcher (for prototype)
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;

  // Notifications
  unreadAlertCount: number;
  setUnreadAlertCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  logout: () => set({ user: null, isAuthenticated: false }),

  // Theme
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Role
  currentRole: 'admin',
  setCurrentRole: (currentRole) => set({ currentRole }),

  // Notifications
  unreadAlertCount: 23,
  setUnreadAlertCount: (unreadAlertCount) => set({ unreadAlertCount }),
}));
