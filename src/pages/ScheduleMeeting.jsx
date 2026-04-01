import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Calendar, Clock, Users, FileText, CheckCircle2, Search, Zap } from 'lucide-react';

export default function ScheduleMeeting() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availableSlots, setAvailableSlots] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '30',
    participantEmail: '',
    selectedDate: '',
    selectedTime: ''
  });

  const checkAvailability = async (e) => {
    e.preventDefault();
    if (!formData.participantEmail) return;
    
    setCheckingAvailability(true);
    setAvailableSlots(null);
    
    try {
      const userExists = await api.checkUserExists(formData.participantEmail.toLowerCase());
      
      if (!userExists) {
        alert("This user is not registered with MeetSync. You can only schedule meetings with registered users.");
        setCheckingAvailability(false);
        return;
      }

      // 1. Fetch busy slots for both parties
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const myEmail = currentUser.email || '';
      
      const [inviteeBusy, myBusy] = await Promise.all([
        api.getBusySlots(formData.participantEmail.toLowerCase()),
        api.getBusySlots(myEmail)
      ]);

      const allBlocked = [...inviteeBusy, ...myBusy].map(slot => ({
        start: new Date(slot.start),
        end: new Date(slot.end)
      }));

      // 2. Generate slots for the next 7 days based on selected duration
      const slots = [];
      const now = new Date();
      const durationMins = parseInt(formData.duration) || 30;
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        
        const times = [];

        // For today, generate an immediate slot rounded to the next 5 minutes (e.g., 4:00 -> 4:05)
        if (i === 0) {
          const promptTime = new Date();
          promptTime.setMinutes(promptTime.getMinutes() + 2); // At least 2 min buffer
          const remainder = promptTime.getMinutes() % 5;
          if (remainder !== 0) {
            promptTime.setMinutes(promptTime.getMinutes() + (5 - remainder)); // Round up to nearest 5
          }
          promptTime.setSeconds(0);
          promptTime.setMilliseconds(0);

          let h = promptTime.getHours();
          const mins = promptTime.getMinutes();
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12;
          h = h ? h : 12;
          const timeStr = `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
          
          const promptEnd = new Date(promptTime.getTime() + durationMins * 60000);
          const isBlocked = allBlocked.some(blocked => 
            promptTime < blocked.end && promptEnd > blocked.start
          );
          if (!isBlocked) {
            times.push(timeStr);
          }
        }

        // Set range 09:00 to 17:00 (5 PM)
        let hour = 9;
        let minute = 0;
        
        while (hour < 17) {
          const slotTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
          const slotEnd = new Date(slotTime.getTime() + durationMins * 60000);
          
          // Only future slots
          if (slotTime > now) {
            // Check for overlaps
            const isBlocked = allBlocked.some(blocked => 
              slotTime < blocked.end && slotEnd > blocked.start
            );
            
            if (!isBlocked) {
              let h = slotTime.getHours();
              const mins = slotTime.getMinutes();
              const ampm = h >= 12 ? 'PM' : 'AM';
              h = h % 12;
              h = h ? h : 12;
              const timeDisplay = `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
              
              if (!times.includes(timeDisplay)) {
                times.push(timeDisplay);
              }
            }
          }

          // Advance by selected duration
          minute += durationMins;
          while (minute >= 60) {
            minute -= 60;
            hour += 1;
          }
        }

        if (times.length > 0) {
          slots.push({ date: dateStr, times });
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to check availability', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSelectSlot = (date, time) => {
    setFormData({
      ...formData,
      selectedDate: date,
      selectedTime: time
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.selectedDate || !formData.selectedTime) {
      alert("Please select an available time slot first.");
      return;
    }

    setLoading(true);
    
    try {
      // Parse "10:00 AM" or "02:00 PM" properly
      const [time, modifier] = formData.selectedTime.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      
      const dateTime = new Date(`${formData.selectedDate}T${String(hours).padStart(2, '0')}:${minutes}:00`).toISOString();
      
      await api.createMeeting({
        title: formData.title,
        description: formData.description,
        date: dateTime,
        duration: parseInt(formData.duration),
        participants: [formData.participantEmail]
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Failed to schedule meeting', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (availableSlots && formData.participantEmail) {
      checkAvailability({ preventDefault: () => {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.duration]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Schedule Meeting</h1>
        <p className="text-slate-500 mt-1 text-sm">Check availability and propose a time for your meeting.</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700 font-medium shadow-sm transition-all duration-300">
          <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
          Meeting request sent successfully! Redirecting...
        </div>
      )}

      <div className="flex gap-6 flex-col md:flex-row items-start">
        <div className="w-full md:w-2/3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="title">Meeting Title</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. Project Discovery Sync"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="description">Description (Optional)</label>
                  <div className="relative">
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Briefly describe the purpose of the meeting..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[100px] resize-y"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="participantEmail">Invitee Email</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="participantEmail"
                        name="participantEmail"
                        type="email"
                        value={formData.participantEmail}
                        onChange={handleChange}
                        placeholder="colleague@company.com"
                        className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={checkAvailability}
                        disabled={checkingAvailability || !formData.participantEmail}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center shadow-sm"
                      >
                        {checkingAvailability ? 'Checking...' : (
                          <>
                            <Search className="w-3 h-3 mr-1" />
                            Check
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="duration">Duration</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        id="duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                      </select>
                    </div>
                  </div>
                </div>

                {formData.selectedDate && formData.selectedTime && (
                  <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center text-primary-800">
                      <Calendar className="w-5 h-5 mr-3 text-primary-500" />
                      <div>
                        <p className="font-semibold text-sm">Selected Time for {formData.participantEmail}</p>
                        <p className="text-xs opacity-80">{formData.selectedDate} at {formData.selectedTime}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, selectedDate: '', selectedTime: ''})}
                      className="text-xs font-medium text-primary-600 hover:text-primary-800 bg-white px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors mr-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || success || !formData.selectedDate}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary-500/30 disabled:opacity-70 flex items-center"
                  >
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right side panel: Availability results */}
        <div className="w-full md:w-1/3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50/50 text-slate-800 font-semibold shrink-0">
              <Zap className="w-4 h-4 text-amber-500 mr-2" />
              Availability Magic
            </div>
            
            <div className="p-4 overflow-y-auto bg-slate-50/30 custom-scrollbar max-h-[600px]">
              {!availableSlots && !checkingAvailability && (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 text-center py-10">
                  <Calendar className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Enter an email and click Check to see their free times.</p>
                </div>
              )}
              
              {checkingAvailability && (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 py-10">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm">Syncing calendars...</p>
                </div>
              )}

              {availableSlots && !checkingAvailability && (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Suggested Times</p>
                  {availableSlots.map(slot => (
                    <div key={slot.date} className="bg-white border text-sm border-slate-100 rounded-xl p-3 shadow-sm">
                      <div className="font-semibold text-slate-700 mb-2 pb-2 border-b border-slate-50 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {slot.times.map(time => {
                          const isSelected = formData.selectedDate === slot.date && formData.selectedTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleSelectSlot(slot.date, time)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors text-center border ${
                                isSelected 
                                  ? 'bg-primary-500 text-white border-primary-600 shadow-sm' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
