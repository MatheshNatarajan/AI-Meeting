import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, ArrowLeft, AlertCircle, Sparkles, CheckCircle2, FileText, MessageSquareText, Calendar, Clock, Users } from 'lucide-react';

export default function AINotes() {
  const { id } = useParams();
  const [notes, setNotes] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch meeting details for context
        const meetings = await api.getMeetings();
        const found = meetings.find(m => m.id === id);
        if (found) {
          setMeeting(found);
        }
      } catch (err) {
        console.error('Failed to load meeting details', err);
      }

      try {
        // Fetch notes/summary
        const noteData = await api.getNotes(id);
        setNotes(noteData);
      } catch (err) {
        setError('Notes not yet available for this meeting.');
        // Provide fallback
        setNotes({
          title: `Meeting ${id}`,
          summary: 'Meeting summary will be generated once the meeting ends and the transcript is processed.',
          actionItems: []
        });
      }

      try {
        // Fetch tasks for this meeting
        const taskData = await api.getTasksByMeeting(id);
        setTasks(taskData || []);
      } catch (err) {
        console.error('Failed to fetch meeting tasks:', err);
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTaskStatus(task.id, newStatus);
      setTasks(tasks.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>

      {error && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">{error}</p>
            <p className="text-xs text-amber-600 mt-1">The meeting transcript will be processed when the meeting ends.</p>
          </div>
        </div>
      )}

      {notes && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 text-primary-600 mb-3 bg-primary-50 w-fit px-3 py-1 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>AI Meeting Report</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{notes.title || (meeting?.title) || `Meeting ${id}`}</h1>
            
            {meeting && (
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center text-slate-600">
                  <Calendar className="w-5 h-5 mr-3 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Date</p>
                    <p className="text-sm font-medium">{new Date(meeting.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <Clock className="w-5 h-5 mr-3 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Time</p>
                    <p className="text-sm font-medium">{new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({meeting.duration} min)</p>
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <Users className="w-5 h-5 mr-3 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Organizer</p>
                    <p className="text-sm font-medium truncate" title={meeting.organizer}>{meeting.organizer}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {notes.summary && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                Meeting Summary
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{notes.summary}</p>
            </div>
          )}



          {/* Extracted Tasks */}
          {tasks.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                Extracted Tasks
                <span className="ml-2 bg-violet-100 text-violet-600 text-xs font-bold px-2 py-0.5 rounded-full">{tasks.length}</span>
              </h3>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-start p-3 rounded-xl border transition-all ${
                      task.status === 'completed'
                        ? 'bg-slate-50 border-slate-100'
                        : 'bg-white border-slate-200 hover:border-primary-200'
                    }`}
                  >
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className="mr-3 mt-0.5 shrink-0 focus:outline-none"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-primary-400 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {task.taskText}
                        </span>
                        {task.priority && task.priority !== 'medium' && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      {task.assignee && (
                        <p className="text-xs text-slate-400 mt-0.5">Assigned to: {task.assignee}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items from Notes */}
          {notes.actionItems && notes.actionItems.length > 0 && tasks.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                Action Items
              </h3>
              <ul className="space-y-2">
                {notes.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-3 flex-shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Transcript */}
          {notes.fullTranscript && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                <MessageSquareText className="w-4 h-4 mr-2" />
                {showTranscript ? 'Hide' : 'View'} Full Transcript
              </button>

              {showTranscript && (
                <div className="mt-4 bg-slate-50 rounded-xl border border-slate-100 p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                    {notes.fullTranscript}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
