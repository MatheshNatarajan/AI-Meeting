import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, Search, UserCircle, CheckCircle2, XCircle, Calendar, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar() {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [marketTime, setMarketTime] = useState('');
  const notifRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserEmail(user.email || '');
    setUserName(user.name || '');
    fetchNotifications();

    // Close when clicking outside
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    // User Time Clock
    const updateTime = () => {
      const userStr = localStorage.getItem('user');
      let tz = 'America/New_York';
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          tz = u.timezone || (u.location === 'India (IST)' ? 'Asia/Kolkata' : 'America/New_York');
        } catch(e) {}
      }

      let timeStr;
      try {
        timeStr = new Date().toLocaleTimeString('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (e) {
        // Fallback if timezone is invalid
        timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        tz = 'Local';
      }
      
      const shortName = tz.split('/').pop().replace('_', ' ');
      setMarketTime(`${timeStr} (${shortName})`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(timer);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getMeetings();
      const me = JSON.parse(localStorage.getItem('user') || '{}').email || '';
      const requests = data.filter(m => {
        const isParticipant = m.participants.includes(me);
        const isOrganizer = m.organizer === me;
        
        if (m.status === 'pending' && isParticipant) return true;
        
        if ((m.status === 'cancel_requested' || m.status === 'reschedule_requested') && m.requestedBy !== me) {
          return isParticipant || isOrganizer;
        }
        return false;
      });
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  };

  const handleRequest = async (id, status, e) => {
    e.stopPropagation();
    try {
      await api.updateMeetingStatus(id, status, userEmail);
      fetchNotifications();
      // Optionally trigger a custom event so the Dashboard knows to refresh
      window.dispatchEvent(new Event('dashboardRefresh'));
    } catch (error) {
      console.error('Failed to update meeting status', error);
    }
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center flex-1 space-x-8">
        <div className="relative w-64">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search meetings, notes..." 
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 rounded-lg text-sm transition-all duration-200 outline-none"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Market Time Display */}
        <div className="hidden md:flex items-center text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Clock className="w-3.5 h-3.5 mr-1.5 text-primary-500" />
          {marketTime}
        </div>

        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 transition-colors rounded-full ${
              showNotifications ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {pendingRequests.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 block">
                <h3 className="font-semibold text-slate-800">Notifications</h3>
              </div>
              <div className="max-h-[28rem] overflow-y-auto">
                {pendingRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No new notifications
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pendingRequests.map(req => {
                      let requestTitle = "New Request";
                      let requestDesc = <><span className="font-medium text-slate-700">{req.organizer}</span> invited you to a {req.duration} min meeting on {new Date(req.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}.</>;
                      let acceptStatus = 'confirmed';
                      let declineStatus = 'declined';
                      
                      if (req.status === 'cancel_requested') {
                        requestTitle = "Cancellation";
                        requestDesc = <><span className="font-medium text-slate-700">{req.requestedBy}</span> requested to cancel the meeting on {new Date(req.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}.</>;
                        acceptStatus = 'cancelled';
                        declineStatus = 'confirmed';
                      } else if (req.status === 'reschedule_requested') {
                        requestTitle = "Reschedule";
                        requestDesc = <><span className="font-medium text-slate-700">{req.requestedBy}</span> requested to reschedule the meeting on {new Date(req.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}.</>;
                        acceptStatus = 'confirmed';
                        declineStatus = 'confirmed';
                      }

                      return (
                        <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-semibold text-slate-800">{req.title}</p>
                            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{requestTitle}</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">
                            {requestDesc}
                          </p>
                          <div className="flex gap-2.5">
                            <button 
                              onClick={(e) => handleRequest(req.id, acceptStatus, e)}
                              className="flex-1 bg-green-50/50 hover:bg-green-50 text-green-700 text-[11px] font-semibold py-1.5 rounded-md flex items-center justify-center transition-colors border border-green-200 shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                            </button>
                            <button 
                              onClick={(e) => handleRequest(req.id, declineStatus, e)}
                              className="flex-1 bg-red-50/50 hover:bg-red-50 text-red-700 text-[11px] font-semibold py-1.5 rounded-md flex items-center justify-center transition-colors border border-red-200 shadow-sm"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2"></div>
        <div className="flex items-center space-x-3 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <UserCircle className="w-8 h-8 text-slate-400" />
          <div className="hidden md:block text-sm">
            <p className="font-medium text-slate-700 leading-none">{userName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
