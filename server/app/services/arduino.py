import serial
import time
import logging

logger = logging.getLogger(__name__)

class ArduinoService:
    def __init__(self, port='/dev/ttyACM0', baudrate=9600, timeout=1):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.connection = None
        self.connect()

    def connect(self):
        try:
            self.connection = serial.Serial(self.port, self.baudrate, timeout=self.timeout)
            time.sleep(2)  # Wait for Arduino to reset
            logger.info(f"Connected to Arduino on {self.port}")
        except serial.SerialException as e:
            logger.error(f"Failed to connect to Arduino: {e}")
            self.connection = None

    def send_status(self, is_pass: bool):
        if not self.connection:
            logger.warning("Arduino not connected. Attempting to reconnect...")
            self.connect()
            if not self.connection:
                return

        try:
            # Protocol: '1' for Pass, '0' for Fail
            command = b'1' if is_pass else b'0'
            self.connection.write(command)
            logger.info(f"Sent to Arduino: {command}")
        except serial.SerialException as e:
            logger.error(f"Error sending data to Arduino: {e}")
            self.connection = None

    def close(self):
        if self.connection and self.connection.is_open:
            self.connection.close()
            logger.info("Arduino connection closed.")

# Singleton instance
arduino_service = ArduinoService()
