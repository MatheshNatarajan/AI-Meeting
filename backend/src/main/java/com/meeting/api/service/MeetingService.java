package com.meeting.api.service;

import com.meeting.api.model.Meeting;
import com.meeting.api.model.User;
import com.meeting.api.enums.MeetingStatus;
import com.meeting.api.repository.MeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.meeting.api.dto.MeetingUpdateDTO;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashMap;

@Service
public class MeetingService {

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private com.meeting.api.repository.UserRepository userRepository;

    public List<Meeting> getAllMeetings() {
        return meetingRepository.findAll();
    }

    private User getOrCreateUser(String email) {
        if (email == null || email.trim().isEmpty()) return null;
        return userRepository.findByEmail(email).orElseGet(() -> {
            User ghost = new User();
            ghost.setEmail(email);
            ghost.setName(email.split("@")[0]);
            ghost.setPassword(UUID.randomUUID().toString()); // ghost password
            return userRepository.save(ghost);
        });
    }

    public Meeting createMeeting(com.meeting.api.dto.MeetingCreateDTO dto) {
        Meeting meeting = new Meeting();
        meeting.setId(UUID.randomUUID().toString());
        meeting.setTitle(dto.getTitle());
        if (dto.getDate() != null) {
            meeting.setDate(OffsetDateTime.parse(dto.getDate()));
        }
        meeting.setDuration(dto.getDuration());
        
        if (dto.getOrganizerEmail() != null) {
            meeting.setOrganizer(getOrCreateUser(dto.getOrganizerEmail()));
        }
        
        if (dto.getParticipants() != null) {
            List<User> participants = new ArrayList<>();
            for (String email : dto.getParticipants()) {
                User u = getOrCreateUser(email);
                if (u != null) participants.add(u);
            }
            meeting.setParticipants(participants);
        }
        
        meeting.setStatus(meeting.getParticipants() != null && !meeting.getParticipants().isEmpty() ? MeetingStatus.PENDING.getValue() : MeetingStatus.CONFIRMED.getValue());
        
        return meetingRepository.save(meeting);
    }

    public Optional<Meeting> getMeetingById(String id) {
        return meetingRepository.findById(id);
    }

    public Optional<Meeting> updateMeetingStatus(String id, MeetingUpdateDTO updates) {
        Optional<Meeting> meetingOpt = meetingRepository.findById(id);
        if (!meetingOpt.isPresent()) {
            return Optional.empty();
        }

        Meeting meeting = meetingOpt.get();
        if (updates.getStatus() != null) {
            // No manual parsing needed! Spring already guaranteed this is a valid Enum.
            meeting.setStatus(updates.getStatus().getValue());
        }
        if (updates.getDate() != null) {
            meeting.setDate(OffsetDateTime.parse(updates.getDate()));
        }
        
        return Optional.of(meetingRepository.save(meeting));
    }

    public List<Map<String, String>> getBusySlots(String email) {
        List<Meeting> meetings = meetingRepository.findBusyMeetingsForUser(email);
        List<Map<String, String>> busySlots = new ArrayList<>();
        
        for (Meeting m : meetings) {
            Map<String, String> slot = new HashMap<>();
            slot.put("start", m.getDate().toString());
            slot.put("end", m.getDate().plusMinutes(m.getDuration()).toString());
            busySlots.add(slot);
        }
        return busySlots;
    }

    public boolean deleteMeeting(String id) {
        if (!meetingRepository.existsById(id)) {
            return false;
        }
        meetingRepository.deleteById(id);
        return true;
    }
}
