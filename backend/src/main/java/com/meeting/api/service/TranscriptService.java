package com.meeting.api.service;

import com.meeting.api.model.Meeting;
import com.meeting.api.model.MeetingTask;
import com.meeting.api.model.Note;
import com.meeting.api.repository.MeetingRepository;
import com.meeting.api.repository.MeetingTaskRepository;
import com.meeting.api.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class TranscriptService {

    @Autowired
    private NlpService nlpService;

    @Autowired
    private MeetingTaskRepository meetingTaskRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    public void processTranscript(String meetingId, String transcript) {
        String meetingTitle = "Meeting " + meetingId;
        Optional<Meeting> meetingOpt = meetingRepository.findById(meetingId);
        if (meetingOpt.isPresent()) {
            meetingTitle = meetingOpt.get().getTitle();
        }
        
        final String finalMeetingTitle = meetingTitle;

        // Fire and forget - spawn two independent threads without waiting for them
        CompletableFuture.runAsync(() -> 
            extractAndSaveTasks(transcript, meetingId, finalMeetingTitle)
        );

        CompletableFuture.runAsync(() -> 
            generateAndSaveSummary(transcript, meetingId, finalMeetingTitle)
        );
    }

    private void extractAndSaveTasks(String transcript, String meetingId, String meetingTitle) {
        List<MeetingTask> extractedTasks = nlpService.extractTasks(transcript, meetingId, meetingTitle);
        if (extractedTasks != null && !extractedTasks.isEmpty()) {
            meetingTaskRepository.saveAll(extractedTasks);
        }
    }

    private void generateAndSaveSummary(String transcript, String meetingId, String meetingTitle) {
        String summary = nlpService.generateSummary(transcript);
        
        Optional<Note> existingNote = noteRepository.findByMeetingId(meetingId);
        Note note = existingNote.orElseGet(Note::new);
        note.setMeetingId(meetingId);
        note.setTitle(meetingTitle);
        note.setFullTranscript(transcript);
        note.setSummary(summary);
        note.setActionItems(new ArrayList<>()); // Redundant now that we have the Tasks table
        noteRepository.save(note);
    }

    public List<MeetingTask> getAllTasks() {
        return meetingTaskRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<MeetingTask> getTasksByMeeting(String meetingId) {
        return meetingTaskRepository.findByMeetingIdOrderByCreatedAtDesc(meetingId);
    }

    public Optional<MeetingTask> updateTaskStatus(Long taskId, String newStatus, String completedBy) {
        Optional<MeetingTask> taskOpt = meetingTaskRepository.findById(taskId);
        if (taskOpt.isPresent()) {
            MeetingTask task = taskOpt.get();
            task.setStatus(newStatus);
            if ("completed".equals(newStatus)) {
                task.setCompletedBy(completedBy);
            } else {
                task.setCompletedBy(null);
            }
            return Optional.of(meetingTaskRepository.save(task));
        }
        return Optional.empty();
    }

    public boolean deleteTask(Long taskId) {
        if (meetingTaskRepository.existsById(taskId)) {
            meetingTaskRepository.deleteById(taskId);
            return true;
        }
        return false;
    }

    public List<Note> getAllSummaries() {
        return noteRepository.findAll();
    }

    public Optional<Note> getSummary(String meetingId) {
        return noteRepository.findByMeetingId(meetingId);
    }
}
