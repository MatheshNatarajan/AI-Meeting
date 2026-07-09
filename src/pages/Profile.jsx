import { useState, useEffect } from 'react';
import { User, Mail, Globe, Save, CheckCircle2 } from 'lucide-react';

const TIMEZONES = [
  { value: 'America/New_York', label: 'United States (EST/EDT)' },
  { value: 'America/Chicago', label: 'United States (CST/CDT)' },
  { value: 'America/Denver', label: 'United States (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'United States (PST/PDT)' },
  { value: 'Europe/London', label: 'United Kingdom (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe (CET/CEST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'UAE (GST)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Australia (AEST/AEDT)' }
];

export default function Profile() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : { name: '', email: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', timezone: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // In a real app, fetch user from API or context
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const mappedTimezone = parsed.timezone || (parsed.location === 'India (IST)' ? 'Asia/Kolkata' : 'America/New_York');
        setUser({...parsed, timezone: mappedTimezone});
        setFormData({ name: parsed.name, email: parsed.email, timezone: mappedTimezone });
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setUser({ ...user, ...formData });
    localStorage.setItem('user', JSON.stringify({ ...user, ...formData }));
    setIsEditing(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your account details and preferences.</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700 font-medium">
          <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
          Profile updated successfully.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-slate-100">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-3xl text-primary-600 font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-slate-500">{TIMEZONES.find(t => t.value === user.timezone)?.label || user.timezone}</p>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="name">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  value={isEditing ? formData.name : user.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-70 disabled:bg-slate-100 transition-all font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="email">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={isEditing ? formData.email : user.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-70 disabled:bg-slate-100 transition-all font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="timezone">Country / Timezone</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                <select
                  id="timezone"
                  value={isEditing ? formData.timezone : user.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  disabled={!isEditing}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-70 disabled:bg-slate-100 transition-all font-medium text-slate-800 appearance-none"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {isEditing && (
              <div className="pt-4 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({ name: user.name, email: user.email, timezone: user.timezone });
                  }}
                  className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Integrations</h3>
          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mr-4 border border-slate-100">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Google Calendar</p>
                <p className="text-sm text-slate-500">Sync your meetings and availability automatically.</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors text-sm shadow-sm">
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
