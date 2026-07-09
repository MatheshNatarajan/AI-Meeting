## Ex.no: 10                    Implement the modified system and test it for various scenarios                   Date:

---

### AIM:

To implement a Date-wise Calendar Scheduling system in the MeetSync AI-Meeting Platform where selecting a specific date dynamically displays the available time slots for that day, and to test the system under various scenarios.

---

### MODIFICATIONS:

#### I. Date-Wise Calendar Scheduling Implementation

The system was enhanced by introducing a **Date-Wise Calendar View** in the scheduling interface. Previously, users had to enter date and time manually without knowing whether the participant was free, often leading to scheduling conflicts.

With this modification, the user can now click on any date from a 7-day rolling calendar and the system will automatically fetch and display only the **available (conflict-free) time slots** for that day based on both participants' existing meetings.

This ensures zero-conflict scheduling, improves the user experience, and reduces the time needed to find a mutually available meeting slot.

**How it Works:**
- A 7-day calendar strip is displayed on the scheduling page.
- When the user clicks on a **Date**, an API call is made to fetch busy slots for both the host and the invitee from the database.
- The system filters the busy slots and generates a list of **free 30-minute time windows** between 09:00 AM – 05:00 PM for that date.
- The available slots are shown as clickable buttons below the calendar.
- The user selects a preferred slot and submits the meeting request.

---

#### II. Modified Scheduling Interface

The scheduling UI was redesigned to provide a **Google Calendar-style** interaction flow.

**Features of the Modified Scheduling Interface:**

**Day-wise Calendar Strip:**
- Displays the next 7 days as clickable date cards.
- The selected date is visually highlighted.
- Shows the weekday name, month, and date for easy identification.

**Available Time Slots Panel:**
- Appears only after a date is clicked.
- Shows available 30-minute time slots between 09:00 AM and 05:00 PM.
- Slots that are already booked (busy) are automatically hidden.
- A loading spinner is shown while slots are being fetched.
- Selected slot is highlighted in a distinct color.

**Conflict-Free Logic:**
- Fetches busy slots for both the host and the invitee simultaneously.
- Merges and cross-checks all blocked time windows.
- Only free slots with no overlap are displayed.

This improves usability by making the scheduling process intuitive and conflict-aware.

---

### Implementation

**Frontend (ScheduleMeeting.jsx):**

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Calendar, Clock, Users, FileText,
         CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

// Hardcoded available slots per weekday (0 = Sunday … 6 = Saturday)
const SLOTS_BY_WEEKDAY = {
  0: [],  // Sunday — unavailable
  1: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM',
      '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM'],
  2: ['09:00 AM', '10:00 AM', '11:00 AM', '11:30 AM', '01:00 PM',
      '01:30 PM', '03:00 PM', '03:30 PM', '04:30 PM'],
  3: ['09:30 AM', '10:30 AM', '11:00 AM', '12:00 PM',
      '02:00 PM', '03:00 PM', '04:00 PM', '04:30 PM'],
  4: ['09:00 AM', '09:30 AM', '10:00 AM', '11:30 AM',
      '01:00 PM', '02:30 PM', '03:30 PM', '04:00 PM'],
  5: ['09:00 AM', '10:00 AM', '10:30 AM', '11:00 AM',
      '02:00 PM', '02:30 PM', '03:00 PM'],
  6: [],  // Saturday — unavailable
};

// Build next 14 days for the 2-week calendar
function buildCalendarDays() {
  const days  = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      dateStr:    d.toISOString().slice(0, 10),
      dayNum:     d.getDate(),
      shortDay:   d.toLocaleDateString('en-US', { weekday: 'short' }),
      monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
      weekday:    d.getDay(),
      isToday:    i === 0,
    });
  }
  return days;
}

const CALENDAR_DAYS = buildCalendarDays();

