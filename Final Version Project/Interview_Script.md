  MeetSync – Interview Script & Practice Guide

**Purpose:** Scripted conversations for different interview scenarios. Practice these out loud.

---

## SCRIPT 1: THE 30-SECOND ELEVATOR PITCH

**Scenario:** Recruiter asks "Tell me about MeetSync"

**Time:** 30 seconds (memorize this verbatim)

---

### Your Script:

> "MeetSync is a full-stack meeting management platform I built using Spring Boot and PostgreSQL. It has three core components: REST APIs for scheduling and participant management, WebSocket for real-time participant tracking with room-based isolation, and an intelligent NLP pipeline that combines AI-powered extraction via OpenRouter with regex fallback for reliability. The system automatically extracts action items, generates summaries, and persists everything to PostgreSQL. It demonstrates full-stack ownership from database design to concurrent programming to AI integration."

**Key phrases to land:**
- ✓ "Full-stack"
- ✓ "Spring Boot, PostgreSQL"
- ✓ "Real-time participant tracking"
- ✓ "AI + regex fallback"
- ✓ "Action items and summaries"

**Timing:** Say it once, time yourself. Aim for 30-35 seconds.

---

## SCRIPT 2: THE 2-MINUTE DEEP DIVE

**Scenario:** Interviewer says "Tell me more about MeetSync"

**Time:** 2 minutes

---

### Structure:

**Paragraph 1: What & Why (25 sec)**
> "MeetSync solves a real problem: meetings are where decisions get made, but teams lose track of action items. After a meeting, someone spends 10-20 minutes summarizing. I built this to automate that—extract tasks from the raw transcript, identify who's responsible and what priority it is, and generate a meeting summary automatically."

**Paragraph 2: Architecture (50 sec)**
> "The system has three layers. First, REST APIs for the meeting lifecycle—create meetings, add participants, update status. Second, WebSocket for real-time tracking. Each meeting is isolated in its own 'room.' When Alice joins, the server broadcasts 'peer-joined' to Bob and Carol. I use thread-safe concurrent collections—ConcurrentHashMap for rooms, CopyOnWriteArrayList for sessions—so multiple participants can join simultaneously without race conditions.

> Third, the intelligence layer. My NlpService takes the transcript, cleans it—removes timestamps, speaker labels, filler words like 'um' and 'like.' Then I extract tasks using a two-layer approach: first, I call OpenRouter's Gemini 2.5 Flash API with a structured prompt asking for 'Task | Assignee | Priority.' If the API fails—timeout, rate limit—I fall back to regex patterns that match conversational triggers like 'we need to...', 'should...', 'will...' Finally, I deduplicate tasks using Jaccard similarity. If two tasks are >60% similar by word overlap, they're duplicates."

**Paragraph 3: Why It Works (30 sec)**
> "I chose Spring Boot because it eliminates boilerplate and Spring Data JPA abstracts ORM complexity. WebSocket over REST because real-time push is much more efficient than polling for 1000 concurrent meetings. For NLP, I combined AI and regex because AI is accurate but expensive and sometimes fails; regex is fast, reliable, and free. It's a pragmatic tradeoff. The whole system degrades gracefully—if the AI API goes down, we still extract tasks."

**Paragraph 4: Scale Thinking (15 sec)**
> "At scale, I'd add Redis pub/sub to distribute WebSocket updates across multiple servers, and async job processing so transcript extraction doesn't block the API thread. Right now, it's ready for deployment at the single-server level and demonstrates full-stack capability."

**Total time: ~2 minutes**

---

## SCRIPT 3: DEEP DIVE ON WEBSOCKET (3 minutes)

**Scenario:** "Tell me about the real-time implementation"

---

### Your Script:

**Opening (20 sec):**
> "WebSocket is a persistent, full-duplex protocol over TCP. After an initial HTTP upgrade handshake—the client sends 'Upgrade: websocket' header, server responds with 101 status—the connection stays open for both-way messaging. Unlike REST where you have to poll every 2 seconds, WebSocket is event-driven. Only sends when something actually happens."

**The Handshake (40 sec):**
> "The handshake is clever. Client sends an HTTP GET request with headers like 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' and 'Connection: Upgrade'. The server responds with '101 Switching Protocols' and 'Sec-WebSocket-Accept', which is the SHA-1 hash of the client's key appended with a magic constant. This prevents confused proxies from caching the response. Once that's done, the TCP connection speaks WebSocket protocol—binary frames, not HTTP text."

**My Implementation (60 sec):**
> "In my SignalingHandler, I maintain a thread-safe data structure: ConcurrentHashMap mapping meetingId to CopyOnWriteArrayList of WebSocketSessions. When a client sends a 'join' message with their meetingId, I add their session to that room's list. When they send a message, I broadcast it to all other sessions in the room—except the sender, so they don't get an echo.

