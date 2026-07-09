import { Calendar, Users, Clock, Video, X, Loader2, XCircle, CheckCircle2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../services/api';

export default function MeetingDetailsSidebar({ meeting, isOpen, onClose, onUpdate, onAccept, onDecline }) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  if (!meeting) return null;

  const dateObj = new Date(meeting.date);
  const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || '';
  const isOrganizer = meeting.organizer === userEmail;
  const isPendingAction = !!(meeting._acceptStatus);
  const requestedByLabel = isPendingAction && meeting.requestedBy && meeting.requestedBy !== userEmail ? meeting.requestedBy : null;

  const handleStatusChange = async (status, newDateStr = null) => {
    setIsProcessing(true);
    try {
      await api.updateMeetingStatus(meeting.id, status, userEmail, newDateStr);
      setShowRescheduleForm(false);
      setRescheduleDate('');
      setRescheduleTime('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await api.updateMeetingStatus(meeting.id, meeting._acceptStatus, userEmail);
      if (onUpdate) onUpdate();
    } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await api.updateMeetingStatus(meeting.id, meeting._declineStatus, userEmail);
      if (onUpdate) onUpdate();
    } catch(e) { console.error(e); } finally { setIsProcessing(false); }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar - sliding from right */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Meeting Details</h2>
          <button 
            onClick={() => {
              setShowRescheduleForm(false);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-primary-600 rounded-xl p-5 text-white mb-5 relative overflow-hidden shadow-sm">
            <div className="relative z-10">
              {isPendingAction && (
                <div className="mb-3">
                  <span className="bg-amber-400/30 text-amber-100 border border-amber-300/50 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    {meeting.status === 'cancel_requested' ? 'Cancellation' : meeting.status === 'reschedule_requested' ? 'Reschedule' : 'Request'}
                  </span>
                  {requestedByLabel && <p className="text-primary-200 text-xs mt-2">By: {requestedByLabel}</p>}
                </div>
              )}
              <h3 className="text-xl font-bold mb-3">{meeting.title}</h3>
              <div className="space-y-3 text-primary-100 text-sm">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{dateString}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{timeString} ({meeting.duration} min)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Meeting Info</h4>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Organizer</p>
                  <p className="font-semibold text-slate-800 text-sm flex items-center">
                    {meeting.organizer} {isOrganizer && <span className="ml-2 bg-primary-100 text-primary-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">You</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className="font-semibold text-slate-800 text-sm capitalize">
                    {meeting.status.replace('_', ' ')}
                  </p>
                </div>
                {meeting.description && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Description</p>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">
                      {meeting.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Participants</h4>
              <ul className="space-y-2">
                {meeting.participants.map((email, idx) => (
                  <li key={idx} className="flex items-center p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm mr-3">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 text-sm">{email}</span>
                    {email === userEmail && <span className="ml-auto bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">You</span>}
                  </li>
                ))}
                {meeting.participants.length === 0 && (
                  <li className="p-3 text-slate-500 italic text-sm text-center">No participants</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
          {showRescheduleForm ? (
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Select New Date & Time
              </h4>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                  <input 
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                  <input 
                    type="time" 
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowRescheduleForm(false)}
                  disabled={isProcessing}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2 rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const dt = new Date(`${rescheduleDate}T${rescheduleTime}`);
                    handleStatusChange('reschedule_requested', dt.toISOString());
                  }}
                  disabled={isProcessing || !rescheduleDate || !rescheduleTime}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* For pending meeting requests - Accept/Decline */}
              {isPendingAction && (
                <div className="flex gap-2.5">
                  <button 
                    onClick={handleDecline}
                    disabled={isProcessing}
                    className="flex-1 bg-white hover:bg-red-50 border border-red-200 text-red-700 font-medium py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Decline
                  </button>
                  {meeting.status === 'pending' && (
                    <button 
                      onClick={() => setShowRescheduleForm(true)}
                      disabled={isProcessing}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                    >
                      Reschedule
                    </button>
                  )}
                  <button 
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-xl flex items-center justify-center transition-colors text-sm"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Accept
                  </button>
                </div>
              )}
              {/* For confirmed meetings - Cancel/Reschedule requests */}
              {meeting.status === 'confirmed' && (
                 <div className="flex gap-3">
                    <button 
                      onClick={() => handleStatusChange('cancel_requested')}
                      disabled={isProcessing}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium py-2 rounded-xl text-sm transition-colors"
                    >
                      Request Cancel
                    </button>
                    <button 
                      onClick={() => setShowRescheduleForm(true)}
                      disabled={isProcessing}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium py-2 rounded-xl text-sm transition-colors"
                    >
                      Reschedule
                    </button>
                 </div>
              )}
              {/* Join button - only for non-completed meetings */}
              {!isPendingAction && (
                meeting.status === 'completed' ? (
                  <button 
                    onClick={() => {
                      onClose();
                      navigate(`/notes/${meeting.id}`);
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View Notes
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      onClose();
                      navigate(`/meeting/${meeting.id}`);
                    }}
                    disabled={isProcessing}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl flex items-center justify-center transition-colors shadow-sm shadow-primary-500/20 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Video className="w-5 h-5 mr-2" />}
                    Join Meeting Room
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
