import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Calendar, Clock, Users, FileText, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Hardcoded available slots per weekday (0=Sun … 6=Sat) ──────────────────
const SLOTS_BY_WEEKDAY = {
  0: [], // Sunday — unavailable
  1: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM'],
  2: ['09:00 AM', '10:00 AM', '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM', '03:00 PM', '03:30 PM', '04:30 PM'],
  3: ['09:30 AM', '10:30 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '04:30 PM'],
  4: ['09:00 AM', '09:30 AM', '10:00 AM', '11:30 AM', '01:00 PM', '02:30 PM', '03:30 PM', '04:00 PM'],
  5: ['09:00 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '02:30 PM', '03:00 PM'],
  6: [], // Saturday — unavailable
};

// Build the next 14 days for the calendar
function buildCalendarDays() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      dateStr:   d.toISOString().slice(0, 10),
      dayNum:    d.getDate(),
      shortDay:  d.toLocaleDateString('en-US', { weekday: 'short' }),
      monthShort:d.toLocaleDateString('en-US', { month: 'short' }),
      weekday:   d.getDay(),
      isToday:   i === 0,
    });
  }
  return days;
}

const CALENDAR_DAYS = buildCalendarDays();

export default function ScheduleMeeting() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = first 7 days, 1 = next 7 days

  const [formData, setFormData] = useState({
    title:            '',
    description:      '',
    duration:         '30',
    participantEmail: '',
  });

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Visible 7-day window based on weekOffset
  const visibleDays = CALENDAR_DAYS.slice(weekOffset * 7, weekOffset * 7 + 7);

  // Get slots for the currently selected date
  const slotsForDate = selectedDate
    ? (() => {
        const day = CALENDAR_DAYS.find(d => d.dateStr === selectedDate);
        return day ? SLOTS_BY_WEEKDAY[day.weekday] || [] : [];
      })()
    : [];

  const handleDateClick = (day) => {
    if (SLOTS_BY_WEEKDAY[day.weekday]?.length === 0) return; // weekend / no slots
    setSelectedDate(day.dateStr);
    setSelectedTime(''); // clear previously selected time
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert('Please select a date and a time slot first.');
      return;
    }
    setLoading(true);
    try {
      const [time, modifier] = selectedTime.split(' ');
      let [hours, minutes]   = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;

      const dateTime = new Date(
        `${selectedDate}T${String(hours).padStart(2, '0')}:${minutes}:00`
      ).toISOString();

      await api.createMeeting({
        title:        formData.title,
        description:  formData.description,
        date:         dateTime,
        duration:     parseInt(formData.duration),
        participants: [formData.participantEmail],
      });

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Failed to schedule meeting', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Schedule Meeting</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Pick a date from the calendar — available slots will appear instantly.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center
                        text-green-700 font-medium shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
          Meeting request sent successfully! Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Meeting details card ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="title">
              Meeting Title
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="title" name="title" type="text" required
                value={formData.title} onChange={handleChange}
                placeholder="e.g. Project Discovery Sync"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl
                           focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500
                           focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="description">
              Description <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="description" name="description"
              value={formData.description} onChange={handleChange}
              placeholder="Briefly describe the purpose of the meeting…"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         transition-all min-h-[90px] resize-y"
            />
          </div>

          {/* Email + Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="participantEmail">
                Invitee Email
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="participantEmail" name="participantEmail" type="email" required
                  value={formData.participantEmail} onChange={handleChange}
                  placeholder="colleague@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl
                             focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500
                             focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="duration">
                Duration
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  id="duration" name="duration"
                  value={formData.duration} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl
                             focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500
                             focus:border-transparent transition-all appearance-none"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Day-wise Calendar card ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              Select a Date
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setWeekOffset(0); setSelectedDate(''); setSelectedTime(''); }}
                disabled={weekOffset === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-500 px-1">
                {weekOffset === 0 ? 'This week' : 'Next week'}
              </span>
              <button
                type="button"
                onClick={() => { setWeekOffset(1); setSelectedDate(''); setSelectedTime(''); }}
                disabled={weekOffset === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7-day strip */}
          <div className="grid grid-cols-7 gap-2">
            {visibleDays.map((day) => {
              const unavailable = SLOTS_BY_WEEKDAY[day.weekday]?.length === 0;
              const isSelected  = selectedDate === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={unavailable}
                  title={unavailable ? 'No slots available' : ''}
                  className={`flex flex-col items-center py-3 px-1 rounded-xl border text-xs font-medium
                              transition-all duration-150 select-none
                    ${unavailable
                      ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary-600 text-white border-primary-700 shadow-md shadow-primary-200 scale-105'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 hover:scale-105'
                    }`}
                >
                  <span className="opacity-70 mb-0.5">{day.shortDay}</span>
                  <span className="text-lg font-bold leading-none">{day.dayNum}</span>
                  <span className="opacity-70 mt-0.5">{day.monthShort}</span>
                  {day.isToday && !isSelected && (
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-400 block" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Available Slots card ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Available Time Slots
            {selectedDate && (
              <span className="text-xs font-normal text-slate-400 ml-1">
                —&nbsp;
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric'
                })}
              </span>
            )}
          </p>

          {/* Empty state — no date chosen yet */}
          {!selectedDate && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
              <Calendar className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm">Click any date above to see available slots.</p>
            </div>
          )}

          {/* No slots on that day */}
          {selectedDate && slotsForDate.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
              <p className="text-sm">No slots available on this date. Please pick another day.</p>
            </div>
          )}

          {/* Slots grid */}
          {selectedDate && slotsForDate.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slotsForDate.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all text-center
                      ${isSelected
                        ? 'bg-primary-500 text-white border-primary-600 shadow-sm scale-105'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 hover:scale-105'
                      }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Selection confirmation bar ─────────────────────────────────── */}
        {selectedDate && selectedTime && (
          <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center text-primary-800">
              <CheckCircle2 className="w-5 h-5 mr-3 text-primary-500 shrink-0" />
              <div>
                <p className="font-semibold text-sm">
                  Selected for {formData.participantEmail || 'invitee'}
                </p>
                <p className="text-xs opacity-70">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                  &nbsp;at&nbsp;{selectedTime}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedDate(''); setSelectedTime(''); }}
              className="text-xs font-medium text-primary-600 hover:text-primary-800 bg-white border
                         border-primary-200 px-3 py-1 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* ── Form actions ──────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button" onClick={() => navigate('/')}
            className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || success || !selectedDate || !selectedTime}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-8 py-3 rounded-xl
                       transition-all shadow-lg shadow-primary-500/30 disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending…
              </>
            ) : 'Send Request'}
          </button>
        </div>

      </form>
    </div>
  );
}