> The thread safety is important. ConcurrentHashMap is thread-safe for adding/removing rooms. CopyOnWriteArrayList is optimized for reads—it doesn't lock during iteration, which is good because we broadcast frequently. If a session disconnects, I remove them from the list and notify the room. If the room becomes empty, I delete it to prevent memory leaks.

> For WebRTC signaling—offer/answer/ice-candidate messages—I just relay them through the same mechanism. The backend doesn't need to understand WebRTC; it just routes messages."

**Scaling Consideration (20 sec):**
> "This single-server design handles ~1,000 concurrent connections. For 10,000+, I'd use Redis pub/sub. Each server publishes to a channel like 'meeting:123', and all servers listen on it. Sessions on Server A connect only to Server A, but if someone on Server B sends a message, Redis delivers it to all servers, which then deliver to their local sessions."

**Total: ~2:40**

---

## SCRIPT 4: DEEP DIVE ON WEBRTC (3 minutes)

**Scenario:** "How does video calling work in your system?"

---

### Your Script:

**What is WebRTC (20 sec):**
> "WebRTC is not WebSocket for video. It's a media layer optimized for real-time audio/video—low latency, adaptive bitrate. Three components: signaling (coordination), peer connection (direct P2P), and media (audio/video codecs)."

**Signaling (50 sec):**
> "Signaling happens via WebSocket. When Bob joins a meeting, he receives a 'peer-joined' event about Alice. Bob's browser creates an RTCPeerConnection and calls getUserMedia to access his camera/microphone. Then he creates an SDP offer—Session Description Protocol—describing his codecs, ICE candidates, and encryption fingerprint. He sends this offer to Alice via WebSocket.

