const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// enable CORS for all routes so Swagger UI can talk to the API from any origin
app.use(cors());
app.use(bodyParser.json());

// Swagger specification
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Simple Device API',
    version: '1.0.0',
    description: 'API with GET and POST endpoints for device data'
  },
//   servers: [
//     {
//       url: '/'
//     }
//   ],
  paths: {
    '/': {
      get: {
        summary: 'Health check or welcome message',
        responses: {
          '200': {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/data': {
      post: {
        summary: 'Receive device data payload',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  device_id: { type: 'string' },
                  timestamp: { type: 'number' },
                  Temperatura: { type: 'number' },
                  Umidade: { type: 'number' }
                },
                required: ['device_id', 'timestamp', 'Temperatura', 'Umidade']
              },
              example: {
                device_id: 'esp32-01',
                timestamp: 1625151600,
                Temperatura: 24.5,
                Umidade: 60.2
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payload received',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' }
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

app.post('/data', (req, res) => {
  const payload = req.body;
  console.log('Received payload:', payload);
  // You could add validation or storage logic here
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
