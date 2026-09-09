import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import { authService } from '../services';
import { Mountain, Mail, Lock, Eye, EyeOff, ShieldAlert, MountainIcon, Heart } from 'lucide-react';

const roles = [
  { value: 'admin' as const, label: 'Administrator', icon: ShieldAlert, description: 'Full system access' },
  { value: 'disaster_officer' as const, label: 'Disaster Officer', icon: MountainIcon, description: 'District-level access' },
  { value: 'citizen' as const, label: 'Citizen', icon: Heart, description: 'Public access' },
];

export function LoginPage() {
  const [email, setEmail] = useState('admin@ner-sdma.gov.in');
  const [password, setPassword] = useState('password');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'disaster_officer' | 'citizen'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser, setAuthenticated } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await authService.login({ email, password, role: selectedRole });
      setUser(user);
      setAuthenticated(true);
      useAppStore.getState().setCurrentRole(selectedRole);
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-aztec relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-aztec via-aztec-light to-aztec" />
        <div className="absolute top-10 right-10 w-64 h-64 bg-capri/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-capri rounded-xl flex items-center justify-center">
              <Mountain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">NER</h1>
              <p className="text-sm text-capri-light">Landslide Monitoring System</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            AI-Based Early Warning & Landslide Risk Monitoring
          </h2>
          <p className="mt-4 text-white/60 text-lg leading-relaxed max-w-md">
            Protecting communities through intelligent prediction, real-time monitoring,
            and rapid emergency response.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { value: '142+', label: 'Sensors' },
              { value: '8', label: 'Districts' },
              { value: '24/7', label: 'Monitoring' },
              { value: '94%', label: 'Accuracy' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-capri">{stat.value}</p>
                <p className="text-sm text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-aztec rounded-xl flex items-center justify-center">
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-aztec text-xl">NER</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-sm text-gray-500 mt-1">Sign in to access the monitoring dashboard</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {/* Role Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Role</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selectedRole === role.value
                        ? 'border-aztec bg-aztec/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <role.icon className={`w-5 h-5 mx-auto mb-1 ${selectedRole === role.value ? 'text-aztec' : 'text-gray-400'}`} />
                    <p className={`text-xs font-medium ${selectedRole === role.value ? 'text-aztec' : 'text-gray-600'}`}>
                      {role.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capri/30 focus:border-capri"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capri/30 focus:border-capri"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me / Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-aztec rounded border-gray-300 focus:ring-capri"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-capri hover:text-capri-dark font-medium">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-aztec text-white font-medium rounded-lg hover:bg-aztec-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              This is a prototype. Click Sign In with any credentials.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
