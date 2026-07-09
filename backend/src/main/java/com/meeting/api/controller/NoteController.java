package com.meeting.api.controller;

import com.meeting.api.model.Note;
import com.meeting.api.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class NoteController {

    @Autowired
    private NoteRepository noteRepository;

    @GetMapping("/notes/{meetingId}")
    public ResponseEntity<Note> getNotes(@PathVariable String meetingId) {
        Optional<Note> noteOpt = noteRepository.findByMeetingId(meetingId);
        if (!noteOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(noteOpt.get());
    }

    @PostMapping("/notes")
    public Note createNote(@RequestBody Note note) {
        return noteRepository.save(note);
    }

    @DeleteMapping("/notes/all")
    public ResponseEntity<Void> deleteAllNotes() {
        noteRepository.deleteAll();
        return ResponseEntity.ok().build();
    }
}
