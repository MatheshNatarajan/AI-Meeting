package com.meeting.api.model;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "meeting_tasks")
public class MeetingTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meeting_id")
    private String meetingId;

    @Column(name = "meeting_title")
    private String meetingTitle;

    @Column(columnDefinition = "TEXT")
    private String taskText;

    private String assignee;

    private String priority; // "high", "medium", "low"

    private String status; // "pending", "completed"

    @Column(columnDefinition = "TEXT")
    private String extractedFrom; // The original transcript sentence

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "pending";
        if (priority == null) priority = "medium";
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMeetingId() { return meetingId; }
    public void setMeetingId(String meetingId) { this.meetingId = meetingId; }
    public String getMeetingTitle() { return meetingTitle; }
    public void setMeetingTitle(String meetingTitle) { this.meetingTitle = meetingTitle; }
    public String getTaskText() { return taskText; }
    public void setTaskText(String taskText) { this.taskText = taskText; }
    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getExtractedFrom() { return extractedFrom; }
    public void setExtractedFrom(String extractedFrom) { this.extractedFrom = extractedFrom; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
