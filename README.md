# MeetSync 🎙️✨

MeetSync is an AI-powered meeting platform that automatically generates intelligent summaries, extracts actionable tasks, and provides a collaborative space for teams to track accountability.

## 🚀 Features

- **AI Note Generation**: Automatically transcribes and summarizes meetings using advanced NLP models (via OpenRouter).
- **Intelligent Task Extraction**: Pulls actionable items directly from spoken transcripts.
- **Collaborative Checklists**: Shared meeting tasks where any participant can check off an item. Features a strict audit trail (`completed_by`) to ensure accountability without hallucinated assignments.
- **Strictly Normalized Architecture**: A highly optimized PostgreSQL database designed for scale.

## 🏗️ Architecture

MeetSync is built with a modern full-stack architecture:

### Frontend
- **React.js** (Vite) for lightning-fast UI rendering.
- **TailwindCSS** for beautiful, responsive styling and glassmorphic aesthetics.
- **Lucide Icons** for clean vector graphics.

### Backend
- **Java Spring Boot**: Robust API backend.
- **Hibernate / JPA**: Strict ORM layer enforcing a fully normalized relational database design.
- **PostgreSQL**: Production-ready relational database.

### Database Design (3rd Normal Form)
The schema balances strict relational integrity with read-optimized denormalization:
1. **Core Entities**: `users` and `meetings` linked via a many-to-many `meeting_participants` bridge table.
2. **AI Processing**: Heavy text blobs are offloaded into a 1-to-1 `notes` table, with 1-to-Many helper tables (`note_key_points`, `note_action_items`) to strictly enforce 1st Normal Form (no arrays in cells).
3. **Collaborative Tasks**: The `meeting_tasks` table is optimized for quick dashboard reads (denormalized `meeting_title`) while solving AI hallucination by tracking manual human completion (`completed_by`).

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Java 17+
- PostgreSQL
- Maven
- OpenRouter API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