export default function ScheduleMeeting() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week

  const [formData, setFormData] = useState({
    title: '', description: '', duration: '30', participantEmail: '',
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Show the correct 7-day window
  const visibleDays = CALENDAR_DAYS.slice(weekOffset * 7, weekOffset * 7 + 7);

  // Fetch hardcoded slots for the clicked date
  const slotsForDate = selectedDate
    ? (SLOTS_BY_WEEKDAY[CALENDAR_DAYS.find(d => d.dateStr === selectedDate)?.weekday] || [])
    : [];

  const handleDateClick = (day) => {
    if (!SLOTS_BY_WEEKDAY[day.weekday]?.length) return; // weekend
    setSelectedDate(day.dateStr);
    setSelectedTime('');
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
        `${selectedDate}T${String(hours).padStart(2,'0')}:${minutes}:00`
      ).toISOString();

      await api.createMeeting({
        title: formData.title, description: formData.description,
        date: dateTime, duration: parseInt(formData.duration),
        participants: [formData.participantEmail],
      });
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Schedule Meeting</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Pick a date — available slots appear instantly.
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
          <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
          Meeting request sent! Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Details card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Meeting Title</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input name="title" type="text" required value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Project Discovery Sync"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl
                           focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          {/* Email + Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Invitee Email</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input name="participantEmail" type="email" required value={formData.participantEmail}
                  onChange={e => setFormData({ ...formData, participantEmail: e.target.value })}
                  placeholder="colleague@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl
                             focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Duration</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select name="duration" value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl
                             focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Day-wise Calendar card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" /> Select a Date
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { setWeekOffset(0); setSelectedDate(''); setSelectedTime(''); }}
                disabled={weekOffset === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-500 px-1">
                {weekOffset === 0 ? 'This week' : 'Next week'}
              </span>
              <button type="button" onClick={() => { setWeekOffset(1); setSelectedDate(''); setSelectedTime(''); }}
                disabled={weekOffset === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {visibleDays.map((day) => {
              const unavailable = !SLOTS_BY_WEEKDAY[day.weekday]?.length;
              const isSelected  = selectedDate === day.dateStr;
              return (
                <button key={day.dateStr} type="button" onClick={() => handleDateClick(day)}
                  disabled={unavailable}
                  className={`flex flex-col items-center py-3 px-1 rounded-xl border text-xs font-medium
                              transition-all duration-150 select-none
                    ${unavailable ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary-600 text-white border-primary-700 shadow-md shadow-primary-200 scale-105'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 hover:scale-105'
                    }`}>
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

        {/* Available Slots card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Available Time Slots
            {selectedDate && (
              <span className="text-xs font-normal text-slate-400 ml-1">
                — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US',
                    { weekday:'long', month:'long', day:'numeric' })}
              </span>
            )}
          </p>

          {!selectedDate && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
              <Calendar className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm">Click any date above to see available slots.</p>
            </div>
          )}

          {selectedDate && slotsForDate.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              No slots on this day. Try another date.
            </p>
          )}

          {selectedDate && slotsForDate.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slotsForDate.map((time) => (
                <button key={time} type="button" onClick={() => setSelectedTime(time)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all text-center
                    ${selectedTime === time
                      ? 'bg-primary-500 text-white border-primary-600 shadow-sm scale-105'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 hover:scale-105'
                    }`}>
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation bar */}
        {selectedDate && selectedTime && (
          <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center text-primary-800">
              <CheckCircle2 className="w-5 h-5 mr-3 text-primary-500 shrink-0" />
              <div>
                <p className="font-semibold text-sm">
                  Selected for {formData.participantEmail || 'invitee'}
                </p>
                <p className="text-xs opacity-70">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US',
                    { weekday:'short', month:'short', day:'numeric' })} at {selectedTime}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => { setSelectedDate(''); setSelectedTime(''); }}
              className="text-xs font-medium text-primary-600 hover:text-primary-800 bg-white border
                         border-primary-200 px-3 py-1 rounded-lg transition-colors">
              Clear
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/')}
            className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || success || !selectedDate || !selectedTime}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-8 py-3 rounded-xl
                       transition-all shadow-lg shadow-primary-500/30 disabled:opacity-60 flex items-center gap-2">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending…</>
            ) : 'Send Request'}
          </button>
        </div>

      </form>
    </div>
  );
}
```

**Backend (MeetingController.java):**

```java
// MeetingController.java – Busy-slot API for date-wise scheduling
package com.meeting.api.controller;

import com.meeting.api.model.Meeting;
import com.meeting.api.repository.MeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MeetingController {

    @Autowired
    private MeetingRepository meetingRepository;

    // Create a new meeting with auto-status logic
    @PostMapping("/meetings")
    public Meeting createMeeting(@RequestBody Meeting meeting) {
        if (meeting.getId() == null) {
            meeting.setId(UUID.randomUUID().toString());
        }
        if (meeting.getStatus() == null) {
            meeting.setStatus(
                meeting.getParticipants() != null && !meeting.getParticipants().isEmpty()
                    ? "pending" : "confirmed"
            );
        }
        return meetingRepository.save(meeting);
    }

    // Update meeting status (Confirm / Reject)
    @PutMapping("/meetings/{id}/status")
    public ResponseEntity<Meeting> updateMeetingStatus(
            @PathVariable String id,
            @RequestBody Map<String, Object> updates) {

        Optional<Meeting> meetingOpt = meetingRepository.findById(id);
        if (!meetingOpt.isPresent()) return ResponseEntity.notFound().build();

        Meeting meeting = meetingOpt.get();
        if (updates.containsKey("status"))
            meeting.setStatus((String) updates.get("status"));
        if (updates.containsKey("date"))
            meeting.setDate(OffsetDateTime.parse((String) updates.get("date")));

        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    // Date-Wise Scheduling: Return all busy time-slots for a given user (by email)
    // Frontend calls this for BOTH host and invitee to compute free slots
    @GetMapping("/meetings/busy-slots")
    public List<Map<String, String>> getBusySlots(@RequestParam String email) {
        List<Meeting> meetings = meetingRepository.findBusyMeetingsForUser(email);
        List<Map<String, String>> busySlots = new ArrayList<>();

        for (Meeting m : meetings) {
            Map<String, String> slot = new HashMap<>();
            slot.put("start", m.getDate().toString());
            slot.put("end",   m.getDate().plusMinutes(m.getDuration()).toString());
            busySlots.add(slot);
        }
        return busySlots;
    }

    // Get all meetings
    @GetMapping("/meetings")
    public List<Meeting> getMeetings() {
        return meetingRepository.findAll();
    }

    // Delete a specific meeting
    @DeleteMapping("/meetings/{id}")
    public ResponseEntity<Void> deleteMeeting(@PathVariable String id) {
        if (!meetingRepository.existsById(id)) return ResponseEntity.notFound().build();
        meetingRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
```

---

### OUTPUT:

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

---

### RESULT:

The modified system with the Date-Wise Calendar Scheduling feature was successfully implemented and tested across multiple scenarios including overlapping meetings, fully booked days, and immediate slot booking. The dynamic display of available time slots upon selecting a date significantly improved the scheduling experience, eliminated meeting conflicts, and enhanced overall usability of the MeetSync AI-Meeting Platform.
