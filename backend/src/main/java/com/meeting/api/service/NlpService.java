package com.meeting.api.service;

import com.meeting.api.model.MeetingTask;
import com.meeting.api.util.TranscriptProcessor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class NlpService {
    
    @Autowired
    private OpenRouterClient openRouterClient;
    
    @Autowired
    private TranscriptProcessor transcriptProcessor;

    /**
     * Extract tasks from the cleaned transcript using AI, falling back to regex.
     */
    public List<MeetingTask> extractTasks(String transcript, String meetingId, String meetingTitle) {
        List<MeetingTask> tasks = new ArrayList<>();
        
        // Try OpenRouter First
        String prompt = "You are an expert AI meeting assistant. Extract a list of action items/tasks from the following meeting transcript. " +
                        "For each task, output exactly one line containing only the Task Description. " +
                        "Do not add any intro text, bullet points or extra symbols. Just the raw lines.\n\nTranscript:\n" + transcript;
        
        String aiTasks = openRouterClient.callApi(prompt);
        if (aiTasks != null && !aiTasks.isEmpty()) {
            String[] lines = aiTasks.split("\n");
            for (String line : lines) {
                if (line.trim().isEmpty()) continue;
                String taskText = line.trim().replaceAll("^[-*\\d.]\\s+", "");
                if (taskText.length() < 3) continue;
                
                MeetingTask task = new MeetingTask();
                task.setMeetingId(meetingId);
                task.setMeetingTitle(meetingTitle);
                task.setTaskText(taskText.length() > 200 ? taskText.substring(0, 200) : taskText);
                task.setStatus("pending");
                
                tasks.add(task);
            }
            if (!tasks.isEmpty()) {
                return tasks;
            }
        }

        // Fallback to regex logic in TranscriptProcessor
        return transcriptProcessor.extractTasksRegexFallback(transcript, meetingId, meetingTitle);
    }

    /**
     * Generate summary using AI, falling back to basic extraction logic.
     */
    public String generateSummary(String transcript) {
        if (transcript == null || transcript.isEmpty()) return "No meaningful content in transcript.";

        // Try OpenRouter First
        String prompt = "You are an expert AI meeting summarizer. Given the following raw meeting transcript, generate a professional, concise, and structured summary. Include key topics discussed and bullet points of important decisions or highlights. Do not include a greeting or intro, just output the summary text directly.\n\nTranscript:\n" + transcript;
        String aiSummary = openRouterClient.callApi(prompt);
        if (aiSummary != null && !aiSummary.isEmpty()) {
            return aiSummary;
        }

        // Fallback to local naive logic
        return transcriptProcessor.generateSummaryFallback(transcript);
    }
}
