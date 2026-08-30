# MeetSync – Excluded Interview Reference

This file keeps the material you asked to avoid for now: the broad project pitch, the softer business story, and the generic follow-up answers. Keep this here as a backup reference only.

---

## 1) Elevator Pitch / Project Story

> "MeetSync is a full-stack meeting management platform I built using Spring Boot and PostgreSQL. It has three core components: REST APIs for scheduling and participant management, WebSocket for real-time participant tracking, and an NLP pipeline that uses AI plus regex fallback to turn transcripts into summaries and action items. The system stores results in PostgreSQL and demonstrates full-stack ownership across backend APIs, real-time communication, and AI integration."

### Notes
- Good for a short intro if the interviewer asks, "Tell me about the project."
- Best used only when they specifically ask for the business or project story.
- Not the primary focus for technical deep dives.

---

## 4) Follow-Up / General Discussion Notes

### Why this project matters
- Meetings are where decisions get made, but action items are often lost.
- The project automates post-meeting follow-up.
- It combines real-time coordination with asynchronous AI processing.

### Why Spring Boot
- Faster setup and less boilerplate.
- Strong integration with JPA, MVC, and REST controllers.
- Good fit for building a full-stack backend quickly.

### Why PostgreSQL
- Good relational model for meetings, participants, tasks, and notes.
- Supports transactions and querying for scheduling and status logic.
- Better fit than a document store for a structured meeting system.

### Why WebSocket over polling
- WebSocket is more efficient for real-time presence and signaling.
- Polling wastes bandwidth and CPU.
- WebSocket is ideal when events happen only occasionally.

---

## 5) Non-Technical / Broad Interview Answers

### What was the biggest lesson?
- Real-time systems and AI processing both fail in ways users don't expect.
- A system needs graceful degradation, not only happy-path logic.
- The most valuable engineering work is making the app resilient under failure.

### What would you improve next?
- Real authentication and authorization.
- Better processing status tracking for AI jobs.
- Fewer silent failures.
- Better retries and monitoring.
- More robust queueing and scaling for async work.

### What are the weaknesses?
- No production-grade auth.
- In-memory room state is not horizontally scalable.
- No strong validation or queueing for heavy AI jobs.
- Some parts are still more prototype than production infrastructure.

### Good phrasing for interview answers
- "I designed it to degrade gracefully instead of crashing."
- "The system works as a single-server prototype but I would externalize state for multi-node scaling."
- "The important tradeoff was reliability versus absolute AI accuracy."

---

## Quick reminder

This file is not meant to be the main answer set. The technical focus should stay on:
- architecture
- WebSocket / signaling
- WebRTC
- database design
- concurrency and scaling

If needed later, use this file for the softer story and broader discussion prompts.
