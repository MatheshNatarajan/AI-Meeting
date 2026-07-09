import { useState, useEffect } from 'react';
import { api } from '../services/api';
import MeetingCard from '../components/MeetingCard';
import MeetingDetailsSidebar from '../components/MeetingDetailsSidebar';
import { Loader2, Search, Filter, Video, Calendar, Clock } from 'lucide-react';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, upcoming, past, live
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const data = await api.getMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Failed to load meetings', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const filteredMeetings = meetings.filter(m => {
    const start = new Date(m.date);
    const end = new Date(start.getTime() + m.duration * 60000);
    const isLive = now >= start && now <= end;
    const isUpcoming = now < start;
    const isPast = now > end;

    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'live') return isLive;
    if (filter === 'upcoming') return isUpcoming;
    if (filter === 'past') return isPast;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage and join your scheduled sessions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none w-64 transition-all"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all cursor-pointer"
          >
            <option value="all">All Meetings</option>
            <option value="live">Live Now</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-slate-900 font-semibold mb-2">No meetings found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {searchQuery ? `We couldn't find any meetings matching "${searchQuery}".` : "You don't have any meetings scheduled in this category."}
          </p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-4 text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map(meeting => (
            <MeetingCard 
              key={meeting.id} 
              meeting={meeting} 
              onViewDetails={(m) => setSelectedMeeting(m)}
            />
          ))}
        </div>
      )}

      <MeetingDetailsSidebar 
        meeting={selectedMeeting} 
        isOpen={!!selectedMeeting} 
        onClose={() => setSelectedMeeting(null)} 
      />
    </div>
  );
}
