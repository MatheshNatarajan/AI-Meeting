package com.meeting.api.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    // Map of meetingId -> list of sessions
    private final Map<String, CopyOnWriteArrayList<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("New WebSocket connection: " + session.getId());
        // We wait for the "join" message to assign to a room
    }

    private void broadcastToRoom(String meetingId, WebSocketSession sender, String message) throws IOException {
        CopyOnWriteArrayList<WebSocketSession> sessions = roomSessions.get(meetingId);
        if (sessions != null) {
            for (WebSocketSession s : sessions) {
                if (s.isOpen() && !s.getId().equals(sender.getId())) {
                    synchronized (s) {
                        s.sendMessage(new TextMessage(message));
                    }
                }
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        Map<String, String> data = objectMapper.readValue(payload, Map.class);
        String type = data.get("type");

        if ("join".equals(type)) {
            String meetingId = data.get("meetingId");
            if (meetingId != null) {
                session.getAttributes().put("meetingId", meetingId);
                roomSessions.computeIfAbsent(meetingId, k -> new CopyOnWriteArrayList<>()).add(session);
                
                // Notify others that someone joined
                broadcastToRoom(meetingId, session, "{\"type\":\"peer-joined\", \"peerId\":\"" + session.getId() + "\"}");
                System.out.println("Peer " + session.getId() + " joined meeting: " + meetingId);
            }
        } else if ("end-meeting".equals(type)) {
            String meetingId = (String) session.getAttributes().get("meetingId");
            if (meetingId != null) {
                System.out.println("Broadcasting end-meeting for room: " + meetingId);
                broadcastToRoom(meetingId, session, payload);
            }
        } else {
            String meetingId = (String) session.getAttributes().get("meetingId");
            if (meetingId != null) {
                broadcastToRoom(meetingId, session, payload);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String meetingId = (String) session.getAttributes().get("meetingId");
        if (meetingId != null && roomSessions.containsKey(meetingId)) {
            roomSessions.get(meetingId).remove(session);
            
            // Notify others that someone left
            broadcastToRoom(meetingId, session, "{\"type\":\"peer-left\", \"peerId\":\"" + session.getId() + "\"}");
            
            if (roomSessions.get(meetingId).isEmpty()) {
                roomSessions.remove(meetingId);
            }
        }
        System.out.println("Session closed for meeting: " + meetingId);
    }

    private String getMeetingIdFromQuery(String query) {
        if (query != null && query.contains("meetingId=")) {
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("meetingId=")) {
                    return param.substring("meetingId=".length());
                }
            }
        }
        return null;
    }
}
