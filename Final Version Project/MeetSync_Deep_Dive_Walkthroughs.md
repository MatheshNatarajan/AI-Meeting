# MeetSync – Deep Dive Walkthroughs

Use these detailed walkthroughs to rehearse explanations for common interview scenarios.

---

## Walkthrough 1: "Walk Me Through Your Project"

**Time: 3-5 minutes | Difficulty: Medium**

### Narrative Flow

**Opening (20 sec)**
> "I built MeetSync, a web-based meeting management platform. It's a full-stack project using Spring Boot for the backend, PostgreSQL for persistence, and WebSocket for real-time features. The core innovation is an AI-powered NLP engine that automatically extracts action items and generates summaries from meeting transcripts."

**Why I Built It (15 sec)**
> "Meetings are where decisions get made, but teams often lose track of action items. After meetings, there's usually a 10-20 minute manual summarization phase. I wanted to automate that—extract who's responsible for what, identify priorities, and keep everyone aligned."

**Architecture Overview (60 sec)**
> "There are three layers:
>
> **First, the API layer.** I built REST endpoints for the entire meeting lifecycle—create a meeting, add participants, update meeting status. I also built a `/transcript` endpoint that's the heart of the system. When a meeting ends, the frontend sends the raw transcript to my backend.
>
> **Second, real-time tracking.** I implemented WebSocket connections to track participants in real-time. Each meeting is isolated in its own 'room.' When someone joins, the server broadcasts a 'peer-joined' event. When they leave, I send 'peer-left.' This enables live presence awareness without polling. The implementation uses thread-safe concurrent collections (ConcurrentHashMap + CopyOnWriteArrayList) to handle multiple participants safely.
>
> **Third, the intelligence layer.** This is where NLP comes in. My NlpService takes the transcript and cleans it—removes timestamps, speaker labels, filler words like 'um' and 'like.' Then I extract action items using a two-layer approach: first, I call the OpenRouter API with a prompt asking for structured task extraction using Gemini 2.5 Flash. If that fails (rate limit, timeout), I fallback to regex patterns that match conversational triggers like 'we need to...', 'should...', 'will...'. For each task, I detect the assignee, priority, and status. Finally, I deduplicate tasks using fuzzy matching—if two tasks are >60% similar by word overlap (Jaccard similarity), I treat them as duplicates."

**Database Design (30 sec)**
> "I designed a normalized schema with four tables: `meetings` stores the core meeting details. `meeting_participants` is a separate table because it's a one-to-many relationship. `meeting_tasks` stores the extracted action items with fields for task text, assignee, priority, status, and when it was created. And `notes` stores the full transcript, AI-generated summary, and action items list as JSON. This normalization lets me query efficiently—like finding all tasks for a user or all pending high-priority items."

**Why This Approach (30 sec)**
> "I chose Spring Boot because it eliminates boilerplate and provides great abstractions through Spring Data JPA. WebSocket over just REST because real-time push is much more efficient than polling. For NLP, I combined AI and regex because AI is accurate but expensive and sometimes fails; regex is fast and reliable. It's a pragmatic trade-off. The whole system is designed to degrade gracefully—if the AI API goes down, we still extract tasks using patterns."

**Closing (15 sec)**
> "At scale, I'd add Redis for pub-sub messaging to distribute WebSocket updates across servers, and async job processing so transcript extraction doesn't block the API thread. Right now, it's ready for deployment at the single-server level and demonstrates full-stack capability—from database design to real-time communication to NLP."

---

## Walkthrough 2: "Explain the WebSocket Implementation"

**Time: 2-3 minutes | Difficulty: Hard**

### Detailed Explanation

**Setup (30 sec)**
> "WebSocket is a bidirectional protocol, so I need to register a handler with Spring. I created a `WebSocketConfig` class that implements `WebSocketConfigurer`. It registers my `SignalingHandler` at the `/signaling` endpoint and allows all origins for development."

