import type { LoginCredentials, User } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockUsers: Record<string, User> = {
  admin: { id: 'u-001', name: 'Admin User', email: 'admin@ner.gov.np', role: 'admin', avatar: '' },
  officer: { id: 'u-002', name: 'Disaster Officer', email: 'officer@ner.gov.np', role: 'disaster_officer', district: 'Sindhupalchok', avatar: '' },
  citizen: { id: 'u-003', name: 'Citizen User', email: 'citizen@ner.gov.np', role: 'citizen', avatar: '' },
};

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    await delay(500);
    const roleMap: Record<string, User> = {
      admin: mockUsers.admin,
      disaster_officer: mockUsers.officer,
      citizen: mockUsers.citizen,
    };
    const user = roleMap[credentials.role];
    if (!user) throw new Error('Invalid credentials');
    return user;
  },

  async getProfile(): Promise<User> {
    await delay(200);
    return mockUsers.admin;
  },

  async logout(): Promise<void> {
    await delay(100);
  },
};
