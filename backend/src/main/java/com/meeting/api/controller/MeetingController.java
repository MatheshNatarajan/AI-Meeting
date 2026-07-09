package com.meeting.api.controller;

import com.meeting.api.model.Meeting;
import com.meeting.api.repository.MeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // handled generally, but added for safety
public class MeetingController {

    @Autowired
    private MeetingRepository meetingRepository;

    @GetMapping("/meetings")
    public List<Meeting> getMeetings() {
        return meetingRepository.findAll();
    }

    @PostMapping("/meetings")
    public Meeting createMeeting(@RequestBody Meeting meeting) {
        if (meeting.getId() == null) {
            meeting.setId(java.util.UUID.randomUUID().toString());
        }
        if (meeting.getStatus() == null) {
            meeting.setStatus(meeting.getParticipants() != null && !meeting.getParticipants().isEmpty() ? "pending" : "confirmed");
        }
        return meetingRepository.save(meeting);
    }

    @GetMapping("/meetings/{id}")
    public ResponseEntity<Meeting> getMeeting(@PathVariable String id) {
        return meetingRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/meetings/{id}/status")
    public ResponseEntity<Meeting> updateMeetingStatus(
            @PathVariable String id,
            @RequestBody Map<String, Object> updates) {
        
        Optional<Meeting> meetingOpt = meetingRepository.findById(id);
        if (!meetingOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Meeting meeting = meetingOpt.get();
        if (updates.containsKey("status")) {
            meeting.setStatus((String) updates.get("status"));
        }
        if (updates.containsKey("date")) {
            meeting.setDate(OffsetDateTime.parse((String) updates.get("date")));
        }
        
        return ResponseEntity.ok(meetingRepository.save(meeting));
    }

    @GetMapping("/meetings/busy-slots")
    public List<Map<String, String>> getBusySlots(@RequestParam String email) {
        List<Meeting> meetings = meetingRepository.findBusyMeetingsForUser(email);
        java.util.List<Map<String, String>> busySlots = new java.util.ArrayList<>();
        
        for (Meeting m : meetings) {
            Map<String, String> slot = new java.util.HashMap<>();
            slot.put("start", m.getDate().toString());
            slot.put("end", m.getDate().plusMinutes(m.getDuration()).toString());
            busySlots.add(slot);
        }
        return busySlots;
    }

    @DeleteMapping("/meetings/{id}")
    public ResponseEntity<Void> deleteMeeting(@PathVariable String id) {
        if (!meetingRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        meetingRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/meetings/all")
    public ResponseEntity<Void> deleteAllMeetings() {
        meetingRepository.deleteAll();
        return ResponseEntity.ok().build();
    }
}