**Room Isolation Model (60 sec)**
> "The key insight is room isolation. Each meeting gets its own 'room.' Here's the data structure:
>
> ```
> Map<meetingId, CopyOnWriteArrayList<WebSocketSession>>
> ```
>
> When a client connects, they first send a 'join' message with their meetingId. I store that information in the session's attributes, then add the session to the room's list:
>
> ```java
> roomSessions.computeIfAbsent(meetingId, k -> new CopyOnWriteArrayList<>()).add(session);
> ```
>
> This is thread-safe because I'm using ConcurrentHashMap for the outer map and CopyOnWriteArrayList for the inner list. CopyOnWriteArrayList is key here—it makes a copy on every write, so iterations in the broadcast loop are safe even if sessions are being added/removed.
>
> When someone sends a message, I broadcast it to everyone in that room except the sender:
>
> ```java
> for (WebSocketSession s : roomSessions.get(meetingId)) {
>   if (s.isOpen() && !s.getId().equals(sender.getId())) {
>     s.sendMessage(new TextMessage(message));
>   }
> }
> ```
>
> The `s.isOpen()` check is important—prevents sending to disconnected sessions."

**Message Handling (60 sec)**
> "There are four message types:
>
> 1. **'join'** - Client sends this when entering a meeting. I extract the meetingId and add them to the room.
>
> 2. **'end-meeting'** - When the organizer ends the meeting, I broadcast this to all participants.
>
> 3. **'offer', 'answer', 'ice-candidate'** - These are WebRTC signaling messages for P2P video. I just relay them to the room.
>
> 4. **Any custom message** - I broadcast to the room.
>
> ```java
> protected void handleTextMessage(WebSocketSession session, TextMessage message) {
>   Map<String, String> data = objectMapper.readValue(message.getPayload(), Map.class);
>   String type = data.get("type");
>   
>   if ("join".equals(type)) {
>     String meetingId = data.get("meetingId");
>     session.getAttributes().put("meetingId", meetingId);
>     roomSessions.computeIfAbsent(meetingId, ...).add(session);
>     broadcastToRoom(meetingId, session, "{...peer-joined...}");
>   } else {
>     broadcastToRoom(meetingId, session, message.getPayload());
>   }
> }
> ```"

**Cleanup (30 sec)**
> "When a client disconnects, I remove them from their room and notify others:
>
> ```java
> public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
>   String meetingId = (String) session.getAttributes().get("meetingId");
>   if (meetingId != null) {
>     roomSessions.get(meetingId).remove(session);
>     broadcastToRoom(meetingId, session, "{...peer-left...}");
>     if (roomSessions.get(meetingId).isEmpty()) {
>       roomSessions.remove(meetingId); // Clean up empty rooms
>     }
>   }
> }
> ```
>
> This prevents memory leaks—once a room is empty, we free the entry."

**Scaling Implication (30 sec)**
> "The current design works great for a single server—I can handle ~1,000 concurrent WebSocket connections (limited by server memory). But if I wanted to scale to multiple servers, I'd need Redis pub-sub. Instead of in-memory rooms, messages published to Redis are delivered to all server instances. Each server would still maintain its local sessions, but they'd all communicate through Redis."

---

## Walkthrough 3: "Explain NLP Task Extraction"

**Time: 3-4 minutes | Difficulty: Hard**

### Step-by-Step Breakdown

**Input (15 sec)**
> "The input is a raw transcript that looks like this:
>
> ```
> [13:59:58] You: hello everyone
> [14:00:10] Participant: we need to review the proposal
> [14:00:25] Participant: and finalize the timeline
> [14:00:45] You: john should handle the design review
> ```
>
> It's messy—timestamps, speaker labels, natural conversation flow."

**Step 1: Cleaning (45 sec)**
> "I clean the transcript in several passes:
>
> **First, remove metadata:**
> ```java
> cleaned = transcript.replaceAll("\\[\\d{1,2}:\\d{2}:\\d{2}\\]", "");
> cleaned = cleaned.replaceAll("(?i)\\b(?:You|Participant)\\s*:\\s*", "");
> ```
> Result:
> ```
> hello everyone
> we need to review the proposal
> and finalize the timeline
> john should handle the design review
> ```
>
> **Second, remove filler words.** I maintain an array of common filler words: 'um', 'uh', 'like', 'basically', etc. For each filler:
> ```java
> cleaned = cleaned.replaceAll("(?i)\\b" + Pattern.quote(filler) + "\\b[,\\s]*", " ");
> ```
> This handles natural speech patterns.
>
> **Finally, normalize whitespace:**
> ```java
> cleaned = cleaned.replaceAll("\\s{2,}", " ").trim();
> ```"

