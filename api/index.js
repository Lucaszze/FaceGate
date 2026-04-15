const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const { Pool } = require('pg');
const mqtt = require('mqtt');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── PostgreSQL ───────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'esp32db'
});

async function waitForPostgres(maxRetries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Connected to PostgreSQL');
      return;
    } catch (err) {
      console.warn(`Postgres not ready (attempt ${attempt}/${maxRetries}) - retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Unable to connect to PostgreSQL after multiple attempts');
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(100) NOT NULL,
      timestamp BIGINT NOT NULL,
      movimento BOOLEAN,
      distancia INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ─── MQTT Subscriber ──────────────────────────────────────────
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'facegate/+/sensors';

function connectMqtt() {
  const client = mqtt.connect(MQTT_BROKER_URL, {
    reconnectPeriod: 3000,        // reconectar a cada 3s se cair
    connectTimeout: 10000,        // timeout de 10s na conexão
    clientId: `facegate-api-${Date.now()}`
  });

  client.on('connect', () => {
    console.log(`🦟 MQTT conectado ao broker: ${MQTT_BROKER_URL}`);
    client.subscribe(MQTT_TOPIC, { qos: 1 }, (err, granted) => {
      if (err) {
        console.error('❌ Erro ao subscrever tópico MQTT:', err.message);
      } else {
        console.log(`📡 Subscrito no tópico: ${granted.map(g => g.topic).join(', ')} (QoS ${granted[0].qos})`);
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const raw = message.toString();
      const payload = JSON.parse(raw);

      // Extrair device_id do tópico (facegate/<device_id>/sensors) ou do payload
      const topicParts = topic.split('/');
      const deviceId = payload.device_id || topicParts[1] || 'unknown';

      const timestamp = payload.timestamp;
      const movimento = payload.movimento ?? null;
      const distancia = payload.distancia ?? null;

      if (!timestamp) {
        console.warn('⚠️  Mensagem MQTT ignorada — campo "timestamp" ausente:', raw);
        return;
      }

      await pool.query(
        `INSERT INTO sensor_data (device_id, timestamp, movimento, distancia)
         VALUES ($1, $2, $3, $4)`,
        [deviceId, timestamp, movimento, distancia]
      );

      console.log(`📥 Sensor data salvo via MQTT | device=${deviceId} mov=${movimento} dist=${distancia}`);

    } catch (err) {
      console.error('❌ Erro ao processar mensagem MQTT:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT error:', err.message);
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT reconectando...');
  });

  client.on('offline', () => {
    console.warn('⚡ MQTT offline');
  });

  return client;
}

// ─── Swagger ──────────────────────────────────────────────────
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'FaceGate Sensor API',
    version: '2.0.0',
    description: 'API + MQTT subscriber para dados de sensores PIR e VL53L0X do ESP32. Os dados de sensores são recebidos via MQTT (tópico facegate/{device_id}/sensors).'
  },
  paths: {
    '/': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    mqtt_broker: { type: 'string' },
                    mqtt_topic: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/readings': {
      get: {
        summary: 'Retorna as últimas 50 leituras do banco',
        responses: {
          '200': {
            description: 'Lista de leituras',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id:         { type: 'number' },
                      device_id:  { type: 'string' },
                      timestamp:  { type: 'number' },
                      movimento:  { type: 'boolean' },
                      distancia:  { type: 'number' },
                      created_at: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/mqtt-info': {
      get: {
        summary: 'Informações de configuração MQTT',
        description: 'Retorna broker URL, tópico e formato do payload esperado pelo subscriber',
        responses: {
          '200': {
            description: 'Configuração MQTT',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    broker: { type: 'string' },
                    topic: { type: 'string' },
                    qos: { type: 'number' },
                    payload_example: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ─── Routes ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'FaceGate API is running 🚀',
    mqtt_broker: MQTT_BROKER_URL,
    mqtt_topic: MQTT_TOPIC
  });
});

// Endpoint informativo sobre a configuração MQTT
app.get('/mqtt-info', (req, res) => {
  res.json({
    broker: MQTT_BROKER_URL,
    topic: MQTT_TOPIC,
    qos: 1,
    payload_example: {
      device_id: 'esp32-wokwi',
      timestamp: 12345678,
      movimento: true,
      distancia: 250
    },
    note: 'Publique neste formato no tópico facegate/{seu_device_id}/sensors'
  });
});

// Registrar embedding facial (mantido via HTTP)
app.post('/face', async (req, res) => {
  const { device_id, timestamp, embedding, image_path, storage_type } = req.body;

  if (!device_id || !timestamp || !embedding) {
    return res.status(400).json({
      status: 'error',
      message: 'device_id, timestamp e embedding são obrigatórios'
    });
  }

  try {
    await pool.query(
      `INSERT INTO face_embeddings (device_id, timestamp, embedding, image_path, storage_type)
       VALUES ($1,$2,$3,$4,$5)`,
      [device_id, timestamp, embedding, image_path || null, storage_type || 'local']
    );

    console.log("🧠 Vetor facial recebido:", embedding.length);
    res.json({ status: 'ok' });

  } catch (err) {
    console.error("Erro ao salvar embedding:", err);
    res.status(500).json({ status: 'error' });
  }
});

// Listar embeddings faciais (mantido via HTTP)
app.get('/face-list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, device_id, timestamp, embedding, image_path, storage_type, created_at 
       FROM face_embeddings 
       ORDER BY created_at DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar embeddings:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao buscar embeddings' });
  }
});

// Listar leituras de sensores (mantido via HTTP — consumido pelo dashboard)
app.get('/readings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar dados:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao buscar dados' });
  }
});

// ─── Startup ──────────────────────────────────────────────────
(async function start() {
  try {
    await waitForPostgres();
    await initDb();

    // Conectar ao broker MQTT
    connectMqtt();

    app.listen(port, () => {
      console.log(`\n🚀 Server listening on http://localhost:${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}/dashboard.html`);
      console.log(`📖 Swagger docs: http://localhost:${port}/api-docs`);
      console.log(`📡 MQTT info: http://localhost:${port}/mqtt-info`);
      console.log(`🦟 MQTT broker: ${MQTT_BROKER_URL}`);
      console.log(`🎯 MQTT topic: ${MQTT_TOPIC}\n`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();
