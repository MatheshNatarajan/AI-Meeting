package com.meeting.api.config;

import com.meeting.api.model.Meeting;
import com.meeting.api.model.Note;
import com.meeting.api.model.User;
import com.meeting.api.repository.MeetingRepository;
import com.meeting.api.repository.NoteRepository;
import com.meeting.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setName("Admin User");
            admin.setEmail("admin@meeting.ai");
            admin.setPassword("password");
            userRepository.save(admin);
        }

        if (meetingRepository.count() == 0) {
            Meeting m1 = new Meeting();
            m1.setId("1");
            m1.setTitle("Q1 Product Sync");
            m1.setDate(OffsetDateTime.parse("2026-03-12T10:00:00Z"));
            m1.setDuration(45);
            m1.setOrganizer("admin@meeting.ai");
            m1.setParticipants(Collections.singletonList("alice@example.com"));
            m1.setStatus("confirmed");
            meetingRepository.save(m1);

            Meeting m2 = new Meeting();
            m2.setId("2");
            m2.setTitle("Design Review");
            m2.setDate(OffsetDateTime.parse("2026-03-13T14:30:00Z"));
            m2.setDuration(60);
            m2.setOrganizer("admin@meeting.ai");
            m2.setParticipants(Collections.singletonList("bob@example.com"));
            m2.setStatus("confirmed");
            meetingRepository.save(m2);

            Meeting m3 = new Meeting();
            m3.setId("3");
            m3.setTitle("Project Kickoff");
            m3.setDate(OffsetDateTime.parse("2026-03-14T11:00:00Z"));
            m3.setDuration(30);
            m3.setOrganizer("colleague@company.com");
            m3.setParticipants(Collections.singletonList("admin@meeting.ai"));
            m3.setStatus("pending");
            meetingRepository.save(m3);

            Meeting m4 = new Meeting();
            m4.setId("4");
            m4.setTitle("Live Team Sync");
            m4.setDate(OffsetDateTime.now().minusMinutes(5));
            m4.setDuration(60);
            m4.setOrganizer("admin@meeting.ai");
            m4.setParticipants(Arrays.asList("alice@example.com", "bob@example.com"));
            m4.setStatus("confirmed");
            meetingRepository.save(m4);

            Note n1 = new Note();
            n1.setMeetingId("1");
            n1.setTitle("Q1 Product Sync");
            n1.setSummary("Discussed upcoming Q1 product goals and roadmap.");
            n1.setKeyPoints(Arrays.asList("Launch new frontend feature by April", "Improve dashboard performance"));
            n1.setActionItems(Arrays.asList("Alice to prepare release notes", "Bob to handle backend optimizations"));
            noteRepository.save(n1);
        }
    }
}
