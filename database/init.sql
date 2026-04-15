-- Initialize database schema for ESP32 sensor data

CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  timestamp BIGINT NOT NULL,
  movimento BOOLEAN,
  distancia INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS face_embeddings (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100),
  timestamp BIGINT,
  embedding FLOAT8[],
  image_path VARCHAR(500),
  storage_type VARCHAR(50) DEFAULT 'local',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);