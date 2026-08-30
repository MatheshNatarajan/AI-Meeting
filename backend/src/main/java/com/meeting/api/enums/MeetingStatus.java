package com.meeting.api.enums;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum MeetingStatus {
    @JsonProperty("pending")
    PENDING("pending"),
    
    @JsonProperty("confirmed")
    CONFIRMED("confirmed"),
    
    @JsonProperty("completed")
    COMPLETED("completed"),
    
    @JsonProperty("cancelled")
    CANCELLED("cancelled"),
    
    @JsonProperty("declined")
    DECLINED("declined"),
    
    @JsonProperty("cancel_requested")
    CANCEL_REQUESTED("cancel_requested"),
    
    @JsonProperty("reschedule_requested")
    RESCHEDULE_REQUESTED("reschedule_requested");

    private final String value;

    MeetingStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }


}
