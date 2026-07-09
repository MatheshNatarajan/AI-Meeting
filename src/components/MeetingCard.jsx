import { Calendar, Users, Clock, Video, CheckCircle2, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MeetingCard({ meeting, onViewDetails }) {
  const navigate = useNavigate();
  const dateObj = new Date(meeting.date);
  const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  // Get current user to see if they are the organizer
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || '';
  const isOrganizer = meeting.organizer === userEmail;

  // Determine if meeting is over
  const now = new Date();
  const meetingEndTime = new Date(dateObj.getTime() + meeting.duration * 60000);
  const isPastMeeting = now > meetingEndTime;

  return (
    <div className={`bg-white p-5 rounded-lg border shadow-sm hover:shadow transition-shadow flex flex-col ${
      meeting.status === 'pending' ? 'border-amber-200/60 hover:border-amber-300' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 text-lg mb-1 pr-4">{meeting.title}</h3>
          <div className="flex items-center text-slate-500 text-sm space-x-3">
            <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {dateString}</span>
            <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {timeString}</span>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">
            {meeting.duration} min
          </div>
          <div className={`flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider ${
            meeting.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
            (meeting.status === 'completed' || meeting.status === 'ended') ? 'bg-green-50 text-green-600 border-green-200' : 
            'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            {meeting.status === 'pending' ? <Clock3 className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
            {meeting.status}
          </div>
        </div>
      </div>
      <div className="flex items-center text-slate-500 text-sm mb-5 mt-auto">
        <Users className="w-3.5 h-3.5 mr-2" />
        <span className="truncate">
          {isOrganizer 
            ? `Invitees: ${meeting.participants.join(', ')}` 
            : `Organizer: ${meeting.organizer}`}
        </span>
      </div>
      
      <div className="flex gap-2.5 mt-auto">
        {meeting.status === 'completed' || meeting.status === 'ended' ? (
          <button 
            onClick={() => navigate(`/notes/${meeting.id}`)}
            className="flex-1 text-sm font-medium py-1.5 rounded-md flex items-center justify-center transition-colors shadow-sm bg-slate-800 hover:bg-slate-900 text-white"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Notes
          </button>
        ) : (
          <button 
            onClick={() => navigate(`/meeting/${meeting.id}`)}
            disabled={meeting.status === 'cancelled'}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md flex items-center justify-center transition-colors shadow-sm ${
              meeting.status === 'cancelled'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 mr-1.5" />
            Join
          </button>
        )}
        <button 
          onClick={() => {
            if (onViewDetails) {
              onViewDetails(meeting);
            } else {
              navigate(`/details/${meeting.id}`);
            }
          }}
          className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-sm font-medium py-1.5 rounded-md transition-colors shadow-sm"
        >
          Details
        </button>
      </div>
    </div>
  );
}
