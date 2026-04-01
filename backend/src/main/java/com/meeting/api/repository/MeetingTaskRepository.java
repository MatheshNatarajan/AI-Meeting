package com.meeting.api.repository;

import com.meeting.api.model.MeetingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MeetingTaskRepository extends JpaRepository<MeetingTask, Long> {
    List<MeetingTask> findByMeetingId(String meetingId);
    List<MeetingTask> findByMeetingIdOrderByCreatedAtDesc(String meetingId);
    List<MeetingTask> findAllByOrderByCreatedAtDesc();
}
