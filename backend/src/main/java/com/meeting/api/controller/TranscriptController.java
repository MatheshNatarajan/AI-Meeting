package com.meeting.api.controller;

import com.meeting.api.model.Meeting;
import com.meeting.api.model.MeetingTask;
import com.meeting.api.model.Note;
import com.meeting.api.repository.MeetingRepository;
import com.meeting.api.repository.MeetingTaskRepository;
import com.meeting.api.repository.NoteRepository;
import com.meeting.api.service.NlpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TranscriptController {

    @Autowired
    private NlpService nlpService;

    @Autowired
    private MeetingTaskRepository meetingTaskRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    /**
     * POST /api/transcript
     * Receives the full transcript from the frontend, processes it with NLP,
     * stores extracted tasks and generates/updates the meeting summary.
     */
    @PostMapping("/transcript")
    public ResponseEntity<Map<String, Object>> processTranscript(@RequestBody Map<String, String> payload) {
        String meetingId = payload.get("meetingId");
        String transcript = payload.get("transcript");

        if (meetingId == null || transcript == null || transcript.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("error", (Object) "meetingId and transcript are required")
            );
        }

        // Fetch meeting title
        String meetingTitle = "Meeting " + meetingId;
        Optional<Meeting> meetingOpt = meetingRepository.findById(meetingId);
        if (meetingOpt.isPresent()) {
            meetingTitle = meetingOpt.get().getTitle();
        }

        // 1. Extract tasks (NLP service cleans transcript internally)
        List<MeetingTask> extractedTasks = nlpService.extractTasks(transcript, meetingId, meetingTitle);
        if (extractedTasks != null && !extractedTasks.isEmpty()) {
            meetingTaskRepository.saveAll(extractedTasks);
        } else if (extractedTasks == null) {
            extractedTasks = new ArrayList<>();
        }

        // 3. Generate summary
        String summary = nlpService.generateSummary(transcript);



        // 5. Extract action item strings for the Note
        List<String> actionItems = nlpService.extractActionItemStrings(extractedTasks);

        // 6. Create or update the Note for this meeting
        Optional<Note> existingNote = noteRepository.findByMeetingId(meetingId);
        Note note;
        if (existingNote.isPresent()) {
            note = existingNote.get();
        } else {
            note = new Note();
            note.setMeetingId(meetingId);
        }
        note.setTitle(meetingTitle);
        note.setFullTranscript(transcript);
        note.setSummary(summary);

        note.setActionItems(actionItems);
        noteRepository.save(note);

        // 7. Return response
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("meetingId", meetingId);
        response.put("tasksExtracted", extractedTasks.size());
        response.put("tasks", extractedTasks);
        response.put("summary", summary);

        response.put("actionItems", actionItems);

        return ResponseEntity.ok(response);
    }

    // --- TASK ENDPOINTS ---

    @GetMapping("/tasks")
    public List<MeetingTask> getAllTasks() {
        return meetingTaskRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/tasks/{meetingId}")
    public List<MeetingTask> getTasksByMeeting(@PathVariable String meetingId) {
        return meetingTaskRepository.findByMeetingIdOrderByCreatedAtDesc(meetingId);
    }

    @PutMapping("/tasks/{taskId}/status")
    public ResponseEntity<MeetingTask> updateTaskStatus(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> payload) {
        
        if (taskId == null) {
            return ResponseEntity.badRequest().build();
        }

        Optional<MeetingTask> taskOpt = meetingTaskRepository.findById(taskId);
        if (!taskOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        MeetingTask task = taskOpt.get();
        String newStatus = payload.get("status");
        if (newStatus != null) {
            task.setStatus(newStatus);
        } else {
            // Optional: Handle missing status if necessary
            return ResponseEntity.badRequest().build();
        }
        
        MeetingTask savedTask = meetingTaskRepository.save(task);
        if (savedTask == null) {
            return ResponseEntity.internalServerError().build();
        }
        return ResponseEntity.ok(savedTask);
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long taskId) {
        if (taskId == null) {
            return ResponseEntity.badRequest().build();
        }
        if (!meetingTaskRepository.existsById(taskId)) {
            return ResponseEntity.notFound().build();
        }
        meetingTaskRepository.deleteById(taskId);
        return ResponseEntity.ok().build();
    }

    // --- SUMMARY ENDPOINTS ---

    @GetMapping("/summaries")
    public List<Note> getAllSummaries() {
        return noteRepository.findAll();
    }

    @GetMapping("/summary/{meetingId}")
    public ResponseEntity<Note> getSummary(@PathVariable String meetingId) {
        Optional<Note> noteOpt = noteRepository.findByMeetingId(meetingId);
        if (!noteOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(noteOpt.get());
    }
}
