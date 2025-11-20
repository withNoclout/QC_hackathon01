# Project Plan: Quality Control System (QC Hackathon)

## Overview
A real-time quality control system using a webcam to inspect products, processing images with OpenCV/YOLO, and communicating results to an Arduino UNO R3.

## Architecture
- **Frontend**: React (Vite) - Real-time dashboard for monitoring.
- **Backend**: Python (FastAPI) - Handles image processing, database, and hardware communication.
- **AI/CV**: OpenCV & YOLO - Product defect detection.
- **Database**: SQLite - Storing inspection logs.
- **Hardware**: Arduino UNO R3 - Receiving Pass/Fail signals via Serial.

## Roadmap

### Phase 1: Project Initialization
- [x] Create project structure (`client` and `server` folders).
- [x] Set up Python virtual environment and install dependencies (`fastapi`, `uvicorn`, `opencv-python`, `ultralytics`, `pyserial`, `sqlite3`).
- [x] Set up React project using Vite.

### Phase 2: Backend Development (Python/FastAPI)
- [x] **Core Server**: Initialize FastAPI app.
- [x] **Database**: Setup SQLite schema (Table: `inspections` - id, timestamp, status, confidence, image_path).
- [ ] **Arduino Service**: Create a class to handle Serial communication (send '1' for Pass, '0' for Fail).
- [ ] **CV Service**: Implement a basic OpenCV video capture loop.
- [ ] **AI Integration**: Load YOLO model and run inference on frames.
- [ ] **Configuration & State**: Manage detection thresholds and session counters.
- [ ] **API Endpoints**:
    - `GET /status`: Current system status.
    - `GET /video_feed`: MJPEG stream of processed video.
    - `GET /history`: Retrieve past inspection records.
    - `GET /stats`: Retrieve session counters (Total, Pass, Fail).
    - `POST /reset`: Reset session counters.
    - `GET /config`: Get current detection threshold.
    - `POST /config`: Update detection threshold.

### Phase 3: Frontend Development (React)
- [ ] **Layout**: Create a main dashboard layout.
- [ ] **Video Component**: Display the MJPEG stream from the backend.
- [ ] **Real-time Stats**: Show current product status (Pass/Fail) and confidence score.
- [ ] **History Log**: Table showing recent inspections from the database.

### Phase 4: Integration & Testing
- [ ] Connect Webcam and verify video stream in React.
- [ ] Connect Arduino and test Serial signals.
- [ ] Run full loop: Camera -> YOLO -> Database -> Arduino -> Frontend Update.
