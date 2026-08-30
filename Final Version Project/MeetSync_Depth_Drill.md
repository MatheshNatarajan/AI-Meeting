# MeetSync – Deep Drill: From Basics to Expert Level

**Format:** Interview-style Q&A with progressive difficulty. Each section starts basic and drills deeper until you might say "I'm not sure" or "I'd need to research that."

---

## SECTION 1: REST APIs (Foundation → Expert)

### LEVEL 1: BASIC REST CONCEPTS

**Q: What is REST?**

A: REST stands for Representational State Transfer. It's an architectural style for APIs using HTTP methods to perform CRUD operations on resources. In your case, you have endpoints like `/api/meetings` for the Meeting resource.

**Q: What HTTP methods do you use?**

A: 
- `GET /api/meetings` – Retrieve all meetings
- `POST /api/meetings` – Create new meeting
- `GET /api/meetings/{id}` – Get specific meeting
- `PUT /api/meetings/{id}/status` – Update meeting status
- `DELETE /api/meetings/{id}` – Delete meeting

**Q: What's the difference between PUT and POST?**

A: 
- **POST**: Creates a new resource. Idempotent means calling it multiple times creates multiple resources.
- **PUT**: Replaces an existing resource completely. Idempotent means calling it multiple times results in the same state.

In my code:
```java
@PostMapping("/meetings")  // Creates new
public Meeting createMeeting(@RequestBody Meeting meeting)

@PutMapping("/meetings/{id}/status")  // Updates existing
public ResponseEntity<Meeting> updateMeetingStatus(@PathVariable String id)
```

---

### LEVEL 2: HTTP PROTOCOL DETAILS

**Q: Walk me through what happens when you POST to `/api/meetings`.**

A: Let me trace the entire HTTP request/response cycle:

```
1. CLIENT SENDS REQUEST

POST /api/meetings HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Content-Length: 246
Connection: keep-alive

{
  "title": "Q3 Planning",
  "date": "2024-07-20T10:00:00Z",
  "duration": 60,
  "organizer": "john@company.com",
  "participants": ["alice@company.com", "bob@company.com"]
}

2. REQUEST PARSING (Spring Boot)

- Spring reads request line: POST /api/meetings HTTP/1.1
- Parses headers: Content-Type, Content-Length
- Reads request body (246 bytes) based on Content-Length
- Deserializes JSON to Meeting object using Jackson

3. ROUTING (Spring DispatcherServlet)

- URL pattern: /api/meetings
- HTTP method: POST
- Matches: @PostMapping("/meetings") in MeetingController
- Invokes: createMeeting(@RequestBody Meeting meeting)

4. BUSINESS LOGIC

Meeting meeting = new Meeting();
meeting.setId(UUID.randomUUID().toString());
meeting.setStatus("pending");
return meetingRepository.save(meeting);

5. RESPONSE GENERATED

HTTP/1.1 201 Created
Content-Type: application/json
Content-Length: 298

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Q3 Planning",
  ...
}

6. CLIENT RECEIVES

- Status code: 201 (resource created)
- Headers: Content-Type tells browser how to parse body
- Body: JSON serialized from Meeting object
- Frontend receives response and updates state
```

**Q: Why did you return 201 instead of 200?**

A: HTTP status codes have meanings:
- `200 OK` – Request succeeded, but resource already existed
- `201 Created` – Request succeeded, new resource was created

In REST best practices, you should return `201` when you create a resource. However, in my code I just return the object without explicitly setting the status:

```java
@PostMapping("/meetings")
public Meeting createMeeting(@RequestBody Meeting meeting) {
  // Actually returns 200 by default
  return meetingRepository.save(meeting);
}
```

**To do it correctly, I should return:**

```java
@PostMapping("/meetings")
public ResponseEntity<Meeting> createMeeting(@RequestBody Meeting meeting) {
  meeting.setId(UUID.randomUUID().toString());
  meeting.setStatus("pending");
  Meeting saved = meetingRepository.save(meeting);
  return ResponseEntity.status(HttpStatus.CREATED).body(saved);
  // Explicitly sets 201
}
```

**Q: What if the database fails? What status code should you return?**

A: `500 Internal Server Error`. Your code doesn't handle this:

```java
// Current code (doesn't handle exceptions)
return meetingRepository.save(meeting);

// Better practice:
try {
  return ResponseEntity.status(HttpStatus.CREATED)
    .body(meetingRepository.save(meeting));
} catch (DataAccessException e) {
  logger.error("Failed to save meeting", e);
  return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
    .body(Map.of("error", "Failed to create meeting"));
}
```

---

### LEVEL 3: ADVANCED HTTP/REST CONCEPTS

**Q: Your API doesn't have pagination. How would you add it?**

A: Good question. With millions of meetings, you can't return all. I'd implement:

```java
@GetMapping("/meetings")
public ResponseEntity<Page<Meeting>> getMeetings(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(defaultValue = "date,desc") String sort) {
  
  Pageable pageable = PageRequest.of(page, size, 
    Sort.by("date").descending());
  
  Page<Meeting> meetings = meetingRepository.findAll(pageable);
  
  return ResponseEntity.ok(meetings);
}
```

**Response:**
```json
{
  "content": [
    { "id": "...", "title": "Q3 Planning", ... },
    { "id": "...", "title": "Budget Review", ... }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": { "empty": false, "sorted": true }
  },
  "totalElements": 1000,
  "totalPages": 50,
  "last": false
}
```

**Q: What about caching? Should you cache meeting responses?**

A: Yes, but it's tricky:

```java
@GetMapping("/meetings/{id}")
@Cacheable(value = "meetings", key = "#id")
public ResponseEntity<Meeting> getMeeting(@PathVariable String id) {
  return meetingRepository.findById(id)
    .map(ResponseEntity::ok)
    .orElse(ResponseEntity.notFound().build());
}
```

**Problem:** Meeting status changes. You need cache invalidation:

```java
@PutMapping("/meetings/{id}/status")
@CacheEvict(value = "meetings", key = "#id")
public ResponseEntity<Meeting> updateMeetingStatus(
    @PathVariable String id,
    @RequestBody Map<String, String> updates) {
  // ...
}
```

**Q: How do you handle CORS for your API?**

A: You already did this:

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MeetingController { }
```

**But `@CrossOrigin(origins = "*")` is a security risk.** Better approach:

```java
@Configuration
public class CorsConfig {
  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
          .allowedOrigins("https://yourdomain.com", 
                         "https://app.yourdomain.com")
          .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
          .allowedHeaders("*")
          .allowCredentials(true)
          .maxAge(3600);
      }
    };
  }
}
```

**Q: What's the CORS handshake?**

A: When frontend makes cross-origin request:

```
1. Browser sends OPTIONS request (preflight)

OPTIONS /api/meetings HTTP/1.1
Host: localhost:8080
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type

2. Server responds with CORS headers

HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: content-type
Access-Control-Max-Age: 3600

3. Browser caches for 3600 sec, then sends actual request

POST /api/meetings HTTP/1.1
Host: localhost:8080
Origin: http://localhost:3000

