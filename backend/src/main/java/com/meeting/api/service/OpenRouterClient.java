package com.meeting.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class OpenRouterClient {

    @Value("${openrouter.api.key:}")
    private String openRouterApiKey;
    
    private final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
    private final WebClient webClient = WebClient.builder().build();

    public String callApi(String prompt) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "google/gemini-2.5-flash");
            
            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            
            requestBody.put("messages", Collections.singletonList(message));

            Map response = webClient.post()
                    .uri(OPENROUTER_URL)
                    .header("Authorization", "Bearer " + openRouterApiKey)
                    .header("HTTP-Referer", "http://localhost:8080")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(); // Blocking here is safe because it runs inside a dedicated CompletableFuture thread

            if (response != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
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
}
