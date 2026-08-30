package com.meeting.api.controller;

import com.meeting.api.model.User;
import com.meeting.api.service.AuthService;
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
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        Optional<Map<String, Object>> responseOpt = authService.login(email, password);

        if (responseOpt.isPresent()) {
            return ResponseEntity.ok(responseOpt.get());
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User newUser) {
        if (newUser.getEmail() == null || newUser.getPassword() == null) {
            return ResponseEntity.badRequest().body("Email and password are required");
        }

        if (authService.checkUserExists(newUser.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already registered");
        }

        User savedUser = authService.register(newUser);
        Map<String, Object> response = authService.buildAuthResponse(savedUser);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/check")
    public ResponseEntity<?> checkUser(@RequestParam String email) {
        boolean exists = authService.checkUserExists(email);
        Map<String, Boolean> response = new HashMap<>();
        response.put("exists", exists);
        return ResponseEntity.ok(response);
    }
}