> Alice receives the offer, sets it as the remote description, then creates an answer with her parameters. She sends it back to Bob via WebSocket. They exchange ICE candidates—IP addresses where they can be reached. ICE candidates come from a STUN server (I use Google's free one). STUN discovers your public IP behind a firewall."

**Media Establishment (50 sec):**
> "Once offer/answer/ICE complete, they establish a DTLS connection—that's TLS over UDP, encrypts all media. Then they start sending RTP packets. RTP is Real-time Transport Protocol—audio/video frames sent as UDP packets, every 20ms for Opus audio. If Alice detects packet loss or jitter, she sends RTCP feedback to Bob's encoder: 'You can only send at 2.5 Mbps now.' Bob's VP8 encoder adapts—lower resolution, fewer frames."

**My Implementation (20 sec):**
> "In my frontend code, I create a peer connection, add media tracks, and listen for ICE candidates. As they arrive, I send them to the other peer via WebSocket. I don't need complex logic on the backend—it just relays WebRTC signaling messages."

**Limitation (20 sec):**
> "This is peer-to-peer mesh. Works great for 3-4 people. At 5+ participants, everyone encodes video multiple times—Alice encodes for Bob, Carol, David, Eve separately. Very CPU-intensive. Production systems would use SFU (Selective Forwarding Unit)—a server that receives one stream from Alice and forwards to everyone else, but doesn't decode/re-encode."

**Total: ~3 minutes**

---

## SCRIPT 5: NLP & TASK EXTRACTION (2:30 minutes)

**Scenario:** "Walk me through the NLP pipeline"

---

### Your Script:

**Input (15 sec):**
> "The input is a raw transcript: '[14:00:05] John: hello everyone. [14:00:12] Alice: we need to review the budget.' Messy—timestamps, speaker labels, natural speech."

**Cleaning (30 sec):**
> "First, I clean it. Remove timestamps with regex: `\[\\d{1,2}:\\d{2}:\\d{2}\]` matches and deletes '[14:00:05]'. Remove speaker labels: '[Yy]ou|Participant'. Remove filler words—'um', 'uh', 'like', 'basically'—common in speech but noise for NLP. Result: clean sentences."

**Extraction (50 sec):**
> "I use a hybrid approach. Try AI first: I call OpenRouter API with a prompt: 'Extract tasks in format: Task | Assignee | Priority. Do not add bullets.' Gemini 2.5 Flash returns structured output like 'Review budget | Alice | high'.

> If the API fails—timeout, 429 rate limit—I fall back to regex. I have 12 patterns: '(?i)\\b(?:we|i|you)\\s+(?:need|needs)\\s+to\\s+([^.!?]{5,})'—matches 'we need to X', extracts X. For assignees: pattern detects 'John will review'—captures 'John'. For priority: keyword matching—'urgent', 'asap' → high; 'eventually', 'later' → low."

**Deduplication (30 sec):**
> "Two regex patterns might both extract similar tasks. I use Jaccard similarity—word overlap. 'Review budget' and 'Review the budget' have 2 common words, 3 total unique → 2/3 = 67% similar. Threshold >60% = duplicate, skip the second.

> Jaccard = |A ∩ B| / |A ∪ B|. Fast, simple, works."

**Storage (15 sec):**
> "Save to database. Each task has: text, assignee, priority (high/medium/low), status (pending/completed), extracted_from (original sentence for audit), createdAt."

**Total: ~2:30**

---

## SCRIPT 6: DATABASE SCHEMA (2 minutes)

**Scenario:** "Walk me through your database design"

---

### Your Script:

**Schema Overview (30 sec):**
> "Four tables: meetings, meeting_participants, meeting_tasks, notes.

> Meetings table: id (UUID), title, date, duration, organizer, status. Status can be 'pending' (waiting for participants to confirm), 'confirmed', 'cancelled', 'declined'.

> Meeting_participants is a separate table because it's one-to-many. Many participants per meeting. This lets me efficiently query 'all meetings for alice@company.com' using a join."

**Why Normalized (30 sec):**
> "I could denormalize participants into a JSON column. But then I can't index 'Which meetings includes alice@company.com?' I'd have to JSON_CONTAINS on every query. With a separate table, I add index on participant column, and the query runs in milliseconds.

> Tasks and notes are per-meeting. Each has meeting_id foreign key. If a meeting is deleted, CASCADE deletes all tasks and notes."

**Meeting_tasks Detailed (30 sec):**
> "Columns: id (auto-increment), meeting_id (FK), task_text, assignee (optional), priority, status, extracted_from (original sentence), created_at. I don't update created_at; it's immutable audit trail. Status changes from 'pending' to 'completed' when user marks it done."

**Notes Table (15 sec):**
> "One note per meeting. Stores full_transcript (TEXT), summary (AI-generated), action_items (JSON list). This is where denormalization makes sense—action_items is a list we don't need to query individually. JSONB in PostgreSQL lets me be flexible—add fields without schema migrations."

**Total: ~2 minutes**

---

## SCRIPT 7: HANDLING SCALE & FAILURES

**Scenario:** "What happens if [X]?"

---

### Scenarios & Answers:

**Q: What if the OpenRouter API goes down?**

A: "The NLP service catches the exception and returns null. My TranscriptController checks: if AI tasks are empty, fall back to regex extraction. System degrades gracefully. Users get less accurate tasks, but the system stays up."

```java
String aiTasks = callOpenRouter(prompt);
if (aiTasks != null && !aiTasks.isEmpty()) {
  return parseAiTasks(aiTasks);  // Use AI results
}
// If null, continue to regex fallback
List<MeetingTask> regexTasks = extractViaRegex(transcript);
return regexTasks;
```

**Q: What if two users try to update the same meeting status simultaneously?**

A: "Lost update problem. My code doesn't handle it currently. Solution: add optimistic locking with `@Version` field. Hibernate tracks version number. If two threads update, one gets OptimisticLockException, retries. Or pessimistic locking: acquire database lock before updating."

**Q: What if a WebSocket client sends 1000 messages/second?**

A: "Spring's thread pool gets saturated. Each handler takes ~1ms, so 1000 messages take 1000ms. Others queue. Solution: async processing. Use Spring's `@Async` to process in background thread pool. Or implement backpressure—tell client to slow down."

**Q: What if the database connection pool is exhausted?**

A: "With default Tomcat pool (10 connections) and 1000 concurrent requests, most wait. Solution: increase pool size. Better: use connection pooling middleware like PgBouncer. It maintains many connections to app, few to DB."

**Q: How many concurrent meetings can you handle?**

A: "Single server: ~1,000 WebSocket connections (limited by memory—each session ~1MB). ~50 concurrent transcripts being processed (if synchronous). Database: ~10-20 active queries (connection pool limited). Bottleneck: database connections. Scaling: add Redis for WebSocket pub/sub, add message queue for transcript processing, scale database with read replicas."

---

## SCRIPT 8: COMMON FOLLOW-UP QUESTIONS

**Q: Why Spring Boot over Spring Framework?**

A: "Convention over configuration. Embedded Tomcat, auto-configuration, spring-boot-starter dependencies. Spring Framework is just the foundation. Spring Boot lets you run java -jar and go. Less boilerplate."

**Q: Why PostgreSQL over MongoDB?**

A: "I need ACID transactions (all-or-nothing), complex queries (user participation lookup), and efficient indexing. PostgreSQL excels here. MongoDB is better for flexible schemas and horizontal scaling, but I don't need that."

**Q: Why WebSocket over polling?**

A: "Polling wastes bandwidth—HTTP headers, overhead for each request. If you poll every 2 seconds, 1000 clients = 500 requests/second. WebSocket: persistent connection, messages only on events. More efficient."

**Q: Why regex fallback instead of just AI?**

A: "Cost and reliability. AI API costs money per token. Regex is free. AI might timeout or rate-limit. Regex always works. Hybrid gives me 85% accuracy with fallback to 70% regex accuracy. Production would tune this ratio."

**Q: What would you do differently?**

A: "Add async processing—don't block API on transcript NLP. Implement caching with Redis. Add authentication (Spring Security). Write unit/integration tests. Add structured logging (JSON format) to Datadog. Implement TURN server for WebRTC in restrictive networks. Fine-tune NLP prompts per meeting type."

**Q: How would you monitor this in production?**

A: "Prometheus for metrics—API latency, WebSocket connection count, database query time. Grafana for dashboards. Datadog for logs. Sentry for errors. Alert if API latency >500ms or error rate >1%."

**Q: Strengths of your design?**

A: "Full-stack understanding. Thread-safe data structures. Graceful degradation (AI + regex fallback). REST + WebSocket for different use cases. Database normalization. Scales horizontally."

**Q: Weaknesses?**

A: "No authentication/authorization. Synchronous transcript processing (could timeout). Single Redis instance is bottleneck. No retry logic for failed API calls. No comprehensive error handling. Regex dedup is O(n²), doesn't scale to 10k+ tasks."

---

## QUICK REFERENCE: KEY PHRASES

**Use these in answers:**

| Concept | Key Phrase |
|---------|-----------|
| Thread-safety | "I use ConcurrentHashMap and CopyOnWriteArrayList for thread-safe concurrent access" |
| Graceful degradation | "AI first, fallback to regex if API fails" |
| Architecture | "Stateless REST + persistent WebSocket + async NLP" |
| Scalability | "Single server ~1000 connections, Redis pub/sub for multi-server" |
| Trade-off | "Pragmatic tradeoff between accuracy (AI) and reliability (regex)" |
| Protocol | "WebSocket: persistent TCP after 101 upgrade, binary frames" |
| WebRTC | "Signaling via WebSocket, media via P2P UDP with DTLS encryption" |
| NLP | "Two-layer: AI extraction + regex fallback + Jaccard dedup" |
| Database | "Normalized schema, ACID transactions, PostgreSQL for complex queries" |

---

## TIMING CHECKLIST

Memorize these:

```
30-second pitch: Opens with "MeetSync is..."
2-minute deep dive: Architecture → Why choices → Scale thinking
3-minute WebSocket: Handshake → Implementation → Scaling
3-minute WebRTC: Signaling → Media → Limitations
2-minute NLP: Clean → Extract → Deduplicate → Store
2-minute Database: Schema → Normalization → Key tables
```

---

## LAST THING BEFORE INTERVIEW

**Practice these scripts out loud 3 times each.** 

Timing yourself:
- 30-sec pitch: should be ~28-35 sec
- 2-min deep dive: should be ~118-125 sec
- 3-min WebSocket: should be ~175-185 sec

Don't memorize word-for-word, but know the structure and key phrases.

**If you get stuck:** Say "Let me think about that" (5 sec pause is OK). Better to pause than to ramble or say "um" repeatedly.

**If you don't know:** Say "I haven't worked with that specifically, but based on [principle], I would [approach]." Example: "I haven't implemented rate limiting, but I'd use Spring's RateLimiter or Redis to track requests per user."

---

## INTERVIEW FLOW TEMPLATE

**Opening (Your pitch):**
> "Let me tell you about MeetSync..." [30-sec pitch]

**If they ask "Tell me more":**
> "Sure, I'll walk you through the architecture..." [2-min deep dive]

**If they drill on WebSocket:**
> "WebSocket uses a persistent TCP connection after an HTTP upgrade handshake..." [3-min WebSocket]

**If they drill on WebRTC:**
> "WebRTC is peer-to-peer media. Signaling via WebSocket, actual audio/video goes direct..." [3-min WebRTC]

**If they drill on NLP:**
> "I take the transcript, clean it, then use a hybrid approach..." [2-min NLP]

**If they ask "Weaknesses?":**
> "No authentication, synchronous transcript processing, single Redis is bottleneck..." [Be honest]

**If they ask "How would you scale?":**
> "Horizontal scaling with Redis pub/sub for WebSocket, message queue for NLP..." [Scaling answer]

**Closing (Your question):**
> "That's a high-level overview. What would you like to dive deeper into?"

---

## DO'S AND DON'TS

**DO:**
- ✅ Use technical terms correctly (WebSocket, DTLS, Jaccard similarity)
- ✅ Explain the "why" not just the "what"
- ✅ Admit when you don't know something
- ✅ Show progression (basic → advanced)
- ✅ Reference code examples
- ✅ Talk about trade-offs

**DON'T:**
- ❌ Say "um" or "like" repeatedly
- ❌ Go into unrelated topics
- ❌ Pretend to know something you don't
- ❌ Answer with just "I did X with Spring Boot"
- ❌ Rush through explanations
- ❌ Interrupt the interviewer

