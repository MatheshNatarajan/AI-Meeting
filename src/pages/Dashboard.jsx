import { useState, useEffect } from 'react';
import { api } from '../services/api';
import MeetingCard from '../components/MeetingCard';
import MeetingDetailsSidebar from '../components/MeetingDetailsSidebar';
import { Plus, Loader2, CheckCircle2, XCircle, Video, Users, Calendar, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserEmail(user.email || '');
    
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await api.getMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Failed to load meetings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (id, status) => {
    try {
      await api.updateMeetingStatus(id, status, userEmail);
      fetchDashboardData(); // Refresh list after status change
    } catch (error) {
      console.error('Failed to update meeting status', error);
    }
  };

  const handleCleanup = async () => {
    if (window.confirm('Are you sure you want to DELETE ALL meetings and notes? This cannot be undone.')) {
      setLoading(true);
      try {
        await api.deleteAllMeetings();
        await api.deleteAllNotes();
        await fetchDashboardData();
      } catch (error) {
        console.error('Failed to cleanup data', error);
        alert('Failed to cleanup data. Please ensure backend is restarted.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const now = new Date();

  const pendingRequests = meetings.filter(m => {
    const isParticipant = m.participants.includes(userEmail);
    const isOrganizer = m.organizer === userEmail;
    
    if (m.status === 'pending' && isParticipant) return true;
    
    if ((m.status === 'cancel_requested' || m.status === 'reschedule_requested') && m.requestedBy !== userEmail) {
      return isParticipant || isOrganizer;
    }
    
    return false;
  });
  
  const confirmedOrOwned = meetings.filter(m => 
    (m.status === 'confirmed' || m.organizer === userEmail) && 
    m.status !== 'completed' && 
    m.status !== 'ended' && 
    m.status !== 'cancelled'
  );

  const pastMeetings = meetings.filter(m => 
    m.status === 'completed' || m.status === 'ended' || m.status === 'cancelled'
  ).sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const liveMeetings = confirmedOrOwned.filter(m => {
    const start = new Date(m.date);
    const end = new Date(start.getTime() + m.duration * 60000);
    return now >= start && now <= end;
  });

  const upcomingMeetings = confirmedOrOwned.filter(m => {
    const start = new Date(m.date);
    const isPendingForMe = pendingRequests.some(p => p.id === m.id);
    return now < start && !isPendingForMe && m.status !== 'cancelled';
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Welcome back! Here's your meeting overview.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleCleanup}
            className="text-slate-400 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-red-50"
            title="Clean all data"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          
          <Link 
            to="/schedule"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center transition-all duration-200 shadow-sm shadow-primary-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Schedule Meeting
          </Link>
        </div>
      </div>

      {liveMeetings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            Happening Now
            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {liveMeetings.map(meeting => (
              <div key={meeting.id} className="bg-blue-600 rounded-lg p-5 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between group transition-all">
                <div className="w-full md:w-auto relative z-10 mb-4 md:mb-0 pl-2">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="flex items-center text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-white rounded-full px-2.5 py-0.5 shadow-sm">
                      <Video className="w-3 h-3 mr-1" /> Live
                    </span>
                    <span className="text-blue-100 font-medium text-sm">&#x2022; {meeting.duration} min</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{meeting.title}</h3>
                  <div className="flex items-center text-blue-100 text-sm font-medium">
                    <Users className="w-4 h-4 mr-1.5 opacity-80" />
                    <span>{meeting.organizer === userEmail ? `Invitees: ${meeting.participants.join(', ')}` : `Organizer: ${meeting.organizer}`}</span>
                  </div>
                </div>
                <div className="w-full md:w-auto relative z-10 shrink-0">
                  <button 
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                    className="w-full md:w-auto bg-white text-blue-700 hover:bg-blue-50 font-bold py-2.5 px-6 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                  >
                    Join Meeting Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            Pending Requests
            <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRequests.map(meeting => {
              let requestTitle = "Meeting Request";
              let requestDesc = `From: ${meeting.organizer}`;
              let acceptStatus = 'confirmed';
              let declineStatus = 'declined';
              
              if (meeting.status === 'cancel_requested') {
                requestTitle = "Cancellation Request";
                requestDesc = `From: ${meeting.requestedBy}`;
                acceptStatus = 'cancelled';
                declineStatus = 'confirmed';
              } else if (meeting.status === 'reschedule_requested') {
                requestTitle = "Reschedule Request";
                requestDesc = `From: ${meeting.requestedBy}`;
                acceptStatus = 'confirmed';
                declineStatus = 'confirmed';
              }

              return (
                <div key={meeting.id} className="bg-white p-5 rounded-lg border border-amber-200/60 shadow-sm relative flex flex-col hover:border-amber-300 transition-colors">
                  <div className="mb-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider">{requestTitle}</div>
                  <h3 className="font-semibold text-slate-800 text-lg mb-1">{meeting.title}</h3>
                  <p className="text-sm text-slate-500 mb-3 pb-3 border-b border-slate-100">{requestDesc}</p>
                  <div className="text-sm text-slate-600 space-y-2 mb-auto">
                    <div className="flex items-center">
                      <span className="font-medium mr-2 w-16">Date:</span>
                      {new Date(meeting.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2 w-16">Time:</span>
                      {new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2 w-16">Duration:</span>
                      {meeting.duration} min
                    </div>
                  </div>
                  {/* View Details button */}
                  <button
                    onClick={() => setSelectedMeeting({ ...meeting, _acceptStatus: acceptStatus, _declineStatus: declineStatus })}
                    className="mt-4 text-xs text-primary-600 hover:text-primary-700 font-medium text-left underline underline-offset-2"
                  >
                    View full meeting details →
                  </button>
                  <div className="flex gap-2 mt-4 pt-1">
                    <button 
                      onClick={() => handleRequest(meeting.id, acceptStatus)}
                      className="flex-1 bg-green-50/50 hover:bg-green-50 text-green-700 font-medium py-1.5 rounded-md flex items-center justify-center transition-colors border border-green-200 text-sm shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept
                    </button>
                    <button 
                      onClick={() => handleRequest(meeting.id, declineStatus)}
                      className="flex-1 bg-red-50/50 hover:bg-red-50 text-red-700 font-medium py-1.5 rounded-md flex items-center justify-center transition-colors border border-red-200 text-sm shadow-sm"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Meetings</h2>
        {upcomingMeetings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-medium mb-1">No upcoming meetings</h3>
            <p className="text-slate-500 text-sm mb-4">You don't have any confirmed meetings scheduled.</p>
            <Link to="/schedule" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Schedule one now &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMeetings.map(meeting => (
              <MeetingCard 
                key={meeting.id} 
                meeting={meeting} 
                onViewDetails={setSelectedMeeting}
              />
            ))}
          </div>
        )}
      </div>
      
      {pastMeetings.length > 0 && (
        <div className="mb-8 opacity-75 grayscale-[0.5] hover:grayscale-0 transition-all">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            Past & Completed
            <span className="ml-2 bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{pastMeetings.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastMeetings.map(meeting => (
              <MeetingCard 
                key={meeting.id} 
                meeting={meeting} 
                onViewDetails={setSelectedMeeting}
              />
            ))}
          </div>
        </div>
      )}

      <MeetingDetailsSidebar 
        meeting={selectedMeeting} 
        isOpen={!!selectedMeeting} 
        onClose={() => setSelectedMeeting(null)}
        onUpdate={() => {
          setSelectedMeeting(null);
          fetchDashboardData();
        }}
      />
    </div>
  );
}
