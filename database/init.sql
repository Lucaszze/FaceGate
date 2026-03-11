-- Initialize database schema for ESP32 sensor data

CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  timestamp BIGINT NOT NULL,
  movimento BOOLEAN,
  distancia INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
