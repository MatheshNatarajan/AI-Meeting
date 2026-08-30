package com.meeting.api.service;

import com.meeting.api.model.User;
import com.meeting.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    public Optional<Map<String, Object>> login(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent() && userOpt.get().getPassword().equals(hashPassword(password))) {
            User user = userOpt.get();
            return Optional.of(buildAuthResponse(user));
        }
        return Optional.empty();
    }

    public User register(User newUser) {
        newUser.setPassword(hashPassword(newUser.getPassword()));
        return userRepository.save(newUser);
    }

    public boolean checkUserExists(String email) {
        return userRepository.findByEmail(email).isPresent();
    }
    
    public Map<String, Object> buildAuthResponse(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("token", "dummy-jwt-token-for-" + user.getId());
        
        Map<String, String> userMap = new HashMap<>();
        userMap.put("name", user.getName());
        userMap.put("email", user.getEmail());
        
        response.put("user", userMap);
        return response;
    }

    private String hashPassword(String password) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.Base64.getEncoder().encodeToString(digest.digest(password.getBytes()));
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }
}