{ ... }
```

**Q: What if you need to send credentials (cookies)?**

A: You need `allowCredentials(true)` and `credentials: 'include'` on frontend:

```javascript
fetch('http://localhost:8080/api/meetings', {
  method: 'POST',
  credentials: 'include',  // Send cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

---

## SECTION 2: WEBSOCKET PROTOCOL (Beginner → Expert)

### LEVEL 1: WHAT IS WEBSOCKET?

**Q: How is WebSocket different from HTTP?**

A: 
- **HTTP**: Client sends request, server sends response, connection closes. Stateless.
- **WebSocket**: After initial handshake, connection stays open. Full-duplex (both directions simultaneously).

**HTTP (pull model):**
```
Client: GET /api/participants → Server
Server: [List of participants] → Client
// Connection closes
```

**WebSocket (push model):**
```
Client ←→ Server (persistent connection)
Client: {"type": "join"} →
Server: ← {"type": "peer-joined"}
Client: {"type": "participant-left"} →
Server: ← {"type": "peer-left"}
```

**Q: Why use WebSocket for real-time in meetings instead of polling?**

A: Polling wastes bandwidth:

```javascript
// ❌ Polling (inefficient)
setInterval(() => {
  fetch('/api/participants')  // Every 2 seconds
}, 2000);
// For 1000 meetings = 500 requests/second = huge overhead
```

**WebSocket (efficient):**
```javascript
// ✅ WebSocket (event-driven)
ws.onmessage = (event) => {
  handleParticipantUpdate(JSON.parse(event.data));
};
// Only sends when something actually happens
```

---

### LEVEL 2: WEBSOCKET PROTOCOL HANDSHAKE

**Q: Walk me through the WebSocket handshake.**

A: It's a clever trick that upgrades HTTP to WebSocket:

```
STEP 1: Client sends HTTP Upgrade request

GET /signaling HTTP/1.1
Host: localhost:8080
Upgrade: websocket           ← Key header
Connection: Upgrade          ← Says "upgrade connection"
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==  ← Random base64
Sec-WebSocket-Version: 13    ← Protocol version
Origin: http://localhost:3000

STEP 2: Server accepts upgrade

HTTP/1.1 101 Switching Protocols  ← Status 101 = switching
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=  ← Derived from key

STEP 3: Underlying TCP connection now speaks WebSocket protocol

No longer HTTP. Binary frames exchanged instead of text.
```

**Q: What's the `Sec-WebSocket-Accept` calculation?**

A: Server does:

```
1. Take Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
2. Append magic string: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
   → dGhlIHNhbXBsZSBub25jZQ==258EAFA5-E914-47DA-95CA-C5AB0DC85B11
3. SHA-1 hash it
4. Base64 encode
   → s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**Why?** Prevents confused proxies from thinking it's HTTP and caching responses.

---

### LEVEL 3: WEBSOCKET FRAME FORMAT

**Q: Once WebSocket is connected, how are messages formatted?**

A: Binary frames, not text. Each frame has:

```
0                   1                   2                   3
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|(4bits)|A|   (7 bits)  |             (0/16/64)        |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set (4 bytes)
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

**Example: Sending `{"type": "join"}` (15 bytes)**

```
FIN opcode MASK payload-length  masking-key             payload
 1   0001   1    00001111       1a 2b 3c 4d   (masked data)
 
Binary: 10000001 11001111 00011010 00101011 00111100 01001101 ...
```

**Q: What's masking? Why do clients mask but servers don't?**

A: **Security vulnerability fix for older proxies.**

Masking means clients XOR their payload with a random 4-byte key:

```java
// In browser JavaScript, done automatically
ws.send(JSON.stringify({type: "join"}));
// Browser automatically masks the frame
```

**Your backend doesn't need to mask (Spring handles it):**

```java
s.sendMessage(new TextMessage(message));
// Spring sends unmasked frame (server → client is safe)
```

**Q: What are opcodes?**

A:
- `0x1` = Text frame (JSON, text data)
- `0x2` = Binary frame (binary data)
- `0x8` = Close frame (closing handshake)
- `0x9` = Ping frame (heartbeat)
- `0xA` = Pong frame (heartbeat response)

In your code:

```java
handleTextMessage(WebSocketSession session, TextMessage message)
// TextMessage uses opcode 0x1
```

---

### LEVEL 4: YOUR WEBSOCKET IMPLEMENTATION

**Q: Walk me through your `SignalingHandler` line by line.**

A:

```java
@Component
public class SignalingHandler extends TextWebSocketHandler {

  // ─────────────────────────────────────────────
  // DATA STRUCTURE: Thread-Safe Room Management
  // ─────────────────────────────────────────────
  
  private final Map<String, CopyOnWriteArrayList<WebSocketSession>> 
    roomSessions = new ConcurrentHashMap<>();
  
  // Why ConcurrentHashMap?
  // - Thread-safe for adding/removing rooms
  // - O(1) average lookup time
  // - Multiple threads might access simultaneously
  //   (Spring creates thread pool for each WebSocket message)
  
  // Why CopyOnWriteArrayList?
  // - Thread-safe for adding/removing sessions
  // - Optimized for reads (doesn't lock during iteration)
  // - Makes a copy on write (old iterators unaffected)
  // - Efficient for small datasets (<1000 items)

  // ─────────────────────────────────────────────
  // STEP 1: Connection Established
  // ─────────────────────────────────────────────
  
  @Override
  public void afterConnectionEstablished(WebSocketSession session) 
      throws Exception {
    System.out.println("New WebSocket connection: " + session.getId());
    
    // At this point:
    // - TCP handshake complete (3-way handshake)
    // - HTTP upgrade handshake complete (101 Switching Protocols)
    // - WebSocket connection established
    // - But we don't know which meeting this session belongs to yet
    // - We wait for "join" message to assign to a room
  }

  // ─────────────────────────────────────────────
  // STEP 2: Receive Message
  // ─────────────────────────────────────────────
  
  @Override
  protected void handleTextMessage(WebSocketSession session, 
                                   TextMessage message) throws Exception {
    
    // What just happened:
    // 1. Network delivered binary WebSocket frame
    // 2. Spring decoded the frame (unmasked payload)
    // 3. Spring converted to TextMessage (opcode 0x1)
    // 4. Called this method on a thread pool thread
    
    String payload = message.getPayload();
    // Example: {"type": "join", "meetingId": "abc-123"}
    
    Map<String, String> data = new ObjectMapper()
      .readValue(payload, Map.class);
    // Jackson deserializes JSON
    
    String type = data.get("type");

    // ─────────────────────────────────────────────
    // STEP 2A: Handle "join" Message
    // ─────────────────────────────────────────────
    
    if ("join".equals(type)) {
      String meetingId = data.get("meetingId");
      
      if (meetingId != null) {
        // Store meetingId in session attributes
        // (so we know which room this session belongs to)
        session.getAttributes().put("meetingId", meetingId);
        
        // Add this session to the room
        // computeIfAbsent: if room doesn't exist, create empty list
        roomSessions
          .computeIfAbsent(meetingId, k -> new CopyOnWriteArrayList<>())
          .add(session);
        
        // Thread safety analysis:
        // 1. computeIfAbsent atomically checks and creates
        // 2. CopyOnWriteArrayList.add() is thread-safe
        // 3. Even if 2 threads try to join same meeting simultaneously,
        //    both will be added correctly
        
        // Notify others in room
        broadcastToRoom(meetingId, session, 
          "{\"type\":\"peer-joined\", \"peerId\":\"" + 
          session.getId() + "\"}");
        
        System.out.println("Peer " + session.getId() + 
                          " joined meeting: " + meetingId);
      }
    } 
    
    // ─────────────────────────────────────────────
    // STEP 2B: Handle "end-meeting" Message
    // ─────────────────────────────────────────────
    
    else if ("end-meeting".equals(type)) {
      String meetingId = (String) session.getAttributes()
        .get("meetingId");
      
      if (meetingId != null) {
        System.out.println("Broadcasting end-meeting for room: " + 
                          meetingId);
        broadcastToRoom(meetingId, session, payload);
      }
    } 
    
    // ─────────────────────────────────────────────
    // STEP 2C: Handle Other Messages (relay)
    // ─────────────────────────────────────────────
    
    else {
      // Relay to room (used for WebRTC signaling:
      // offer/answer/ice-candidate)
      String meetingId = (String) session.getAttributes()
        .get("meetingId");
      
      if (meetingId != null) {
        broadcastToRoom(meetingId, session, payload);
      }
    }
  }

  // ─────────────────────────────────────────────
  // STEP 3: Broadcast to Room
  // ─────────────────────────────────────────────
  
  private void broadcastToRoom(String meetingId, 
                               WebSocketSession sender, 
                               String message) throws IOException {
    
    CopyOnWriteArrayList<WebSocketSession> sessions = 
      roomSessions.get(meetingId);
    
    if (sessions != null) {
      for (WebSocketSession s : sessions) {
        // Skip sender (don't echo back)
        if (s.isOpen() && !s.getId().equals(sender.getId())) {
          
          // synchronized: Ensures only one thread writes to socket
          // (WebSocket session isn't thread-safe for writes)
          synchronized (s) {
            s.sendMessage(new TextMessage(message));
            // Spring sends unmasked frame to client
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // STEP 4: Connection Closed
  // ─────────────────────────────────────────────
  
  @Override
  public void afterConnectionClosed(WebSocketSession session, 
                                    CloseStatus status) throws Exception {
    
    String meetingId = (String) session.getAttributes()
      .get("meetingId");
    
    if (meetingId != null && 
        roomSessions.containsKey(meetingId)) {
      
      // Remove this session from room
      roomSessions.get(meetingId).remove(session);
      
      // Notify others they left
      broadcastToRoom(meetingId, session, 
        "{\"type\":\"peer-left\", \"peerId\":\"" + 
        session.getId() + "\"}");
      
      // Clean up empty rooms (prevent memory leak)
      if (roomSessions.get(meetingId).isEmpty()) {
        roomSessions.remove(meetingId);
      }
    }
    
    System.out.println("Session closed for meeting: " + meetingId);
  }
}
```

---

### LEVEL 5: ADVANCED WEBSOCKET SCENARIOS

**Q: What happens if a client sends a message very quickly (100 messages/sec)?**

A: 

```javascript
// Client sends 100 messages rapidly
for (let i = 0; i < 100; i++) {
  ws.send(JSON.stringify({type: "offer", data: ...}));
}
```

**What happens:**

1. Browser queues all 100 messages
2. Browser sends them in TCP packets (might coalesce frames)
3. Server receives on thread pool thread
4. Spring deserializes each frame
5. Calls `handleTextMessage` 100 times

**Problem: Thread pool saturation**

```
Server has 10 threads for WebSocket handlers
If each handler takes 1ms to process, and you have 1000 users each 
sending 100 messages/sec:
- 100,000 messages/sec total
- 100,000 / 10 threads = 10,000ms wait per message
- UI appears frozen
```

**Solution:**

```java
@Configuration
public class WebSocketConfig implements WebSocketConfigurer {
  @Override
  public void registerWebSocketHandlers(
      WebSocketHandlerRegistry registry) {
    registry.addHandler(signalingHandler, "/signaling")
      .setAllowedOrigins("*")
      .setHandshakeHandler(new DefaultHandshakeHandler())
      .withSockJS()  // Fallback to polling if WebSocket fails
      .setClientLibraryUrl("https://cdn.jsdelivr.net/npm/sockjs-client");
  }
}

// OR use async processing
@Override
protected void handleTextMessage(WebSocketSession session, 
                                 TextMessage message) throws Exception {
  asyncTaskExecutor.execute(() -> {
    // Process in separate thread pool
    processMessage(session, message);
  });
}
```

**Q: What if the client disconnects abruptly (network failure)?**

A: TCP/IP detects it:

```
1. Client network failure
   - Browser doesn't explicitly close connection
   - TCP timeout (typically 2-4 hours on server)
   
2. Server keeps trying to write to socket
   - write() throws IOException
   - afterConnectionClosed() is NOT called immediately
   
3. Solution: Implement heartbeat (ping/pong)

@Scheduled(fixedDelay = 30000)  // Every 30 seconds
public void sendHeartbeat() {
  for (CopyOnWriteArrayList<WebSocketSession> sessions : 
       roomSessions.values()) {
    for (WebSocketSession session : sessions) {
      try {
        if (session.isOpen()) {
          session.sendMessage(new PingMessage(
            ByteBuffer.allocate(0)));
          // Browser automatically responds with Pong
        }
      } catch (IOException e) {
        // Connection dead, cleanup
        try {
          session.close();
        } catch (IOException ignored) {}
      }
    }
  }
}
```

**Q: How do you scale WebSocket to multiple servers?**

A: Current architecture is single-server:

```
roomSessions (in-memory)
├─ meeting-1: [session1, session2]
└─ meeting-2: [session3, session4]
```

**With multiple servers (horizontal scaling):**

```
Server A (8080)          Server B (8080)          Server C (8080)
├─ meeting-1: [s1, s2]   ├─ meeting-3: [s5, s6]  ├─ meeting-5: [s9]
└─ meeting-2: [s3, s4]   └─ meeting-4: [s7, s8]  └─ meeting-6: [s10]

Problem: User on Server A sends message to meeting-3 (on Server B)
```

**Solution: Redis Pub/Sub**

```java
@Configuration
public class WebSocketConfig {
  
  @Bean
  public SubscriptionListener subscriptionListener(
      StringRedisTemplate redisTemplate) {
    return new SubscriptionListener(redisTemplate);
  }
}

// Modify broadcastToRoom
private void broadcastToRoom(String meetingId, 
                             WebSocketSession sender, 
                             String message) throws IOException {
  
  // 1. Broadcast to local sessions
  CopyOnWriteArrayList<WebSocketSession> sessions = 
    roomSessions.get(meetingId);
  if (sessions != null) {
    for (WebSocketSession s : sessions) {
      if (s.isOpen() && !s.getId().equals(sender.getId())) {
        synchronized (s) {
          s.sendMessage(new TextMessage(message));
        }
      }
    }
  }
  
  // 2. Publish to Redis for other servers
  redisTemplate.convertAndSend(
    "meeting:" + meetingId, 
    message);
}

// Listen for messages from other servers
@Bean
public MessageListener redisMessageListener(
    StringRedisTemplate redisTemplate) {
  return (message, pattern) -> {
    String meetingId = pattern.split(":")[1];
    CopyOnWriteArrayList<WebSocketSession> sessions = 
      roomSessions.get(meetingId);
    
    if (sessions != null) {
      for (WebSocketSession session : sessions) {
        if (session.isOpen()) {
          synchronized (session) {
            session.sendMessage(
              new TextMessage(message.toString()));
          }
        }
      }
    }
  };
}
```

---

## SECTION 3: WEBRTC PROTOCOL (Foundation → Expert)

### LEVEL 1: WHAT IS WEBRTC?

**Q: WebRTC = WebSocket for video?**

A: No. They're very different:

- **WebSocket**: Application layer (Layer 7). Delivers reliable messages in order.
- **WebRTC**: Media layer (Layer 5-6). Low latency, optimized for real-time audio/video.

**Q: How does WebRTC work?**

A: Three main components:

1. **Signaling** (via WebSocket)
   ```
   Alice: "I want to call Bob"
   Signaling Server: Sends offer to Bob
   Bob: Responds with answer
   Alice & Bob: Exchange ICE candidates
   ```

2. **Peer Connection** (direct P2P)
   ```
   Alice ←→ Bob (direct UDP connection)
   Audio/Video frames sent directly, not through server
   ```

3. **Media** (audio/video codecs)
   ```
   VP8/VP9 video codec
   Opus audio codec
   Adaptive bitrate (REMB - Receiver Estimated Max Bitrate)
   ```

---

### LEVEL 2: WEBRTC SIGNALING FLOW

**Q: Walk me through the WebRTC handshake in your system.**

A:

```
STEP 1: Alice joins meeting (WebSocket)
────────────────────────────────────────

Frontend (Alice):
ws.send({
  type: "join",
  meetingId: "meeting-123"
})

Backend:
→ Store Alice's session in room
→ Broadcast to Bob: {"type": "peer-joined", "peerId": "alice-session"}

STEP 2: Bob's browser receives peer-joined
────────────────────────────────────────

Frontend (Bob):
ws.onmessage = (event) => {
  if (event.data.type === "peer-joined") {
    // Bob initiates RTCPeerConnection to Alice
    initiateP2PConnection("alice-session");
  }
}

STEP 3: Create RTCPeerConnection (Bob)
────────────────────────────────────────

const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] }
  ]
});

// iceServers: STUN servers help discover public IP
// STUN = Session Traversal Utilities for NAT

STEP 4: Add local stream (Bob)
────────────────────────────────────────

const localStream = await navigator.mediaDevices
  .getUserMedia({ video: true, audio: true });

// Requests browser permission
// Returns MediaStream with video + audio tracks

localStream.getTracks().forEach(track => {
  peerConnection.addTrack(track, localStream);
});

// RTCRtpSender added for each track

STEP 5: Create offer (Bob)
────────────────────────────────────────

const offer = await peerConnection.createOffer({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
});

// offer is SDP (Session Description Protocol):
// v=0
// o=- 123456 789 IN IP4 192.168.1.100
// s=-
// t=0 0
// a=group:BUNDLE 0 1
// a=extmap-allow-mixed
// m=audio 9 UDP/TLS/RTP/SAVPF 111
// a=rtpmap:111 opus/48000/2
// m=video 9 UDP/TLS/RTP/SAVPF 96
// a=rtpmap:96 VP8/90000
// a=ice-ufrag:abc123
// a=ice-pwd:xyz789

await peerConnection.setLocalDescription(offer);

// Sets Bob's description (will encode his audio/video params)
```

**Q: What's in an SDP offer?**

A: Session Description Protocol describes:
- Media types (audio, video, data)
- Codecs (opus, VP8)
- ICE candidates (IP addresses to connect to)
- DTLS fingerprint (encryption)
- SSRC (Synchronization Source ID)

```
v=0                                           # Version
o=Bob 123 456 IN IP4 192.168.1.5             # Origin (Bob's IP)
s=-                                          # Session name
t=0 0                                        # Time
a=group:BUNDLE 0 1                           # Group audio+video
m=audio 9 UDP/TLS/RTP/SAVPF 111             # Audio stream (port 9 = ephemeral)
a=rtpmap:111 opus/48000/2                   # Codec: Opus 48kHz stereo
a=fmtp:111 minptime=10;useinbandfec=1       # Codec params
a=rtcp-mux                                   # RTCP same port as RTP
a=ice-ufrag:g7Ec                             # ICE username fragment
a=ice-pwd:x3fUr5wz7bnT7Wd5wJ77ZTL4         # ICE password
a=fingerprint:sha-256 FA:FF:FF:FF:...       # DTLS cert fingerprint

m=video 9 UDP/TLS/RTP/SAVPF 96              # Video stream
a=rtpmap:96 VP8/90000                        # Codec: VP8 90kHz
a=rtcp-fb:96 ccm fir                         # RTCP feedback
a=rtcp-fb:96 nack                            # NACK support
```

**STEP 6: Send offer via WebSocket (Bob → Server → Alice)**

```
Frontend (Bob):
ws.send({
  type: "offer",
  offer: offer.sdp,  // SDP string
  peerId: "alice-session"
});

Backend: (your SignalingHandler)
→ Relay to Alice

Frontend (Alice):
ws.onmessage = (event) => {
  if (event.data.type === "offer") {
    handleOffer(event.data.offer);
  }
}

function handleOffer(offerSdp) {
  const offer = new RTCSessionDescription({
    type: "offer",
    sdp: offerSdp
  });
  
  peerConnection.setRemoteDescription(offer);
  
  // Now Alice knows: Bob's codecs, ICE candidates, encryption params
}

STEP 7: Create answer (Alice)
──────────────────────────────

const answer = await peerConnection.createAnswer();
// Answer has same structure as offer, but with Alice's params

await peerConnection.setLocalDescription(answer);

// Send answer back to Bob
ws.send({
  type: "answer",
  answer: answer.sdp,
  peerId: "bob-session"
});

STEP 8: Exchange ICE candidates
────────────────────────────────

// As soon as setLocalDescription() is called,
// RTCPeerConnection starts gathering ICE candidates

peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    ws.send({
      type: "ice-candidate",
      candidate: event.candidate.toJSON(),
      peerId: "other-peer"
    });
  }
};

// Candidate example:
{
  "candidate": "candidate:842163049 1 udp 1677729535 192.168.1.5 54321 typ srflx raddr 192.168.1.5 rport 54321",
  "sdpMLineIndex": 0,
  "sdpMid": "audio"
}

// This means: "You can reach me at 192.168.1.5:54321 for audio"
// (srflx = server reflexive address, discovered via STUN)
```

---

### LEVEL 3: WEBRTC MEDIA LAYER

**Q: Once offer/answer/ICE are exchanged, what happens?**

A:

```
STEP 1: Connection establishment
────────────────────────────────

Both peers have:
1. Each other's codecs and RTP parameters
2. IP addresses/ports to connect to (ICE candidates)
3. DTLS fingerprint for encryption

STEP 2: DTLS handshake
──────────────────────

(Datagram TLS - like TLS but over UDP)

Alice:                          Bob:
ClientHello ──────────────→
                        ← ServerHello
ClientKeyExchange ───────→
Finished ──────────────→
                        ← Finished

All subsequent RTP packets encrypted with negotiated key

STEP 3: RTP stream
──────────────────

Once DTLS complete:

Bob sends audio RTP packets to Alice:
────────────────────────────────────

RTP Header:
┌───────────────────────────────────────┐
│ V=2 │ P │ X │ CC │ M │ PT (111=Opus) │
│ SSRC=123456789 (Bob's audio source)   │
│ Sequence Number: 0                    │
│ Timestamp: 960000                     │
│ Payload: Opus audio data              │
└───────────────────────────────────────┘

Sent every 20ms:
- Payload: 20ms of Opus audio (960 bytes at 48kHz)
- RTP packet: ~50 bytes header + payload
- UDP packet: RTP packet + UDP header

Alice receives RTP, decodes Opus, plays through speaker

STEP 4: Congestion Control (REMB)
─────────────────────────

Alice monitors:
- Packet loss rate
- Jitter (timing variance)
- Bandwidth available

Sends RTCP REMB (Receiver Estimated Max Bitrate):
"Send video at max 2.5 Mbps"

Bob's encoder adjusts:
- VP8 resolution: 1280x720 → 640x360
- Frame rate: 30fps → 15fps
- Quality parameters

STEP 5: NACK (Negative Acknowledgement)
───────────────────────────────

If Alice misses RTP packet:

Alice sends NACK: "I'm missing packet 1234"
Bob retransmits packet 1234

(Unlike TCP, RTP doesn't guarantee delivery, but NACK helps)
```

**Q: What if WebRTC connection can't be established (firewall, NAT)?**

A: That's where TURN comes in:

```
STUN (Session Traversal Utilities for NAT):
- Learns your public IP:port via public STUN server
- Doesn't relay traffic
- Free service available

TURN (Traversal Using Relays around NAT):
- If P2P fails, relay through TURN server
- Expensive (uses server bandwidth)

Your code only uses STUN:
peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] }
    // Missing TURN! Production needs this:
    // { urls: ["turn:your-turn-server.com:3478"], 
    //   username: "user", 
    //   credential: "pass" }
  ]
});

Without TURN, users behind carrier-grade NAT can't call each other.
```

---

### LEVEL 4: YOUR WEBRTC IMPLEMENTATION

**Q: Your code doesn't handle SDP parsing. What could go wrong?**

A:

```javascript
// Your current code
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    this.ws.send(JSON.stringify({
      type: "ice-candidate",
      candidate: event.candidate.toJSON(),
      peerId: peerId
    }));
  }
};

// Problems:
// 1. What if ice-candidate arrives before setRemoteDescription()?
//    → Error: can't add candidate without remote description

// Better:
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    if (this.remoteDescriptionSet) {  // Check flag
      // Safe to add
      this.ws.send(JSON.stringify({
        type: "ice-candidate",
        candidate: event.candidate.toJSON(),
        peerId: peerId
      }));
    } else {
      // Queue it
      this.pendingCandidates.push(event.candidate);
    }
  }
};

// When remote description arrives:
async handleOffer(offerSdp) {
  await this.peerConnection.setRemoteDescription(
    new RTCSessionDescription({ type: "offer", sdp: offerSdp })
  );
  this.remoteDescriptionSet = true;
  
  // Add queued candidates
  for (let candidate of this.pendingCandidates) {
    await this.peerConnection.addIceCandidate(candidate);
  }
}
```

**Q: How do you handle connection failures?**

A:

```javascript
peerConnection.onconnectionstatechange = () => {
  console.log("Connection state:", peerConnection.connectionState);
  // "new" → "connecting" → "connected" → "disconnected" 
  //  → "failed" → "closed"
  
  if (peerConnection.connectionState === "failed") {
    // Reconnect or show error
    console.error("P2P connection failed");
    showErrorToUser("Unable to establish video call");
    
    // Could try:
    // 1. Restart ICE (new candidates)
    // 2. Fall back to TURN server
    // 3. Reconnect entire peer connection
  }
};

// Monitor ICE connection state separately
peerConnection.oniceconnectionstatechange = () => {
  console.log("ICE state:", peerConnection.iceConnectionState);
  // "new" → "checking" → "connected" → "completed" 
  //  → "disconnected" → "failed" → "closed"
};
```

---

### LEVEL 5: ADVANCED WEBRTC SCENARIOS

**Q: How do you handle video for a meeting with 5+ participants?**

A: Your current code is peer-to-peer:

```
Alice ←→ Bob
Alice ←→ Carol
Alice ←→ David
Alice ←→ Eve

Alice has 4 P2P connections, encoding video 4 times
Each P2P connection: 1 Mbps video = 4 Mbps total upload
```

**Problem:** Bandwidth and CPU intensive.

**Solution 1: Mesh (what you have)**
```
Pro: Low latency, no server dependency
Con: O(n²) connections, high bandwidth
Good for: <5 participants
```

**Solution 2: Simulcast (multiple bitrates)**
```
Alice encodes video at 3 bitrates:
- 500 Kbps (low bandwidth)
- 1.5 Mbps (medium)
- 3 Mbps (high)

Each peer subscribes to 1 bitrate based on their connection
```

**Solution 3: Selective Forwarding Unit (SFU) - Server**
```
Alice ──→ SFU Server ──→ Bob
Alice ──→ SFU Server ──→ Carol
Alice ──→ SFU Server ──→ David
Alice ──→ SFU Server ──→ Eve

Server receives 1 stream from Alice, forwards to 4 people
Alice: 1 Mbps up
Server: 4 Mbps up (but powerful)
Bob/Carol/David/Eve: 1 Mbps down each

Better for: 5+ participants
Requires: Server with good bandwidth
```

**Solution 4: Multipoint Conferencing Unit (MCU)**
```
Alice ──→ MCU ──→ Composite video ──→ Bob
Bob ──→ MCU ──→ Composite video ──→ Alice
Carol ──→ MCU ──→ Composite video ──→ Alice, Bob
...

Server composites all videos into 1 stream
Lowest bandwidth
Highest latency (processing time)
Highest server cost

Good for: Large scale, broadcast scenarios
```

**Q: How would you implement SFU in your system?**

A: You'd need a WebRTC media server (Janus, Kurento, Medooze):

```javascript
// Frontend stays mostly the same
const peerConnection = new RTCPeerConnection({
  iceServers: [...],
  iceGatheringTimeout: 5000
});

// But instead of peer-to-peer with each user,
// you connect only to SFU server:

const localStream = await navigator.mediaDevices
  .getUserMedia({ video: true, audio: true });

localStream.getTracks().forEach(track => {
  peerConnection.addTrack(track, localStream);
});

// Send offer to SFU (via signaling)
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

signaling.send({
  type: "offer-to-sfu",
  offer: offer.sdp
});

// Receive answer from SFU
signaling.onmessage = async (event) => {
  if (event.type === "answer-from-sfu") {
    const answer = new RTCSessionDescription({
      type: "answer",
      sdp: event.answer
    });
    await peerConnection.setRemoteDescription(answer);
  } else if (event.type === "add-remote-track") {
    // SFU has new participant
    // Request their video track
  }
};

// Backend (SFU server handles WebRTC media)
// Frontend stays simple, just handles signaling
```

---

## SECTION 4: NLP & AI INTEGRATION (Beginner → Expert)

### LEVEL 1: BASICS

**Q: What's NLP?**

A: Natural Language Processing - processing human language. In your case:
- Input: Messy meeting transcript
- Output: Structured tasks and summary

**Q: Why do you have two approaches (AI + regex)?**

A: Tradeoff:
- **AI (OpenRouter/Gemini)**: More accurate, understands context, costs money
- **Regex**: Fast, free, reliable, but limited

---

### LEVEL 2: REGEX DEEP DIVE

**Q: Explain your regex patterns.**

A:

```java
// Pattern 1: "we need to ..."
Pattern.compile("(?i)\\b(?:we|i|you|they|he|she)\\s+(?:need|needs|ought)\\s+to\\s+([^.!?]{5,})")

// (?i) = case insensitive flag
// \\b = word boundary (start of "we")
// (?:we|i|you|they|he|she) = non-capturing group (any subject)
// \\s+ = one or more whitespace
// (?:need|needs|ought) = action verbs
// \\s+to\\s+ = "to" keyword
// ([^.!?]{5,}) = capture group: 5+ chars, up to punctuation
// [^.!?] = negated character class (any char except . ! ?)

// Example match:
"we need to review the budget by Friday"
                            ↑ start            ↑ end
Captures: "review the budget by Friday"
```

**Q: What about this pattern?**

```java
Pattern.compile("(?i)\\b(\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+(?:will|should|needs?\\s+to|has\\s+to|is\\s+going\\s+to|can|could)\\s+([^.!?]+)")
```

A: This extracts assignees:

```
(\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)
= Capitalized words: "John", "Alice Smith"

(?:will|should|needs\\s+to|...)
= Action verbs

([^.!?]+)
= Task description

Example: "John will review the budget"
Captures:
- Group 1: "John" (assignee)
- Group 2: "review the budget" (task)
```

**Q: How do you handle nested groups in regex?**

A:

```java
// Problem: Multiple capture groups can be confusing
Pattern.compile("(A) (B (C) D) (E)");
// Groups:
// 1 = A
// 2 = B (C) D
// 3 = C (nested inside group 2)
// 4 = E

String input = "A B C D E";
Matcher m = pattern.matcher(input);
if (m.find()) {
  m.group(1);  // "A"
  m.group(2);  // "B C D"
  m.group(3);  // "C"
  m.group(4);  // "E"
}

// In your code:
Pattern.compile("([^.!?]+)\\s+to\\s+([^.!?]+)");
// You use group(1) to extract task:
String taskText = matcher.group(1).trim();
// If you had nested groups, would need to count carefully
```

**Q: What's the time complexity of your regex matching?**

A: For each sentence, you try ~12 patterns:

```java
for (Pattern pattern : TASK_PATTERNS) {
  Matcher matcher = pattern.matcher(sentence);
  if (matcher.find()) {
    // Found a match
  }
}

// Time complexity:
// O(m * n * s)
// m = number of sentences
// n = number of patterns (12)
// s = average sentence length

// Regex matching is O(s) typically,
// but with backtracking can be O(2^s) in worst case
// (catastrophic backtracking)
```

**Example of catastrophic backtracking:**

```java
// ❌ BAD pattern
Pattern.compile("(a+)+b");
// Tries: "aaa" → "aa" + "a" → "a" + "aa" → ... (exponential)

// With input "aaaaaaaaac" (no match)
// Takes MINUTES to fail

// ✅ GOOD pattern
Pattern.compile("a+b");
// Linear time
```

**Q: Do you have this problem?**

A: No, your patterns are simple:
```java
Pattern.compile("(?i)\\b(?:we|i|you)\\s+(?:need|needs)\\s+to\\s+([^.!?]{5,})")
// No nested quantifiers, no backtracking risk
```

---

### LEVEL 3: FUZZY MATCHING

**Q: Explain Jaccard similarity.**

A:

```
Jaccard Similarity = |A ∩ B| / |A ∪ B|

Example:
Task 1: "Review budget proposal"
Task 2: "Review the proposal"

Step 1: Split into words
Set A = {review, budget, proposal}
Set B = {review, the, proposal}

Step 2: Intersection (common words)
A ∩ B = {review, proposal} → size = 2

Step 3: Union (all unique words)
A ∪ B = {review, budget, proposal, the} → size = 4

Step 4: Calculate
Jaccard = 2 / 4 = 0.5 (50% similar)

Threshold: > 0.6 = duplicate
Result: 0.5 < 0.6 → NOT a duplicate
```

**Q: Why 0.6? Is it arbitrary?**

A: Yes, it's tunable:

```java
double SIMILARITY_THRESHOLD = 0.6;

// Lower threshold (0.3) = more deduplication
// "Review budget" and "budget discussion" both removed
// Risk: Removes different tasks

// Higher threshold (0.9) = less deduplication
// "Review budget" and "Review the budget" kept as separate
// Risk: Duplicate tasks remain

// 0.6 is empirically good for typical meetings
// You could tune per domain:
// - Technical: higher threshold (0.8)
// - General: lower threshold (0.5)
```

**Q: What about lemmatization? "reviews" vs "review"?**

A: You don't do it. Your regex patterns don't handle tense:

```java
// Problem
Task 1: "Review the budget"
Task 2: "Reviewed the budget"

Set 1 = {review, the, budget}
Set 2 = {reviewed, the, budget}  ← Different word

Jaccard = {the, budget} / {review, reviewed, the, budget} = 2/4 = 0.5
→ Not detected as duplicate

// Solution: Lemmatization
import opennlp.tools.lemmatizer.Lemmatizer;

// "review", "reviews", "reviewed" → all map to "review"
String lemma = lemmatizer.lemmatize("reviewed");  // "review"

// Then Jaccard works better
```

**Better approach:**

```java
private boolean isSimilar(String a, String b) {
  // Lemmatize each word
  Set<String> wordsA = lemmatize(a);
  Set<String> wordsB = lemmatize(b);
  
  Set<String> intersection = new HashSet<>(wordsA);
  intersection.retainAll(wordsB);
  
  Set<String> union = new HashSet<>(wordsA);
  union.addAll(wordsB);
  
  double jaccard = (double) intersection.size() / union.size();
  return jaccard > 0.6;
}

private Set<String> lemmatize(String text) {
  return Arrays.stream(text.toLowerCase().split("\\s+"))
    .map(word -> lemmatizer.lemmatize(word, "VB"))  // Lemmatize as verb
    .collect(Collectors.toSet());
}
```

---

### LEVEL 4: AI API INTEGRATION

**Q: Walk me through your OpenRouter call.**

A:

```java
private String callOpenRouter(String prompt) {
  try {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("Authorization", "Bearer " + OPENROUTER_API_KEY);
    headers.set("HTTP-Referer", "http://localhost:8080");
    
    // HTTP-Referer: OpenRouter tracks referers for analytics
    
    Map<String, Object> requestBody = new HashMap<>();
    requestBody.put("model", "google/gemini-2.5-flash");
    // Other models: "meta-llama/llama-2-70b-chat", "openai/gpt-4"
    
    Map<String, String> message = new HashMap<>();
    message.put("role", "user");
    message.put("content", prompt);
    
    requestBody.put("messages", Collections.singletonList(message));
    requestBody.put("temperature", 0.7);  // Not in your code but good
    requestBody.put("max_tokens", 2000);  // Limit response length
    
    HttpEntity<Map<String, Object>> request = 
      new HttpEntity<>(requestBody, headers);
    
    ResponseEntity<Map> response = restTemplate.postForEntity(
      OPENROUTER_URL, request, Map.class);
    
    // OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    if (response.getStatusCode().is2xxSuccessful() && 
        response.getBody() != null) {
      
      List<Map<String, Object>> choices = 
        (List<Map<String, Object>>) response.getBody().get("choices");
      
      if (choices != null && !choices.isEmpty()) {
        Map<String, Object> messageResp = 
          (Map<String, Object>) choices.get(0).get("message");
        
        if (messageResp != null && 
            messageResp.get("content") != null) {
          return messageResp.get("content").toString().trim();
        }
      }
    }
  } catch (Exception e) {
    System.err.println("OpenRouter API Error: " + e.getMessage());
  }
  
  return null;  // Fallback to regex
}
```

**Q: What's the response format?**

A: OpenRouter returns OpenAI-compatible format:

```json
{
  "id": "chatcmpl-8KZmE6xO4n...",
  "object": "chat.completion",
  "created": 1699288391,
  "model": "google/gemini-2.5-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Review budget proposal | Alice | high\nFinalize timeline | Bob | medium"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 156,
    "completion_tokens": 42,
    "total_tokens": 198
  }
}
```

**Q: How much does OpenRouter cost?**

A:

```
Pricing (varies by model):
- Gemini 2.5 Flash: $0.075 per million input tokens, $0.30 per million output
- GPT-4: $0.03 per input token, $0.06 per output token (expensive!)
- Llama 2 70B: $0.90 per million tokens

For 100-word transcript:
~200 input tokens + 50 output tokens = 250 tokens
Cost: 250 / 1,000,000 * $0.075 = $0.0000188 ≈ 0.002 cents

For 1M transcripts/month:
$18 USD/month (reasonable)
```

**Q: What if OpenRouter rate-limits you?**

A: You get:

```
HTTP 429 Too Many Requests
Retry-After: 60

Your code catches Exception but doesn't handle 429 specifically:

} catch (Exception e) {
  System.err.println("OpenRouter API Error: " + e.getMessage());
  return null;  // Falls back to regex
}

Better:

} catch (HttpClientErrorException.TooManyRequests e) {
  // 429 error
  long retryAfter = Long.parseLong(
    e.getResponseHeaders().getFirst("Retry-After"));
  
  Thread.sleep(retryAfter * 1000);
  return callOpenRouter(prompt);  // Retry
} catch (Exception e) {
  return null;  // Fallback
}
```

---

### LEVEL 5: ADVANCED NLP

**Q: How would you improve task extraction accuracy?**

A:

```
1. FINE-TUNING
   - Collect 1000 meeting transcripts
   - Manually label tasks
   - Fine-tune model on your domain
   - Result: 85% → 95% accuracy
   - Cost: $500-5000

2. FEW-SHOT PROMPTING
   Instead of generic prompt:
   
   "Extract tasks from transcript"
   
   Use examples:
   
   "Transcript: Alice: we need to review the budget
              Bob: agreed, let's do it Friday
   
   Task: Review budget | Alice | high
   
   Now extract tasks from: ..."

3. CHAIN-OF-THOUGHT
   "Step 1: Find action verbs (need, should, will)
    Step 2: Extract task description
    Step 3: Find assignee (name before verb)
    Step 4: Determine priority from keywords
    
    Meeting: Alice needs to urgently review budget
    Step 1: Actions: needs
    Step 2: Task: review budget
    Step 3: Assignee: Alice
    Step 4: Priority: high (urgently)
    
    Output: Review budget | Alice | high"

4. MULTI-MODEL VOTING
   - Call Gemini, Claude, GPT-4
   - Vote on tasks
   - Use majority decision
   - Higher accuracy (95%+)
   - Higher cost (3x)

5. SEMANTIC SEARCH
   Don't use Jaccard, use embeddings:
   
   "Review budget proposal" → embedding: [0.1, 0.5, -0.3, ...]
   "Review proposal" → embedding: [0.12, 0.48, -0.28, ...]
   
   Cosine similarity: 0.98 (nearly identical)
   
   Uses: HuggingFace embeddings or OpenAI API
   Cost: extra API call
   Accuracy: 98% vs 60% with Jaccard
```

---

## SECTION 5: DATABASE & TRANSACTIONS (Intermediate → Expert)

### LEVEL 1: BASICS

**Q: Your schema looks normalized. Why?**

A: Normalization prevents anomalies:

```
❌ DENORMALIZED (BAD)
meetings table:
id | title | date | organizer | participant_1 | participant_2 | participant_3
1  | Q3... | ...  | john@...  | alice@...     | bob@...       | NULL

Problem: What if 4 participants? Add participant_4 column? 10 participants?
Wasted space for NULL values
Can't query "all meetings for alice"
```

**✅ NORMALIZED (GOOD)**
```
meetings:
id | title | date | organizer

meeting_participants:
meeting_id | participant
1          | alice@...
1          | bob@...
1          | carol@...
```

---

### LEVEL 2: TRANSACTION SAFETY

**Q: What happens if the database fails while saving?**

A:

```java
@PostMapping("/meetings")
public Meeting createMeeting(@RequestBody Meeting meeting) {
  meeting.setId(UUID.randomUUID().toString());
  meeting.setStatus("pending");
  return meetingRepository.save(meeting);
  // If save() throws exception, method propagates it
  // Spring catches it, returns 500 error
}

// But what about participants?
// meeting_participants INSERT happens AFTER
// If that fails, meeting exists but without participants
```

**Problem: Partial inserts**

```
START TRANSACTION

INSERT INTO meetings (id, title, ...) VALUES (...)  ✓ Success

INSERT INTO meeting_participants VALUES (id, alice)  ✓ Success
INSERT INTO meeting_participants VALUES (id, bob)    ✓ Success
INSERT INTO meeting_participants VALUES (id, carol)  ✗ DATABASE CRASH

ROLLBACK (or no)? ← What happened?
```

**Solution: Explicit transaction**

```java
@Transactional  // ← Spring manages transaction
@PostMapping("/meetings")
public Meeting createMeeting(@RequestBody Meeting meeting) {
  meeting.setId(UUID.randomUUID().toString());
  meeting.setStatus("pending");
  
  // All of this runs in one transaction:
  Meeting saved = meetingRepository.save(meeting);
  // Hibernate flushes: INSERT meetings, INSERT participants
  
  // If ANY exception: ROLLBACK everything
  // If all succeed: COMMIT everything
  
  return saved;
}
```

**Q: What isolation level?**

A: Default is READ_COMMITTED (good for most cases):

```
ISOLATION LEVELS (SQL standard):
┌────────────────────┬────────┬─────────┬────────────┐
│ Level              │ Dirty  │ Unrep   │ Phantom    │
│                    │ Read   │ Read    │ Read       │
├────────────────────┼────────┼─────────┼────────────┤
│ READ_UNCOMMITTED   │ Yes    │ Yes     │ Yes        │
│ READ_COMMITTED     │ No     │ Yes     │ Yes        │ ← Default
│ REPEATABLE_READ    │ No     │ No      │ Yes        │
│ SERIALIZABLE       │ No     │ No      │ No         │
└────────────────────┴────────┴─────────┴────────────┘

@Transactional(isolation = Isolation.SERIALIZABLE)
public void criticalOperation() {
  // Slowest but safest
  // Good for: Money transfers, inventory
  // Bad for: High concurrency
}
```

---

### LEVEL 3: LOCKING & CONCURRENCY

**Q: Two users update the same meeting status. What happens?**

A:

```
T1 (User A): GET /api/meetings/123 → status = "pending"
T2 (User B): GET /api/meetings/123 → status = "pending"

T1: PUT /api/meetings/123/status → {"status": "confirmed"}
    UPDATE meetings SET status = 'confirmed' WHERE id = '123'

T2: PUT /api/meetings/123/status → {"status": "cancelled"}
    UPDATE meetings SET status = 'cancelled' WHERE id = '123'

Final result: status = 'cancelled'
T1's update is lost (lost update problem)
```

**Solution 1: Pessimistic Locking**

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT m FROM Meeting m WHERE m.id = ?1")
Optional<Meeting> findByIdForUpdate(String id);

@Transactional
public ResponseEntity<Meeting> updateMeetingStatus(
    @PathVariable String id,
    @RequestBody Map<String, Object> updates) {
  
  // Acquires database lock (FOR UPDATE)
  Optional<Meeting> meetingOpt = meetingRepository
    .findByIdForUpdate(id);
  
  if (!meetingOpt.isPresent()) {
    return ResponseEntity.notFound().build();
  }
  
  Meeting meeting = meetingOpt.get();  // Locked
  // Other threads wait here
  
  meeting.setStatus((String) updates.get("status"));
  meetingRepository.save(meeting);
  // Lock released on transaction commit
  
  return ResponseEntity.ok(meeting);
}
```

**Solution 2: Optimistic Locking (version number)**

```java
@Entity
public class Meeting {
  @Id
  private String id;
  
  @Version  // Optimistic lock
  private Long version;
  
  private String status;
}

// In database:
// meetings table:
// id | status | version
// 123| pending| 1

@Transactional
public void updateStatus(String id, String newStatus) {
  Meeting m = meetingRepository.findById(id).get();
  // version = 1
  
  m.setStatus(newStatus);
  meetingRepository.save(m);
  
  // Hibernate generates:
  // UPDATE meetings 
  // SET status = ?, version = version + 1
  // WHERE id = ? AND version = ?
  // 
  // If another thread updated: version is now 2
  // WHERE condition fails
  // Throws OptimisticLockException
}
```

**Q: Pessimistic vs Optimistic?**

A:
```
PESSIMISTIC:
- Locks immediately
- Waits for lock (blocks other threads)
- Safe but slow
- Good for: Few conflicts, high contention
  Example: Ticket booking (everyone wants same seat)

OPTIMISTIC:
- Detects conflict on commit
- Retries if conflict
- Fast but needs retry logic
- Good for: Many conflicts unlikely
  Example: Meeting scheduling (rarely same time)
```

---

### LEVEL 4: N+1 QUERY PROBLEM

**Q: What's the N+1 query problem?**

A:

```java
// ❌ BAD: N+1 queries
@GetMapping("/meetings")
public List<Meeting> getMeetings() {
  List<Meeting> meetings = meetingRepository.findAll();
  
  // At this point, Hibernate hasn't loaded participants
  
  for (Meeting m : meetings) {
    // For EACH meeting, loads participants
    List<String> participants = m.getParticipants();
    // Triggers: SELECT * FROM meeting_participants 
    //           WHERE meeting_id = ?
  }
  
  return meetings;
}

// Query pattern:
// 1 query: SELECT * FROM meetings     (fetches 100 meetings)
// 100 queries: SELECT * FROM meeting_participants WHERE meeting_id = ?
// Total: 101 queries! (1 + N)
```

**Solution: Eager loading**

```java
@Entity
public class Meeting {
  @ElementCollection(fetch = FetchType.EAGER)
  // ↑ Load participants immediately
  @CollectionTable(name = "meeting_participants")
  private List<String> participants;
}

// OR use @Query with JOIN FETCH

@Repository
public interface MeetingRepository 
    extends JpaRepository<Meeting, String> {
  
  @Query("SELECT DISTINCT m FROM Meeting m " +
         "LEFT JOIN FETCH m.participants")
  List<Meeting> findAllWithParticipants();
}

// Now only 1 query: SELECT m.*, p.* 
//                   FROM meetings m 
//                   LEFT JOIN meeting_participants p
//                   ON m.id = p.meeting_id
```

---

### LEVEL 5: QUERY OPTIMIZATION

**Q: Your `findBusyMeetingsForUser` query - how would you optimize it?**

A:

```java
// Current query
@Query("SELECT m FROM Meeting m WHERE " +
       "(m.organizer = :email OR :email MEMBER OF m.participants) " +
       "AND m.status NOT IN ('cancelled', 'declined')")
List<Meeting> findBusyMeetingsForUser(@Param("email") String email);

// Performance issues:
// 1. No index on organizer
// 2. Collection membership test (:email MEMBER OF) is slow
// 3. NOT IN clause can't use indexes well

// Optimized version with indices:

// In schema:
// CREATE INDEX idx_meetings_organizer ON meetings(organizer);
// CREATE INDEX idx_participants_email ON meeting_participants(participant);

@Query("SELECT DISTINCT m FROM Meeting m " +
       "LEFT JOIN m.participants p " +
       "WHERE (m.organizer = :email OR p = :email) " +
       "AND m.status NOT IN ('cancelled', 'declined')")
List<Meeting> findBusyMeetingsForUser(@Param("email") String email);

// What changed:
// - Explicit JOIN (optimizer can use index on participant)
// - DISTINCT prevents duplicates (same meeting listed twice if user is both organizer and participant)
// - Avoid collection membership test

// But DISTINCT is slow on large datasets!
// Better:

@Query("SELECT m FROM Meeting m " +
       "WHERE (m.organizer = :email) " +
       "AND m.status NOT IN ('cancelled', 'declined') " +
       "UNION " +
       "SELECT m FROM Meeting m " +
       "LEFT JOIN m.participants p " +
       "WHERE p = :email " +
       "AND m.status NOT IN ('cancelled', 'declined')")
List<Meeting> findBusyMeetingsForUser(@Param("email") String email);

// Or use native SQL:

@Query(value =
  "SELECT DISTINCT m.* FROM meetings m " +
  "LEFT JOIN meeting_participants p ON m.id = p.meeting_id " +
  "WHERE (m.organizer = :email OR p.participant = :email) " +
  "AND m.status NOT IN ('cancelled', 'declined')",
  nativeQuery = true)
List<Meeting> findBusyMeetingsForUser(@Param("email") String email);
```

**Q: How do you validate that the query is fast?**

A:

```
1. Enable query logging:
   spring.jpa.show-sql=true
   spring.jpa.properties.hibernate.format_sql=true
   logging.level.org.hibernate.SQL=DEBUG
   logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

2. Use EXPLAIN in PostgreSQL:
   EXPLAIN ANALYZE
   SELECT DISTINCT m.* FROM meetings m
   LEFT JOIN meeting_participants p ...
   
   Output shows:
   - Seq Scan (bad) vs Index Scan (good)
   - Rows: 100 (actual: 95) - good estimate
   - Time: actual time=5.3ms (acceptable)

3. Run JMH (Java Microbenchmark Harness):
   @Benchmark
   public List<Meeting> findBusy() {
     return findBusyMeetingsForUser("alice@...");
   }
   
   Measures: average latency, throughput
```

---

## SECTION 6: DEPLOYMENT & SCALING (Architecture → Systems Design)

### LEVEL 1: CURRENT SINGLE-SERVER ARCHITECTURE

**Q: How many concurrent users can your system handle?**

A:

```
WebSocket connections per server: ~1,000 (limited by memory)
API requests per second: ~1,000 (thread pool of 100 threads × 10 req/thread)
Database connections: ~10 (default Tomcat pool)
Database queries per second: ~1,000 (if <1ms each)

Bottleneck: Database connections (only 10 total)

If 1000 users each make 1 query → 10 must wait
Most won't, but some will experience latency
```

---

### LEVEL 2: HORIZONTAL SCALING

**Q: How do you scale to 100,000 users?**

A:

```
BEFORE (Single Server):
┌──────────────────────┐
│ Web Server (8080)    │
├──────────────────────┤
│ WebSocket: mem room  │
│ APIs: CRUD           │
│ NLP: extract tasks   │
└──────────────────────┘
        │
        ↓
┌──────────────────────┐
│ PostgreSQL (5432)    │
└──────────────────────┘

AFTER (Scaled):
┌─────────────────────────────────────┐
│ Load Balancer (nginx/HAProxy)       │
└─────────────────────────────────────┘
  │           │           │
  ↓           ↓           ↓
┌──────┐  ┌──────┐  ┌──────┐
│ Web1 │  │ Web2 │  │ Web3 │ (Stateless)
│ 8080 │  │ 8080 │  │ 8080 │
└──────┘  └──────┘  └──────┘
  │           │           │
  └─────┬─────┴─────┬─────┘
        │           │
        ↓           ↓
┌─────────────────┐ ┌──────────────┐
│ Redis Cluster   │ │ PostgreSQL   │
│ (pub/sub)       │ │ Read Replica │
└─────────────────┘ └──────────────┘

CHANGES:

1. WEBSOCKET SCALING
   Old: roomSessions stored in Web1 memory
   Problem: If user on Web1 sends to user on Web2 (different room), can't relay
   
   New: Redis pub/sub
   Web1 publishes: PUBLISH "meeting:123" {"type": "peer-joined", ...}
   Web2, Web3 listen on same channel, deliver to local sessions
   
2. DATABASE SCALING
   Old: Single PostgreSQL connection pool (10 connections)
   Problem: High load → connection pool exhausted
   
   New: Connection pooling (PgBouncer)
   Pooler maintains 100 connections to DB, multiplexes 10,000 app connections
   
3. SESSION SHARING
   Old: meeting state in memory
   Problem: Sticky sessions required (Route Alice's request to Web1 always)
   
   New: Stateless (load balancer can route to any server)
   - WebSocket session = connection to server, room state in Redis
   - API request = no state needed, route to any server
   
4. NLP PROCESSING
   Old: Synchronous, blocks API request
   Problem: Long transcripts → timeout
   
   New: Async with job queue
   - API returns 202 Accepted
   - Job worker processes transcript
   - Frontend polls for results
```

---

### LEVEL 3: ADVANCED SCALING PATTERNS

**Q: How do you handle 1000 transcripts/hour?**

A: Current: Synchronous (synchronous), blocks API thread

```
POST /api/transcript → NLP (2 sec) → return response
Thread busy for 2 seconds
App has 100 threads → can handle 50 transcripts/sec max
1000/hour = 0.28/sec ← OK, but risky
```

**Solution: Message Queue (Kafka, RabbitMQ)**

```
        API (stateless)
        ├─ Receive transcript
        ├─ Save to S3/disk
        ├─ Publish to Kafka
        └─ Return 202 Accepted immediately
        
                ↓
        
        Kafka Topic: "transcripts-to-process"
        ├─ Message 1: {meetingId: "123", location: "s3://..."}
        ├─ Message 2: {meetingId: "456", location: "s3://..."}
        └─ Message 3: {meetingId: "789", location: "s3://..."}
        
                ↓ (consumed by)
        
        NLP Worker Pool (10 workers, can scale independently)
        ├─ Worker 1: Processing transcript 123 (2 sec)
        ├─ Worker 2: Processing transcript 456 (2 sec)
        ├─ Worker 3: Processing transcript 789 (2 sec)
        └─ Worker 4: Idle
        
        Can process 5 transcripts/sec (10 workers × 2 sec each)
        Easily handles 1000/hour
```

```java
// Frontend code (unchanged)
@PostMapping("/api/transcript")
public ResponseEntity<Map<String, Object>> submitTranscript(
    @RequestBody Map<String, String> payload) {
  
  String meetingId = payload.get("meetingId");
  String transcript = payload.get("transcript");
  
  // Save to database with status = "processing"
  Note note = new Note();
  note.setMeetingId(meetingId);
  note.setFullTranscript(transcript);
  note.setStatus("processing");
  noteRepository.save(note);
  
  // Publish to Kafka (non-blocking)
  kafkaTemplate.send("transcripts-to-process", 
    new TranscriptMessage(meetingId, transcript));
  
  // Return immediately
  return ResponseEntity.status(HttpStatus.ACCEPTED)
    .body(Map.of("status", "processing", 
                 "message", "Transcript queued for processing"));
}

// Worker code (separate process)
@Service
public class TranscriptWorker {
  
  @KafkaListener(topics = "transcripts-to-process")
  public void processTranscript(TranscriptMessage message) {
    String meetingId = message.getMeetingId();
    String transcript = message.getTranscript();
    
    // 1. Extract tasks (2 sec)
    List<MeetingTask> tasks = nlpService.extractTasks(
      transcript, meetingId, "Meeting");
    meetingTaskRepository.saveAll(tasks);
    
    // 2. Generate summary (1 sec)
    String summary = nlpService.generateSummary(transcript);
    
    // 3. Update note
    Note note = noteRepository.findByMeetingId(meetingId).get();
    note.setStatus("completed");
    note.setSummary(summary);
    noteRepository.save(note);
    
    // 4. Publish notification
    eventPublisher.publishEvent(
      new TranscriptCompletedEvent(meetingId));
  }
}
```

---

## COMMON INTERVIEW TRAPS

**Trap 1: "Your WebSocket broadcasts to sender too"**

```
Your code:
private void broadcastToRoom(...) {
  if (!s.getId().equals(sender.getId())) {
    s.sendMessage(...)
  }
}

Interviewer: "What if you miss this check?"
You: "Echo loop - message bounces back, infinite loop"

```

**Trap 2: "What if `roomSessions.get()` returns null?"**

```
Your code:
CopyOnWriteArrayList<WebSocketSession> sessions = 
  roomSessions.get(meetingId);

if (sessions != null) { ... }

Interviewer: "Good, you check. But what if the room is deleted
between the two lines?"

You: "Race condition - ultra rare, would ignore in production.
For safety: use computeIfAbsent"
```

**Trap 3: "The SDP negotiation can fail. How do you recover?"**

```
You: "...I haven't implemented recovery"

Interviewer: "How would you?"

You: "1. Detect connection failure via connectionStateChange
     2. Restart ICE gathering
     3. Send new offer
     Or fallback to mesh (everyone relay through server)"
```

**Trap 4: "Your regex will fail on..."**

```
Interviewer: "What if the task ends mid-sentence?
             'we need to review budget because...'"

Your pattern: ([^.!?]{5,})
Would match: "review budget because"

You: "Good point. I should either:
     1. Use NLP sentence tokenizer
     2. Limit to 80 characters (I do this)
     3. Use AI extraction (which I fallback to)"
```

---

## AREAS WHERE YOU SHOULD SAY "I DON'T KNOW"

- ICE gathering timeout tuning
- WebRTC simulcast encoding profiles
- PostgreSQL query planner internals
- Exact memory overhead of CopyOnWriteArrayList
- TURN protocol (STUN yes, TURN probably not)
- LLM token counting (would guess 50-60%)
- Network packet scheduling

**Say: "I haven't worked with that specifically, but I'd look at [reference docs]"**

