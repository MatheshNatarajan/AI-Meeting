package com.meeting.api.controller;

import com.meeting.api.model.MeetingTask;
import com.meeting.api.model.Note;
import com.meeting.api.service.TranscriptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TranscriptController {

    @Autowired
    private TranscriptService transcriptService;

    @PostMapping("/transcript")
    public ResponseEntity<Map<String, Object>> processTranscript(@RequestBody Map<String, String> payload) {
        String meetingId = payload.get("meetingId");
        String transcript = payload.get("transcript");

        if (meetingId == null || transcript == null || transcript.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("error", (Object) "meetingId and transcript are required")
            );
        }

        // Fire and forget
        transcriptService.processTranscript(meetingId, transcript);
        
        return ResponseEntity.accepted().body(
            Collections.singletonMap("message", (Object) "Processing started")
        );
    }

    @GetMapping("/tasks")
    public List<MeetingTask> getAllTasks() {
        return transcriptService.getAllTasks();
    }

    @GetMapping("/tasks/{meetingId}")
    public List<MeetingTask> getTasksByMeeting(@PathVariable String meetingId) {
        return transcriptService.getTasksByMeeting(meetingId);
    }

    @PutMapping("/tasks/{taskId}/status")
    public ResponseEntity<MeetingTask> updateTaskStatus(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> payload) {
        
        if (taskId == null) {
            return ResponseEntity.badRequest().build();
        }

        String newStatus = payload.get("status");
        String completedBy = payload.get("completedBy");
        
        if (newStatus == null) {
            return ResponseEntity.badRequest().build();
        }
        
        Optional<MeetingTask> updatedTask = transcriptService.updateTaskStatus(taskId, newStatus, completedBy);
        return updatedTask.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long taskId) {
        if (taskId == null) {
            return ResponseEntity.badRequest().build();
        }
        
        boolean deleted = transcriptService.deleteTask(taskId);
        if (deleted) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/summaries")
    public List<Note> getAllSummaries() {
        return transcriptService.getAllSummaries();
    }

    @GetMapping("/summary/{meetingId}")
    public ResponseEntity<Note> getSummary(@PathVariable String meetingId) {
        Optional<Note> noteOpt = transcriptService.getSummary(meetingId);
        return noteOpt.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
