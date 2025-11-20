import sqlite3
from datetime import datetime
import os

DB_NAME = "qc_system.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL,
            confidence REAL,
            image_path TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print(f"Database {DB_NAME} initialized.")

def log_inspection(status: str, confidence: float, image_path: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO inspections (timestamp, status, confidence, image_path)
        VALUES (?, ?, ?, ?)
    ''', (timestamp, status, confidence, image_path))
    conn.commit()
    inspection_id = cursor.lastrowid
    conn.close()
    return inspection_id

def get_recent_inspections(limit: int = 10):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM inspections ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
