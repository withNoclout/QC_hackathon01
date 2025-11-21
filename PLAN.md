# Project Plan: Quality Control System (QC Hackathon)

## Overview
A real-time quality control system using a webcam to inspect products. Originally designed with a Python backend for processing, we have currently pivoted to a **Client-Side AI Proof of Concept** to validate logic while waiting for hardware.

## User Intent & Goals
- **Primary Goal**: Create a validation system to check if a product shown to the webcam is "well done" or a "good product".
- **Method**: Use a "Golden Sample" approach where a reference image is captured, and subsequent products are compared against it for similarity.
- **Features**: Live feed, status indicator (PASS/FAIL), counter, reset button, history log, and session management (5-minute timeout).

## Architecture
- **Frontend**: React (Vite) + Tailwind CSS.
- **AI/CV (Current POC)**: TensorFlow.js (Client-side) + COCO-SSD for object detection + Pixel-based Similarity Comparison.
- **Backend (Planned)**: Python (FastAPI) - Will handle heavy lifting, database, and hardware communication later.
- **Database**: SQLite - Storing inspection logs.
- **Hardware**: Arduino UNO R3 - Receiving Pass/Fail signals via Serial (Pending).

## Roadmap & Progress

### Phase 1: Project Initialization
- [x] Create project structure (`client` and `server` folders).
- [x] Set up Python virtual environment and install dependencies.
- [x] Set up React project using Vite.
- [x] Initialize Git repository and push to GitHub (`main` and `dev` branches).

### Phase 2: Backend Development (Python/FastAPI)
- [x] **Core Server**: Initialize FastAPI app.
- [x] **Database**: Setup SQLite schema (`inspections` table).
- [x] **Arduino Service**: Created class for Serial communication.
- [ ] **CV Service**: Implement OpenCV video capture loop (Paused for Frontend POC).
- [ ] **AI Integration**: Load YOLO model (Paused for Frontend POC).
- [ ] **API Endpoints**: `GET /video_feed`, `GET /history`, etc.

### Phase 3: Frontend Development (React)
- [x] **Layout**: Main dashboard layout with Sidebar.
- [x] **Authentication**: Login page with 5-minute session timeout.
- [x] **Video Component**: 
    - Initially planned for MJPEG stream.
    - **Implemented**: Direct Webcam access via `getUserMedia`.
- [x] **AI Integration (POC)**:
    - Integrated `TensorFlow.js` and `COCO-SSD`.
    - Implemented "Golden Sample" validation (Reference Image Capture).
    - Visual feedback: Green Box (Pass) / Red Box (Fail) based on similarity.
- [x] **Hardware Integration (Camera)**:
    - Configured ESP32-CAM with custom firmware (CORS enabled, MJPEG stream).
    - Integrated IP Camera stream into Dashboard.
    - **Optimized Performance**: Reduced latency (buffer count 1) and improved framerate (QVGA resolution).

### Phase 4: Integration & Testing
- [x] **Client-Side POC**: Verify webcam access and object detection in browser.
- [x] **ESP32-CAM Integration**: Stream video from ESP32 to React Dashboard.
- [ ] **Arduino Integration**: Connect Arduino UNO for physical signals (Pass/Fail LEDs).
- [ ] **Full Loop Migration**: Move logic from Client (JS) to Server (Python) once hardware arrives.

## Session Log
- **2025-11-21**:
    - Created custom firmware for ESP32-CAM to support CORS and MJPEG streaming.
    - Updated Dashboard to support switching between Webcam and IP Camera.
    - Validated ESP32-CAM integration.
    - **Performance Tuning**:
        - Reduced ESP32-CAM buffer to 1 to fix 3-second latency.
        - Lowered resolution to QVGA for higher FPS.
        - Throttled Client-side AI to 10 FPS to prevent CPU starvation.
        - Added "Enable AI" toggle to allow raw stream viewing.
        - Added "Loading Circle" animation for stream interruptions.
- **2025-11-20**: 
    - Pivoted to Frontend-first approach due to missing hardware.
    - Implemented Login/Auth with session timeout.
    - Built Dashboard with TensorFlow.js for client-side object detection.
    - Added "Golden Sample" feature: User captures a reference image, and the system compares new objects to it to determine PASS/FAIL status.
    - Pushed code to `dev` branch.
