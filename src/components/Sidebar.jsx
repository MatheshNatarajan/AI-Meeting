import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, FileText, CheckSquare, User, LogOut, Video } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Meetings', path: '/meetings', icon: Video },
    { name: 'Schedule Meeting', path: '/schedule', icon: CalendarPlus },
    { name: 'Notes', path: '/notes', icon: FileText },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-56 bg-white border-r border-slate-200 text-slate-600 h-screen flex flex-col transition-all duration-300 shadow-sm z-20">
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <Video className="w-7 h-7 text-primary-600 mr-2.5" />
        <span className="text-lg font-bold text-slate-800 tracking-tight">MeetSync</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm ${
                isActive(item.path)
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 mr-2.5 ${isActive(item.path) ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex items-center w-full px-3 py-2.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-sm text-slate-500 font-medium duration-200"
        >
          <LogOut className="w-4 h-4 mr-2.5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
