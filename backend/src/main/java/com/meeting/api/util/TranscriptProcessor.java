package com.meeting.api.util;

import com.meeting.api.model.MeetingTask;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class TranscriptProcessor {

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

    // Task extraction regex patterns
    private static final Pattern[] TASK_PATTERNS = {
        Pattern.compile("(?i)\\b(?:we|i|you|they|he|she|team|everyone)\\s+(?:need|needs|ought)\\s+to\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)\\b(?:we|i|you|they|he|she)\\s+(?:have|has)\\s+to\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)\\b(?:we|i|you|they|he|she)\\s+(?:must|should|shall)\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)\\b(?:i|we|the\\s+team)\\s+(?:will|'ll)\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)let'?s\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)\\b(?:can|could|would)\\s+you\\s+(?:please\\s+)?([^.!?]{5,}\\?)[.!?]?"),
        Pattern.compile("(?i)please\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)make\\s+sure\\s+(?:to\\s+|that\\s+)?([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)(?:don'?t|do\\s+not)\\s+forget\\s+to\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)remember\\s+to\\s+([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)(?:action\\s+item|task|todo|to-do|follow\\s+up)\\s*(?::|is|-)\\s*([^.!?]{5,})[.!?]?"),
        Pattern.compile("(?i)assign\\s+([^.!?]+)\\s+to\\s+([^.!?]+)[.!?]?"),
        Pattern.compile("(?i)schedule\\s+(?:a|the)?\\s*([^.!?]{5,})[.!?]?")
    };

    /**
     * Remove metadata (timestamps, speakers) and filler words from the transcript.
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

    /**
     * Split a transcript into individual utterances/sentences.
     */
    public List<String> splitIntoSentences(String transcript) {
        List<String> sentences = new ArrayList<>();
        if (transcript == null || transcript.isEmpty()) return sentences;

        String[] lines = transcript.split("\\n+");
        for (String line : lines) {
            String clean = line.replaceAll("\\[\\d{1,2}:\\d{2}:\\d{2}(?:\\s+[APMapm]{2})?\\]", "")
                               .replaceAll("(?i)\\b(?:You|Participant|Speaker\\s*\\d*)\\s*:\\s*", "")
                               .trim();
            if (clean.isEmpty() || clean.length() < 5) continue;

            String[] subSentences = clean.split("(?<=[.!?])\\s+");
            for (String s : subSentences) {
                s = s.trim();
                if (s.length() >= 8) {
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
    public boolean isSimilar(String a, String b) {
        Set<String> wordsA = new HashSet<>(Arrays.asList(a.toLowerCase().split("\\s+")));
        Set<String> wordsB = new HashSet<>(Arrays.asList(b.toLowerCase().split("\\s+")));
        Set<String> intersection = new HashSet<>(wordsA);
        intersection.retainAll(wordsB);
        Set<String> union = new HashSet<>(wordsA);
        union.addAll(wordsB);
        if (union.isEmpty()) return false;
        double jaccard = (double) intersection.size() / union.size();
        return jaccard > 0.6;
    }

    /**
     * Fallback task extraction using regex
     */
    public List<MeetingTask> extractTasksRegexFallback(String transcript, String meetingId, String meetingTitle) {
        List<MeetingTask> tasks = new ArrayList<>();
        List<String> sentences = splitIntoSentences(transcript);
        Set<String> seenTasks = new HashSet<>();
        String[] cutoffs = {" and ", " because ", " but ", " so ", " also ", " please ", " moreover ", " however ", " then ", " which "};

        for (String sentence : sentences) {
            if (sentence.length() < 10) continue;

            for (Pattern pattern : TASK_PATTERNS) {
                Matcher matcher = pattern.matcher(sentence);
                if (matcher.find()) {
                    String taskText = matcher.group(1).trim();

                    taskText = taskText.replaceAll("^(that|the)\\s+", "");
                    taskText = capitalizeFirst(taskText);

                    int earliestCutoff = taskText.length();
                    for (String cutoffWord : cutoffs) {
                        int idx = taskText.toLowerCase().indexOf(cutoffWord);
                        if (idx > 15 && idx < earliestCutoff) {
                            earliestCutoff = idx;
                        }
                    }
                    if (earliestCutoff < taskText.length()) {
                        taskText = taskText.substring(0, earliestCutoff).trim();
                    }

                    if (taskText.length() > 80) {
                        int cutoff = taskText.lastIndexOf(' ', 80);
                        if (cutoff > 30) taskText = taskText.substring(0, cutoff);
                        else taskText = taskText.substring(0, 80);
                    }

                    if (taskText.length() < 5) continue;

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
                    task.setStatus("pending");

                    tasks.add(task);
                    break;
                }
            }
        }
        return tasks;
    }

    /**
     * Fallback summary generation using regex/scoring
     */
    public String generateSummaryFallback(String transcript) {
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

    public List<String> extractKeyTopics(String transcript) {
        String cleaned = cleanTranscript(transcript).toLowerCase();
        String[] words = cleaned.split("\\W+");

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

    private double scoreSentence(String sentence, int position, int totalSentences) {
        double score = 0;

        if (position < 3) score += 2.0;
        if (position >= totalSentences - 2) score += 1.5;

        if (sentence.matches("(?i).*(discussed|agreed|decided|planned|reviewed|analyzed|concluded|recommended|proposed|presented|demonstrated|completed|launched|updated|reported).*")) {
            score += 3.0;
        }

        String[] words = sentence.split("\\s+");
        for (int i = 1; i < words.length; i++) {
            if (words[i].length() > 1 && Character.isUpperCase(words[i].charAt(0))) {
                score += 0.5;
            }
        }

        if (sentence.matches(".*\\d+.*")) score += 1.0;
        if (sentence.endsWith("?")) score -= 2.0;
        if (sentence.length() > 30 && sentence.length() < 200) score += 1.0;

        return score;
    }

    private String capitalizeFirst(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static class ScoredSentence {
        String sentence;
        double score;

        ScoredSentence(String sentence, double score) {
            this.sentence = sentence;
            this.score = score;
        }
    }
}
