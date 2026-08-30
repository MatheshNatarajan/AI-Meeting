package com.meeting.api.dto;

import com.meeting.api.enums.MeetingStatus;

public class MeetingUpdateDTO {
    private MeetingStatus status;
    private String date;

    public MeetingStatus getStatus() {
        return status;
    }

    public void setStatus(MeetingStatus status) {
        this.status = status;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }
}
