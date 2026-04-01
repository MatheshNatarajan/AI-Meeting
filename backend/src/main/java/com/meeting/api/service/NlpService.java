package com.meeting.api.service;

import com.meeting.api.model.MeetingTask;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class NlpService {
    
    private final String OPENROUTER_API_KEY = "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";
    private final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
    private final RestTemplate restTemplate = new RestTemplate();

    // Filler words to remove from transcript before processing
    private static final String[] FILLER_WORDS = {
        "um", "uh", "uhh", "umm", "hmm", "hm",
        "like", "you know", "basically", "actually", "literally",
        "so yeah", "i mean", "kind of", "sort of", "right",
        "okay so", "well basically", "to be honest"
    };

    // Stop words to exclude from topic extraction
    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "need", "dare", "ought",
        "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
        "as", "into", "through", "during", "before", "after", "above", "below",
        "between", "out", "off", "over", "under", "again", "further", "then",
        "once", "here", "there", "when", "where", "why", "how", "all", "both",
        "each", "few", "more", "most", "other", "some", "such", "no", "nor",
        "not", "only", "own", "same", "so", "than", "too", "very", "just",
        "because", "but", "and", "or", "if", "while", "that", "this", "these",
        "those", "i", "me", "my", "we", "our", "you", "your", "he", "him",
        "his", "she", "her", "it", "its", "they", "them", "their", "what",
        "which", "who", "whom", "about", "up", "also", "get", "got", "going",
        "go", "think", "know", "say", "said", "thing", "things", "really",
        "much", "even", "still", "let", "make", "way", "well", "back",
        "want", "see", "look", "new", "now", "come", "take", "yeah", "yes",
        "okay", "ok", "one", "two", "first", "something", "anything"
    ));

    // Task extraction regex patterns (Expanded for natural conversation)
    private static final Pattern[] TASK_PATTERNS = {
        // "we need to ...", "I need to ...", "you need to ..."
        Pattern.compile("(?i)\\b(?:we|i|you|they|he|she|team|everyone)\\s+(?:need|needs|ought)\\s+to\\s+([^.!?]{5,})[.!?]?"),
        // "have to ...", "has to ..."
        Pattern.compile("(?i)\\b(?:we|i|you|they|he|she)\\s+(?:have|has)\\s+to\\s+([^.!?]{5,})[.!?]?"),
        // "must ...", "should ..."
        Pattern.compile("(?i)\\b(?:we|i|you|they|he|she)\\s+(?:must|should|shall)\\s+([^.!?]{5,})[.!?]?"),
        // "I'll ...", "we'll ...", "I will ...", "we will ..."
        Pattern.compile("(?i)\\b(?:i|we|the\\s+team)\\s+(?:will|'ll)\\s+([^.!?]{5,})[.!?]?"),
        // "let's ..."
        Pattern.compile("(?i)let'?s\\s+([^.!?]{5,})[.!?]?"),
        // "can you ...", "could you ..."
        Pattern.compile("(?i)\\b(?:can|could|would)\\s+you\\s+(?:please\\s+)?([^.!?]{5,}\\?)[.!?]?"),
        // "please ..."
        Pattern.compile("(?i)please\\s+([^.!?]{5,})[.!?]?"),
        // "make sure to ..."
        Pattern.compile("(?i)make\\s+sure\\s+(?:to\\s+|that\\s+)?([^.!?]{5,})[.!?]?"),
        // "don't forget to ..."
        Pattern.compile("(?i)(?:don'?t|do\\s+not)\\s+forget\\s+to\\s+([^.!?]{5,})[.!?]?"),
        // "remember to ..."
        Pattern.compile("(?i)remember\\s+to\\s+([^.!?]{5,})[.!?]?"),
        // "action item: ...", "task: ..."
        Pattern.compile("(?i)(?:action\\s+item|task|todo|to-do|follow\\s+up)\\s*(?::|is|-)\\s*([^.!?]{5,})[.!?]?"),
        // "assign ... to ..."
        Pattern.compile("(?i)assign\\s+([^.!?]+)\\s+to\\s+([^.!?]+)[.!?]?"),
        // "schedule ..."
        Pattern.compile("(?i)schedule\\s+(?:a|the)?\\s*([^.!?]{5,})[.!?]?")
    };

    // Assignee extraction: "[Name] will/should/needs to [task]"
    private static final Pattern ASSIGNEE_PATTERN =
        Pattern.compile("(?i)(\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+(?:will|should|needs?\\s+to|has\\s+to|is\\s+going\\s+to|can|could)\\s+([^.!?]+)[.!?]?");

    // Priority keywords
    private static final Pattern HIGH_PRIORITY_PATTERN =
        Pattern.compile("(?i)\\b(urgent|urgently|asap|critical|immediately|right\\s+away|top\\s+priority|crucial|important|deadline)\\b");

    private static final Pattern LOW_PRIORITY_PATTERN =
        Pattern.compile("(?i)\\b(eventually|when\\s+possible|low\\s+priority|nice\\s+to\\s+have|optional|if\\s+time\\s+permits|someday|later)\\b");


    /**
     * Remove metadata (timestamps, speakers) and filler words from the transcript.
     * Input format: "[13:59:58] You: hello\n[14:00:10] Participant: we need to..."
     */
    public String cleanTranscript(String transcript) {
        if (transcript == null || transcript.isEmpty()) return "";

        String cleaned = transcript.replaceAll("\\[\\d{1,2}:\\d{2}:\\d{2}(?:\\s+[APMapm]{2})?\\]", "");
        cleaned = cleaned.replaceAll("(?i)\\b(?:You|Participant|Speaker\\s*\\d*)\\s*:\\s*", "");

        for (String filler : FILLER_WORDS) {
            cleaned = cleaned.replaceAll("(?i)\\b" + Pattern.quote(filler) + "\\b[,\\s]*", " ");
        }

        cleaned = cleaned.replaceAll("\\s{2,}", " ").trim();
        return cleaned;
    }

    private String callOpenRouter(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + OPENROUTER_API_KEY);
            headers.set("HTTP-Referer", "http://localhost:8080");

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "google/gemini-2.5-flash");
            
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            
            requestBody.put("messages", Collections.singletonList(message));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(OPENROUTER_URL, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> messageResp = (Map<String, Object>) choices.get(0).get("message");
                    if (messageResp != null && messageResp.get("content") != null) {
                        return messageResp.get("content").toString().trim();
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("OpenRouter API Error: " + e.getMessage());
        }
        return null; // fallback
    }

    /**
     * Split a transcript into individual utterances/sentences.
     * Each "[timestamp] Speaker: text" block becomes one sentence.
     */
    private List<String> splitIntoSentences(String transcript) {
        List<String> sentences = new ArrayList<>();
        if (transcript == null || transcript.isEmpty()) return sentences;

        // First, split by transcript lines (each [timestamp] Speaker: block)
        String[] lines = transcript.split("\\n+");
        for (String line : lines) {
            // Strip metadata from this line
            String clean = line.replaceAll("\\[\\d{1,2}:\\d{2}:\\d{2}(?:\\s+[APMapm]{2})?\\]", "")
                               .replaceAll("(?i)\\b(?:You|Participant|Speaker\\s*\\d*)\\s*:\\s*", "")
                               .trim();
            if (clean.isEmpty() || clean.length() < 5) continue;

            // Further split by sentence-ending punctuation
            String[] subSentences = clean.split("(?<=[.!?])\\s+");
            for (String s : subSentences) {
                s = s.trim();
                if (s.length() >= 8) {
                    // Remove filler words
                    for (String filler : FILLER_WORDS) {
                        s = s.replaceAll("(?i)\\b" + Pattern.quote(filler) + "\\b[,\\s]*", " ");
                    }
                    s = s.replaceAll("\\s{2,}", " ").trim();
                    if (s.length() >= 8) {
                        sentences.add(s);
                    }
                }
            }
        }
        return sentences;
    }

    /**
     * Check if two task strings are similar (fuzzy dedup)
     */
    private boolean isSimilar(String a, String b) {
        Set<String> wordsA = new HashSet<>(Arrays.asList(a.toLowerCase().split("\\s+")));
        Set<String> wordsB = new HashSet<>(Arrays.asList(b.toLowerCase().split("\\s+")));
        Set<String> intersection = new HashSet<>(wordsA);
        intersection.retainAll(wordsB);
        Set<String> union = new HashSet<>(wordsA);
        union.addAll(wordsB);
        if (union.isEmpty()) return false;
        double jaccard = (double) intersection.size() / union.size();
        return jaccard > 0.6; // 60% word overlap = duplicate
    }

    /**
     * Extract tasks from the cleaned transcript
     */
    public List<MeetingTask> extractTasks(String transcript, String meetingId, String meetingTitle) {
        List<MeetingTask> tasks = new ArrayList<>();
        
        // Try OpenRouter First
        String prompt = "You are an expert AI meeting assistant. Extract a list of action items/tasks from the following meeting transcript. " +
                        "For each task, output exactly one line in this format: \n" +
                        "Task Description | Assignee Name (or Unassigned) | Priority (high, medium, low)\n\n" +
                        "Do not add any intro text, bullet points or extra symbols. Just the raw lines.\n\nTranscript:\n" + transcript;
        
        String aiTasks = callOpenRouter(prompt);
        if (aiTasks != null && !aiTasks.isEmpty()) {
            String[] lines = aiTasks.split("\n");
            for (String line : lines) {
                if (line.trim().isEmpty()) continue;
                String[] parts = line.split("\\|");
                if (parts.length >= 1) {
                    MeetingTask task = new MeetingTask();
                    task.setMeetingId(meetingId);
                    task.setMeetingTitle(meetingTitle);
                    
                    String taskText = parts[0].trim().replaceAll("^[-*\\d.]\\s+", "");
                    if (taskText.length() < 3) continue;
                    
                    task.setTaskText(taskText.length() > 200 ? taskText.substring(0, 200) : taskText);
                    
                    if (parts.length >= 2) {
                        String assignee = parts[1].trim();
                        if (!assignee.equalsIgnoreCase("Unassigned") && !assignee.equalsIgnoreCase("None") && !assignee.equalsIgnoreCase("N/A")) {
                            task.setAssignee(assignee);
                        }
                    }
                    
                    String priority = "medium";
                    if (parts.length >= 3) {
                        String p = parts[2].trim().toLowerCase();
                        if (p.contains("high")) priority = "high";
                        else if (p.contains("low")) priority = "low";
                    }
                    task.setPriority(priority);
                    task.setStatus("pending");
                    task.setExtractedFrom("AI Extracted from transcript");
                    
                    tasks.add(task);
                }
            }
            if (!tasks.isEmpty()) {
                return tasks;
            }
        }

        // Fallback to regex
        List<String> sentences = splitIntoSentences(transcript);
        Set<String> seenTasks = new HashSet<>();
        String[] cutoffs = {" and ", " because ", " but ", " so ", " also ", " please ", " moreover ", " however ", " then ", " which "};

        for (String sentence : sentences) {
            if (sentence.length() < 10) continue;

            for (Pattern pattern : TASK_PATTERNS) {
                Matcher matcher = pattern.matcher(sentence);
                if (matcher.find()) {
                    String taskText = matcher.group(1).trim();

                    // Clean up
                    taskText = taskText.replaceAll("^(that|the)\\s+", "");
                    taskText = capitalizeFirst(taskText);

                    // Truncate at natural conversational boundaries if we already have a meaty task
                    int earliestCutoff = taskText.length();
                    for (String cutoffWord : cutoffs) {
                        int idx = taskText.toLowerCase().indexOf(cutoffWord);
                        // Only cut if we have at least 15 chars before the conjunction
                        if (idx > 15 && idx < earliestCutoff) {
                            earliestCutoff = idx;
                        }
                    }
                    if (earliestCutoff < taskText.length()) {
                        taskText = taskText.substring(0, earliestCutoff).trim();
                    }

                    // Cap length at 80 chars max (was 120) for conciseness
                    if (taskText.length() > 80) {
                        int cutoff = taskText.lastIndexOf(' ', 80);
                        if (cutoff > 30) taskText = taskText.substring(0, cutoff);
                        else taskText = taskText.substring(0, 80);
                    }

                    if (taskText.length() < 5) continue;

                    // Fuzzy dedup check
                    boolean isDup = false;
                    for (String seen : seenTasks) {
                        if (isSimilar(seen, taskText)) { isDup = true; break; }
                    }
                    if (isDup) continue;
                    seenTasks.add(taskText.toLowerCase());

                    MeetingTask task = new MeetingTask();
                    task.setMeetingId(meetingId);
                    task.setMeetingTitle(meetingTitle);
                    task.setTaskText(taskText);
                    task.setExtractedFrom(sentence.length() > 200 ? sentence.substring(0, 200) + "..." : sentence);
                    task.setPriority(detectPriority(sentence));
                    task.setAssignee(detectAssignee(sentence));
                    task.setStatus("pending");

                    tasks.add(task);
                    break; // One task per sentence max
                }
            }
        }

        return tasks;
    }

    public String generateSummary(String transcript) {
        if (transcript == null || transcript.isEmpty()) return "No meaningful content in transcript.";

        // Try OpenRouter First
        String prompt = "You are an expert AI meeting summarizer. Given the following raw meeting transcript, generate a professional, concise, and structured summary. Include key topics discussed and bullet points of important decisions or highlights. Do not include a greeting or intro, just output the summary text directly.\n\nTranscript:\n" + transcript;
        String aiSummary = callOpenRouter(prompt);
        if (aiSummary != null && !aiSummary.isEmpty()) {
            return aiSummary;
        }

        // Fallback to local naive logic
        List<String> sentences = splitIntoSentences(transcript);
        if (sentences.isEmpty()) return "No meaningful content in transcript.";

        List<String> topics = extractKeyTopics(transcript);
        String topicsStr = topics.isEmpty() ? "various subjects" : String.join(", ", topics);

        List<String> meaningful = new ArrayList<>();
        for (String s : sentences) {
            if (s.length() >= 15) meaningful.add(s);
        }
        if (meaningful.isEmpty()) return "Meeting had minimal content. The main topics identified were: " + topicsStr + ".";

        List<ScoredSentence> scored = new ArrayList<>();
        for (int i = 0; i < meaningful.size(); i++) {
            double score = scoreSentence(meaningful.get(i), i, meaningful.size());
            scored.add(new ScoredSentence(meaningful.get(i), score));
        }

        scored.sort((a, b) -> Double.compare(b.score, a.score));
        int summarySize = Math.min(3, scored.size());
        
        List<ScoredSentence> top = new ArrayList<>(scored.subList(0, summarySize));

        top.sort((a, b) -> {
            int idxA = meaningful.indexOf(a.sentence);
            int idxB = meaningful.indexOf(b.sentence);
            return Integer.compare(idxA, idxB);
        });

        StringBuilder summary = new StringBuilder();
        summary.append("This meeting primarily focused on: ").append(topicsStr).append(".\n\n");
        summary.append("Key points discussed:\n");
        for (ScoredSentence ss : top) {
            String s = capitalizeFirst(ss.sentence);
            if (!s.endsWith(".") && !s.endsWith("!") && !s.endsWith("?")) s += ".";
            summary.append("- ").append(s).append("\n");
        }

        return summary.toString().trim();
    }

    /**
     * Extract key topics, excluding speaker labels and common words
     */
    public List<String> extractKeyTopics(String transcript) {
        String cleaned = cleanTranscript(transcript).toLowerCase();
        String[] words = cleaned.split("\\W+");

        // Additional words to exclude (speaker labels, common meeting words)
        Set<String> extraStop = new HashSet<>(Arrays.asList(
            "participant", "speaker", "meeting", "okay", "alright", "gonna", "gotta",
            "hello", "thank", "thanks", "welcome", "everybody", "everyone"
        ));

        Map<String, Integer> freq = new LinkedHashMap<>();
        for (String word : words) {
            if (word.length() > 3 && !STOP_WORDS.contains(word) && !extraStop.contains(word)) {
                freq.put(word, freq.getOrDefault(word, 0) + 1);
            }
        }

        return freq.entrySet().stream()
            .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
            .limit(8)
            .map(e -> capitalizeFirst(e.getKey()))
            .collect(Collectors.toList());
    }

    /**
     * Extract action items as a list of strings (for the Note entity)
     */
    public List<String> extractActionItemStrings(List<MeetingTask> tasks) {
        return tasks.stream()
            .map(task -> {
                String item = task.getTaskText();
                if (task.getAssignee() != null && !task.getAssignee().isEmpty()) {
                    item = task.getAssignee() + " to " + lowercaseFirst(item);
                }
                return item;
            })
            .collect(Collectors.toList());
    }

    // --- PRIVATE HELPERS ---

    private String detectPriority(String sentence) {
        if (HIGH_PRIORITY_PATTERN.matcher(sentence).find()) return "high";
        if (LOW_PRIORITY_PATTERN.matcher(sentence).find()) return "low";
        return "medium";
    }

    private String detectAssignee(String sentence) {
        Matcher m = ASSIGNEE_PATTERN.matcher(sentence);
        if (m.find()) return m.group(1).trim();
        return null;
    }

    private String findSentenceContaining(String text, String phrase) {
        int idx = text.indexOf(phrase);
        if (idx < 0) return phrase;

        // Go backwards to find sentence start
        int start = idx;
        while (start > 0 && text.charAt(start - 1) != '.' && text.charAt(start - 1) != '!' && text.charAt(start - 1) != '?' && text.charAt(start - 1) != '\n') {
            start--;
        }

        // Go forwards to find sentence end
        int end = idx + phrase.length();
        while (end < text.length() && text.charAt(end) != '.' && text.charAt(end) != '!' && text.charAt(end) != '?' && text.charAt(end) != '\n') {
            end++;
        }
        if (end < text.length()) end++;

        return text.substring(start, end).trim();
    }

    private double scoreSentence(String sentence, int position, int totalSentences) {
        double score = 0;

        // Boost for position (early and late sentences often important)
        if (position < 3) score += 2.0;
        if (position >= totalSentences - 2) score += 1.5;

        // Boost for action verbs
        if (sentence.matches("(?i).*(discussed|agreed|decided|planned|reviewed|analyzed|concluded|recommended|proposed|presented|demonstrated|completed|launched|updated|reported).*")) {
            score += 3.0;
        }

        // Boost for containing proper nouns (capitalized words not at sentence start)
        String[] words = sentence.split("\\s+");
        for (int i = 1; i < words.length; i++) {
            if (words[i].length() > 1 && Character.isUpperCase(words[i].charAt(0))) {
                score += 0.5;
            }
        }

        // Boost for containing numbers (concrete data)
        if (sentence.matches(".*\\d+.*")) score += 1.0;

        // Penalty for questions
        if (sentence.endsWith("?")) score -= 2.0;

        // Moderate length preferred
        if (sentence.length() > 30 && sentence.length() < 200) score += 1.0;

        return score;
    }

    private int findIndex(String[] arr, String val) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i].trim().equals(val)) return i;
        }
        return 0;
    }

    private String capitalizeFirst(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private String lowercaseFirst(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }

    // Helper class for sentence scoring
    private static class ScoredSentence {
        String sentence;
        double score;

        ScoredSentence(String sentence, double score) {
            this.sentence = sentence;
            this.score = score;
        }
    }
}
