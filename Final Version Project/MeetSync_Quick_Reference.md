# MeetSync – Quick Reference Cheat Sheet

## Technical stack at a glance
- **Backend:** Spring Boot, Java, Spring Data JPA, PostgreSQL
- **Frontend:** React, Vite, Tailwind, Axios, Zustand
- **Real-time:** WebSocket + WebRTC
- **Transcription:** browser Web Speech API
- **AI layer:** OpenRouter integration with fallback parsing logic
- **Architecture:** layered REST + real-time + async processing

---

## Core technical concepts

### 1. WebSocket room model
```java
Map<String, CopyOnWriteArrayList<WebSocketSession>> roomSessions
    = new ConcurrentHashMap<>();
```

This shows:
- room-based session isolation
- thread-safe access to active connections
- efficient in-memory broadcast behavior

### 2. SDP and ICE flow
```js
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);
wsSend({ type: 'offer', sdp: peerConnection.localDescription });
```

This matters because it shows you understand the difference between:
- signaling via WebSocket
- media negotiation via SDP
- network path discovery via ICE

### 3. Database model
```sql
meetings
meeting_participants
meeting_tasks
notes
```

This is the relational backbone of the project and is good interview material because it shows real system thinking.

---

## Strong technical phrases

- "The project uses a layered architecture: REST for state, WebSocket for signaling, and WebRTC for media."
- "The signaling layer is room-based and thread-safe."
- "SDP handles capability negotiation; ICE handles path discovery."
- "The database is normalized to support relational queries and better state integrity."
- "The design is intentionally resilient when the AI layer fails or times out."

---

## Interview question answers

**Q: Why use WebSocket instead of polling?**
A: Polling adds unnecessary requests. WebSocket keeps a persistent connection and pushes messages only when there is an event.

**Q: Why use WebRTC instead of just WebSocket?**
A: WebSocket is for signaling, not media. WebRTC is the media protocol used for direct peer-to-peer audio/video.

**Q: Why is the DB model normalized?**
A: Because meetings, participants, tasks, and notes are real relational entities, and a normalized model is easier to query and reason about.

**Q: What would you do next for scale?**
A: Use Redis pub/sub for multi-instance WebSocket coordination and stronger async handling for AI jobs.

---

## Short summary

The strongest technical story for this project is not just "AI meeting app" — it is the combination of:
- structured backend APIs
- room-based WebSocket signaling
- WebRTC media negotiation
- relational Postgres persistence
- async AI processing with resilient fallback behavior

That is the version you should lead with in interviews.


| **Meeting CRUD Endpoints** | 6 | GET/POST/PUT/DELETE all implemented |
| **Database Tables** | 4 | meetings, participants, tasks, notes |
| **WebSocket Message Types** | 4 | join, end-meeting, offer/answer/ice, custom |
| **Task Dedup Threshold** | 60% | Jaccard similarity cutoff |

---

## Red Flags to Avoid

❌ **Don't say:** "I used Spring Boot because it's popular"  
✅ **Say:** "Spring Boot eliminated boilerplate, provided embedded Tomcat, and Spring Data JPA abstracted ORM complexity"

❌ **Don't say:** "WebSockets handle everything"  
✅ **Say:** "REST for CRUD (stateless), WebSocket for real-time signaling (bidirectional)"

❌ **Don't say:** "My NLP uses deep learning"  
✅ **Say:** "I used a combination of AI API (for accuracy) and regex patterns (for reliability and cost)"

❌ **Don't say:** "It scales infinitely"  
✅ **Say:** "Single server handles ~1,000 concurrent connections; beyond that, Redis pub-sub enables horizontal scaling"

❌ **Don't say:** "I didn't test it"  
✅ **Say:** "I validated with manual integration testing; would add unit tests and E2E tests for production"

---

## Final Talking Points for Closing

**Lead with impact:**
"This project gave me hands-on experience building a full-stack system with real-time communication, NLP integration, and database persistence. I designed for scalability from day one (thread-safe data structures, API fallbacks), and I'm comfortable explaining trade-offs (AI vs regex, REST vs WebSocket, normalization vs JSON)."

**Show systems thinking:**
"I can identify bottlenecks (WebSocket memory, NLP latency) and propose solutions (Redis, async jobs). I understand when to use AI vs simple heuristics, and I build for failure (graceful fallback when APIs are down)."

**Demonstrate growth mindset:**
"If I built this again, I'd add async processing, Redis caching, and comprehensive monitoring. I'm always thinking about production readiness—security, observability, reliability."

---

## Resources to Review Before Interview

1. **Spring Boot Docs:** WebSocket, REST, JPA
2. **PostgreSQL:** Relationships, JSON support, indexing
3. **Your Code:** Read NlpService.java (most complex), understand each regex pattern
4. **WebSocket Protocol:** What's really happening in SignalingHandler
5. **OpenRouter API:** How you're calling Gemini, what prompts you send

---

## Practice: Explain in 2 Minutes

**Imagine someone asks:** "Tell me about MeetSync"

**Your answer structure (2 min):**
- What (Meeting platform) - 10 sec
- Why (Automate action items, real-time tracking) - 10 sec
- How (REST + WebSocket + NLP) - 40 sec
  - REST APIs: scheduling, participant management
  - WebSocket: room-based real-time with concurrent collections
  - NLP: AI (OpenRouter) + regex fallback, task extraction, summarization
- Why it matters (Full-stack ownership, scalability thinking, production-ready) - 20 sec

**Time yourself. Practice with a friend. Own it.**
