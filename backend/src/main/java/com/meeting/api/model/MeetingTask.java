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

    private String status; // "pending", "completed"

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "completed_by")
    private String completedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "pending";
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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getCompletedBy() { return completedBy; }
    public void setCompletedBy(String completedBy) { this.completedBy = completedBy; }
}
