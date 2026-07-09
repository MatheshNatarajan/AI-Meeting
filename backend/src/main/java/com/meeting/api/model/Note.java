package com.meeting.api.model;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "notes")
public class Note {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meeting_id", unique = true)
    private String meetingId;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String fullTranscript;

    @ElementCollection
    @CollectionTable(name = "note_key_points", joinColumns = @JoinColumn(name = "note_id"))
    @Column(name = "key_point")
    private List<String> keyPoints;

    @ElementCollection
    @CollectionTable(name = "note_action_items", joinColumns = @JoinColumn(name = "note_id"))
    @Column(name = "action_item")
    private List<String> actionItems;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMeetingId() { return meetingId; }
    public void setMeetingId(String meetingId) { this.meetingId = meetingId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getFullTranscript() { return fullTranscript; }
    public void setFullTranscript(String fullTranscript) { this.fullTranscript = fullTranscript; }
    public List<String> getKeyPoints() { return keyPoints; }
    public void setKeyPoints(List<String> keyPoints) { this.keyPoints = keyPoints; }
    public List<String> getActionItems() { return actionItems; }
    public void setActionItems(List<String> actionItems) { this.actionItems = actionItems; }
}
