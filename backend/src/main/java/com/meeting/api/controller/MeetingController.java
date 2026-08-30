package com.meeting.api.controller;

import com.meeting.api.model.Meeting;
import com.meeting.api.service.MeetingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.meeting.api.dto.MeetingUpdateDTO;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MeetingController {

    @Autowired
    private MeetingService meetingService;

    @GetMapping("/meetings")
    public List<Meeting> getMeetings() {
        return meetingService.getAllMeetings();
    }

    @PostMapping("/meetings")
    public Meeting createMeeting(@RequestBody com.meeting.api.dto.MeetingCreateDTO dto) {
        return meetingService.createMeeting(dto);
    }

    @GetMapping("/meetings/{id}")
    public ResponseEntity<Meeting> getMeeting(@PathVariable String id) {
        return meetingService.getMeetingById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/meetings/{id}/status")
    public ResponseEntity<Meeting> updateMeetingStatus(
            @PathVariable String id,
            @RequestBody MeetingUpdateDTO updates) {
        
        Optional<Meeting> updatedMeeting = meetingService.updateMeetingStatus(id, updates);
        return updatedMeeting
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/meetings/busy-slots")
    public List<Map<String, String>> getBusySlots(@RequestParam String email) {
        return meetingService.getBusySlots(email);
    }

    @DeleteMapping("/meetings/{id}")
    public ResponseEntity<Void> deleteMeeting(@PathVariable String id) {
        boolean deleted = meetingService.deleteMeeting(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().build();
    }
}