**Step 2: AI-Powered Extraction (90 sec)**
> "Now I call the OpenRouter API. I send a carefully crafted prompt:
>
> ```
> \"Extract a list of action items/tasks from the following meeting transcript.
>  For each task, output exactly one line in this format:
>  Task Description | Assignee Name (or Unassigned) | Priority (high, medium, low)
>  Do not add any intro text, bullet points or extra symbols.\"
> ```
>
> I'm using the Google Gemini 2.5 Flash model because it's fast and cheap. The API call looks like:
>
> ```java
> HttpHeaders headers = new HttpHeaders();
> headers.setContentType(MediaType.APPLICATION_JSON);
> headers.set(\"Authorization\", \"Bearer \" + OPENROUTER_API_KEY);
> 
> Map<String, Object> requestBody = new HashMap<>();
> requestBody.put(\"model\", \"google/gemini-2.5-flash\");
> requestBody.put(\"messages\", List.of(new Message(\"user\", prompt)));
> 
> ResponseEntity<Map> response = restTemplate.postForEntity(OPENROUTER_URL, request, Map.class);
> ```
>
> If successful, I parse the response and extract each task line:
>
> ```
> Review proposal | Alice | high
> Finalize timeline | Team | medium
> Design review | John | high
> ```
>
> For each line, I create a `MeetingTask` entity and save it to the database."

**Step 3: Regex Fallback (60 sec)**
> "If the API times out or fails, I fallback to regex patterns. I have about 12 regex patterns that match conversational triggers:
>
> ```java
> Pattern.compile(\"(?i)\\\\b(?:we|i|you)\\\\s+(?:need|needs|ought)\\\\s+to\\\\s+([^.!?]{5,})\")
> // Matches: \"we need to review the proposal\"
> 
> Pattern.compile(\"(?i)let'?s\\\\s+([^.!?]{5,})\")
> // Matches: \"let's finalize this\"
> 
> Pattern.compile(\"(?i)(?:action\\\\s+item|task)\\\\s*(?::|is|-)\\\\s*([^.!?]{5,})\")
> // Matches: \"action item: send email\"
> ```
>
> For each sentence in the transcript, I try to match it against these patterns. If I get a match, I extract the captured group (the task text):
>
> ```java
> Matcher matcher = pattern.matcher(sentence);
> if (matcher.find()) {
>   String taskText = matcher.group(1).trim();
>   // Clean up the text
>   taskText = taskText.replaceAll(\"^(that|the)\\\\s+\", \"\");
>   // Truncate at natural boundaries (and, because, but)
>   // Cap at 80 characters
>   // Create MeetingTask and save
> }
> ```
>
> I also detect **assignee** with a pattern like: \"(Name) will/should (task)\"  
> And **priority** with keyword matching: \"urgent\", \"asap\" → high; \"eventually\", \"later\" → low."

**Step 4: Fuzzy Deduplication (60 sec)**
> "Here's a problem: \"Review the proposal\" and \"Go through proposal\" are the same task but different text. Exact matching would miss this. So I use fuzzy deduplication with **Jaccard similarity**:
>
> ```java
> private boolean isSimilar(String a, String b) {
>   Set<String> wordsA = Set.of(a.toLowerCase().split(\"\\\\s+\"));
>   Set<String> wordsB = Set.of(b.toLowerCase().split(\"\\\\s+\"));
>   
>   Set<String> intersection = new HashSet<>(wordsA);
>   intersection.retainAll(wordsB);
>   
>   Set<String> union = new HashSet<>(wordsA);
>   union.addAll(wordsB);
>   
>   double jaccard = (double) intersection.size() / union.size();
>   return jaccard > 0.6; // 60% threshold
> }
> ```
>
> For \"Review proposal\" vs \"Go through proposal\":
> - wordsA: {review, proposal}
> - wordsB: {go, through, proposal}
> - intersection: {proposal} = 1 word
> - union: {review, proposal, go, through} = 4 words
> - Jaccard = 1/4 = 0.25 → NOT a duplicate (need >0.6)
>
> But for \"Review proposal\" vs \"Review the proposal\":
> - wordsA: {review, proposal}
> - wordsB: {review, the, proposal}
> - intersection: {review, proposal} = 2 words
> - union: {review, proposal, the} = 3 words
> - Jaccard = 2/3 = 0.67 → IS a duplicate (>0.6)
>
> This catches common variations without over-deduplicating."

