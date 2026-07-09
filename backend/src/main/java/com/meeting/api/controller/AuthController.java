package com.meeting.api.controller;

import com.meeting.api.model.User;
import com.meeting.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent() && userOpt.get().getPassword().equals(password)) {
            User user = userOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("token", "dummy-jwt-token-for-" + user.getId());
            
            Map<String, String> userMap = new HashMap<>();
            userMap.put("name", user.getName());
            userMap.put("email", user.getEmail());
            
            response.put("user", userMap);
            
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User newUser) {
        if (newUser.getEmail() == null || newUser.getPassword() == null) {
            return ResponseEntity.badRequest().body("Email and password are required");
        }

        if (userRepository.findByEmail(newUser.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already registered");
        }

        User savedUser = userRepository.save(newUser);

        Map<String, Object> response = new HashMap<>();
        response.put("token", "dummy-jwt-token-for-" + savedUser.getId());
        
        Map<String, String> userMap = new HashMap<>();
        userMap.put("name", savedUser.getName());
        userMap.put("email", savedUser.getEmail());
        
        
        response.put("user", userMap);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/check")
    public ResponseEntity<?> checkUser(@RequestParam String email) {
        boolean exists = userRepository.findByEmail(email).isPresent();
        Map<String, Boolean> response = new HashMap<>();
        response.put("exists", exists);
        return ResponseEntity.ok(response);
    }
}
