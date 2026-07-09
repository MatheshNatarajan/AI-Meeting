package com.meeting.api.repository;

import com.meeting.api.model.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, String> {
    @Query("SELECT m FROM Meeting m WHERE (m.organizer = :email OR :email MEMBER OF m.participants) AND m.status NOT IN ('cancelled', 'declined')")
    List<Meeting> findBusyMeetingsForUser(@Param("email") String email);
}
