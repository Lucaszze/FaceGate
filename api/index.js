const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path'); // ← adicionado

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // ← adicionado

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

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Device Sensor API',
    version: '1.1.0',
    description: 'Recebe dados de PIR e sensor de distância VL53L0X do ESP32'
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
                  properties: { message: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    },
    '/data': {
      post: {
        summary: 'Recebe dados do ESP32 (PIR + VL53L0X)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  device_id:  { type: 'string' },
                  timestamp:  { type: 'number' },
                  movimento:  { type: 'boolean' },
                  distancia:  { type: 'number', description: 'Distância em mm' }
                },
                required: ['device_id', 'timestamp']
              },
              example: {
                device_id: 'esp32-wokwi',
                timestamp: 12345678,
                movimento: true,
                distancia: 250
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Dados recebidos com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    },
    '/readings': { // ← adicionado no swagger
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
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.post('/data', async (req, res) => {
  const payload = req.body;
  console.log('📦 Payload recebido:', payload);

  if (!payload.device_id || payload.timestamp === undefined) {
    return res.status(400).json({ status: 'error', message: 'device_id e timestamp são obrigatórios' });
  }

  try {
    await pool.query(
      `INSERT INTO sensor_data (device_id, timestamp, movimento, distancia)
       VALUES ($1, $2, $3, $4)`,
      [payload.device_id, payload.timestamp, payload.movimento, payload.distancia]
    );

    if (payload.movimento && payload.distancia < 300) {
      console.log(`⚠ ALERTA: Objeto muito próximo! Distância: ${payload.distancia}mm`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Erro ao inserir dados:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao gravar dados' });
  }
});

// ← adicionado: rota consumida pelo dashboard
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

(async function start() {
  try {
    await waitForPostgres();
    await initDb();

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      console.log(`Dashboard: http://localhost:${port}/dashboard.html`);
      console.log(`Swagger docs: http://localhost:${port}/api-docs`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
})();