**Step 5: Storage (15 sec)**
> "Once all tasks are extracted and deduplicated, I save them to the database:
>
> ```java
> meetingTaskRepository.saveAll(extractedTasks);
> ```
>
> Each task has: taskText, assignee, priority, status (\"pending\"), createdAt, extractedFrom (original sentence for audit)."

**Why This Approach (30 sec)**
> "AI-first because Gemini understands context. Regex fallback because it's reliable, fast, and cost-free. Together, they give me 85%+ accuracy for typical meetings. If I was doing this for a huge enterprise, I'd fine-tune the prompts or use more sophisticated NLP libraries (spaCy, NLTK), but for this project, the hybrid approach is pragmatic and works well."

---

## Walkthrough 4: "Walk Me Through Task Tracking + Persistence"

**Time: 2 minutes | Difficulty: Medium**

**User Journey:**
> "A meeting just ended. The frontend sends a POST to `/api/transcript` with the full transcript. My `TranscriptController` receives it, validates the input, and orchestrates the whole pipeline:
>
> 1. Fetch the meeting title from the database
> 2. Call `nlpService.extractTasks()` (which does everything we just discussed)
> 3. Save all extracted tasks to `meeting_tasks` table
> 4. Call `nlpService.generateSummary()` (same AI/fallback approach)
> 5. Create or update a `Note` record with the summary, full transcript, and action items
> 6. Return a response with all the extracted data
>
> The response looks like:
> ```json
> {
>   \"meetingId\": \"abc-123\",
>   \"tasksExtracted\": 3,
>   \"tasks\": [
>     {\"id\": 1, \"taskText\": \"Review proposal\", \"assignee\": \"Alice\", \"priority\": \"high\", \"status\": \"pending\"},
>     ...
>   ],
>   \"summary\": \"This meeting focused on Q4 planning...\",
>   \"actionItems\": [\"Alice to review proposal\", \"John to finalize timeline\"]
> }
> ```
>
> From there, the frontend displays tasks in a list. Users can click on a task and update its status to 'completed'. That's a PUT request to `/api/tasks/{taskId}/status`. My controller finds the task, updates its status, and persists it.
>
> Later, the user can view all tasks (GET `/api/tasks`), or just tasks for a specific meeting (GET `/api/tasks/{meetingId}`). These queries are backed by custom repository methods that order by creation date descending."

---

## Walkthrough 5: "What Would You Change?"

**Time: 2-3 minutes | Difficulty: Medium**

> "If I were rebuilding this for production at scale, I'd make several changes:
>
> **1. Async Transcript Processing**  
> Right now, transcript processing is synchronous—the API request blocks until NLP completes. I'd use Spring's `@Async` annotation to process transcripts in the background. The API would return immediately with a 'processing' status, then update the record once NLP is done.
>
> **2. Caching**  
> I'd add Redis to cache frequently accessed data—busy slots for a user, meeting details, task lists. This would reduce database load.
>
> **3. WebSocket Scaling**  
> For multiple servers, I'd use Redis pub-sub so WebSocket messages from one server reach users connected to another server.
>
> **4. Monitoring & Logging**  
> I'd add structured logging (JSON format) and send logs to a central system like Datadog or Splunk. For errors, I'd use Sentry to track exceptions.
>
> **5. Testing**  
> I'd write unit tests for the NLP service (test regex patterns, dedup logic), integration tests for the API endpoints, and E2E tests for the full transcript workflow.
>
> **6. Security**  
> Add Spring Security for authentication/authorization, so only the organizer can see tasks or change meeting status. Also rotate the OpenRouter API key securely (use AWS Secrets Manager).
>
> **7. Database Optimization**  
> Add indexes on commonly queried columns: `meeting_id` on tasks, `organizer` and `participants` on meetings. Use database query profiling to find slow queries.
>
> **8. NLP Improvements**  
> Test different models on OpenRouter (Claude, GPT-4, Llama) and pick the one with the best accuracy-cost tradeoff. Fine-tune the prompt for different meeting types (standup vs. planning vs. retrospective).
>
> These are all pragmatic improvements I'd make as the project grows."

---

## Walkthrough 6: "Explain the API Endpoints"

**Time: 2 minutes | Difficulty: Easy**

**Meeting CRUD**
> ```
> GET  /api/meetings               → List all meetings
> POST /api/meetings               → Create new meeting
> GET  /api/meetings/{id}          → Get meeting details
> PUT  /api/meetings/{id}/status   → Update meeting status
> GET  /api/meetings/busy-slots    → Find user's busy time
> DEL  /api/meetings/{id}          → Cancel meeting
> ```

**Task Management**
> ```
> GET  /api/tasks                      → List all tasks
> GET  /api/tasks/{meetingId}          → Tasks for a meeting
> PUT  /api/tasks/{taskId}/status      → Mark task as complete
> DEL  /api/tasks/{taskId}             → Delete task
> ```

**Summaries**
> ```
> GET  /api/summaries              → List all summaries
> GET  /api/summary/{meetingId}    → Get summary for meeting
> ```

**Core Workflow**
> ```
> POST /api/transcript             → Submit meeting transcript (triggers NLP)
> ```

**Design patterns:**
> - UUIDs for meeting IDs (distributed system ready)
> - CORS enabled for frontend
> - Consistent error responses (404 for not found, 400 for bad request)
> - Stateless endpoints (each request contains all info needed)

---

## Walkthrough 7: "Database Design Rationale"

**Time: 2 minutes | Difficulty: Medium**

> "I could have denormalized everything into a single JSON column, but I chose normalization for three reasons:
>
> **1. Query Efficiency**  
> If I want 'all meetings for user john@example.com', a normalized schema lets me write:
> ```sql
> SELECT m FROM Meeting m 
> WHERE m.organizer = 'john@example.com' 
>    OR 'john@example.com' MEMBER OF m.participants
> ```
> If participants were JSON, I'd have to do expensive JSON parsing in every query.
>
> **2. Indexing**  
> I can add an index on the `organizer` column or a separate index on `meeting_participants(participant)`. This makes common queries fast. JSON indexes exist but are less flexible.
>
> **3. Data Integrity**  
> Separate tables enforce referential integrity. If a meeting is deleted, I can use CASCADE deletes to clean up participants and tasks automatically. With JSON, that's my responsibility.
>
> **When to use JSON:** Action items are a good use case because they're a list that doesn't need individual querying. Storing as JSONB in PostgreSQL lets me be flexible—add fields without schema migrations—but still query (PostgreSQL JSONB queries are powerful).
>
> **Schema:**
> ```
> meetings (id UUID, title, date, duration, organizer, status)
> meeting_participants (meeting_id FK, participant email)
> meeting_tasks (id auto, meeting_id FK, taskText, assignee, priority, status, createdAt)
> notes (id UUID, meeting_id FK, title, fullTranscript, summary, actionItems JSON)
> ```
>
> This is a good balance between normalization and flexibility."

---

## Practice Scenarios

### Scenario A: "You Have 10 Minutes"
Focus on: Overview + Architecture + Key Innovation  
**Script:**
1. Project name and tech stack (30 sec)
2. Problem it solves (30 sec)
3. High-level architecture (3 min: REST APIs, WebSocket, NLP)
4. Why it's interesting (2 min: full-stack, real-time, AI integration)
5. Scaling considerations (2 min: bottlenecks + solutions)

### Scenario B: "Deep Dive on WebSocket"
Focus: Detailed technical explanation of concurrency + design
**Script:**
1. Why WebSocket (15 sec)
2. Room isolation model (45 sec)
3. Thread-safe data structures (30 sec)
4. Broadcast mechanism (30 sec)
5. Scaling to multiple servers (30 sec)

### Scenario C: "NLP Pipeline Deep Dive"
Focus: Detailed walkthrough of cleaning → extraction → dedup
**Script:**
1. Input format (15 sec)
2. Cleaning steps (45 sec)
3. AI + regex extraction (90 sec)
4. Fuzzy dedup with Jaccard (45 sec)
5. Persistence (15 sec)

### Scenario D: "System Design / Scaling"
Focus: How you'd scale this
**Script:**
1. Current architecture bottlenecks (60 sec)
2. WebSocket scaling (45 sec)
3. NLP processing scaling (45 sec)
4. Database scaling (30 sec)
5. Monitoring / observability (30 sec)

---

## Key Phrases to Remember

**Use these to sound confident:**

- "Thread-safe concurrent data structures"
- "Graceful degradation / fallback mechanism"
- "Normalized schema for query efficiency"
- "Two-layer approach for reliability"
- "Fuzzy matching with Jaccard similarity"
- "Room-based isolation model"
- "Pragmatic trade-off between AI and regex"
- "Room isolation prevents cross-meeting data leaks"
- "ElementCollection for one-to-many relationships"
- "Custom JPQL query for complex filtering"

**Avoid these:**

- "It just works"
- "I didn't test it"
- "I don't know how to scale it"
- "Spring Boot does all the heavy lifting"
- "WebSockets are better than REST" (they're different tools)
- "I used deep learning" (you didn't)
- "It's infinitely scalable"

