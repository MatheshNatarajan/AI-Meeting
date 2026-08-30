package com.meeting.api.model;

import javax.persistence.*;
import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.stream.Collectors;
import java.util.Collections;

@Entity
@Table(name = "meetings")
public class Meeting {
    @Id
    private String id;
    private String title;
    private OffsetDateTime date;
    private Integer duration;
    
    @ManyToOne
    @JoinColumn(name = "organizer_id")
    @JsonIgnore
    private User organizer;

    @ManyToMany
    @JoinTable(
        name = "meeting_participants",
        joinColumns = @JoinColumn(name = "meeting_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @JsonIgnore
    private List<User> participants;

    private String status;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public OffsetDateTime getDate() { return date; }
    public void setDate(OffsetDateTime date) { this.date = date; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    
    @JsonProperty("organizer")
    public String getOrganizerEmail() {
        return organizer != null ? organizer.getEmail() : null;
    }
    
    @JsonProperty("participants")
    public List<String> getParticipantEmails() {
        if (participants == null) return Collections.emptyList();
        return participants.stream().map(User::getEmail).collect(Collectors.toList());
    }

    public User getOrganizer() { return organizer; }
    public void setOrganizer(User organizer) { this.organizer = organizer; }
    public List<User> getParticipants() { return participants; }
    public void setParticipants(List<User> participants) { this.participants = participants; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
