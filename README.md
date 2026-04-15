# FaceGate — ESP32 + MQTT + PostgreSQL

> **Sistema IoT** que recebe dados de sensores **ESP32** (PIR + VL53L0X) via **MQTT (Mosquitto)**, persiste em **PostgreSQL** e exibe em um dashboard web em tempo real.

---

## 🚀 O que está implementado

### ✅ Broker MQTT (Eclipse Mosquitto)
- Recebe mensagens dos dispositivos ESP32 via protocolo MQTT
- Listener MQTT na porta **1883**
- Listener WebSocket na porta **9001**
- Modo atual: **sem autenticação** (desenvolvimento)

### ✅ API Node.js (Express + MQTT Subscriber)
- **Subscriber MQTT** que escuta o tópico `facegate/+/sensors` (QoS 1)
- Ao receber mensagem, parseia o JSON e insere no PostgreSQL
- Endpoints HTTP mantidos para consulta:
  - `GET /readings` — últimas 50 leituras
  - `GET /mqtt-info` — informações do broker e formato de payload
  - `POST /face` — registrar embedding facial
  - `GET /face-list` — listar embeddings
- Documentação Swagger em **/api-docs**

### ✅ Banco de dados PostgreSQL
- Tabelas `sensor_data` e `face_embeddings` criadas automaticamente
- Persistência em volume Docker

### ✅ pgAdmin 4
- Interface web para gerenciar o banco
- Conexão configurada automaticamente

### ✅ Dashboard Web
- Monitoramento em tempo real com polling a cada 3s
- Cards com última distância, status de movimento e dispositivo

---

## 🧱 Estrutura do Projeto

```
project-root/
├─ docker-compose.yml
├─ face_capture.py
├─ requirements.txt
├─ api/
│  ├─ Dockerfile
│  ├─ index.js            ← API + MQTT subscriber
│  ├─ package.json
│  └─ public/
│     └─ dashboard.html
├─ database/
│  ├─ init.sql
│  └─ pgadmin-servers.json
└─ mosquitto/
   └─ mosquitto.conf      ← Configuração do broker
```

---

## 🐳 Executando o projeto

```bash
docker compose up --build
```

Aguarde os serviços subirem. A API aguarda o PostgreSQL e conecta ao Mosquitto automaticamente.

---

## 📡 Arquitetura MQTT

```
ESP32 (PIR + VL53L0X)
    │
    │  MQTT publish (QoS 1)
    │  Tópico: facegate/{device_id}/sensors
    ▼
┌──────────────┐
│  Mosquitto   │ ← Broker MQTT (porta 1883)
│  Broker      │
└──────┬───────┘
       │  MQTT subscribe
       │  Tópico: facegate/+/sensors
       ▼
┌──────────────┐       ┌──────────────┐
│  API Node.js │──────▶│  PostgreSQL  │
│  (Express)   │ INSERT│  (esp32db)   │
└──────────────┘       └──────────────┘
       │
       │  GET /readings
       ▼
┌──────────────┐
│  Dashboard   │
│  (browser)   │
└──────────────┘
```

---

## 🔌 Endpoints e Serviços

| Serviço         | URL                              |
|-----------------|----------------------------------|
| Health check    | `GET http://localhost:8080/`      |
| MQTT info       | `GET http://localhost:8080/mqtt-info` |
| Leituras        | `GET http://localhost:8080/readings` |
| Swagger docs    | `http://localhost:8080/api-docs`  |
| Dashboard       | `http://localhost:8080/dashboard.html` |
| pgAdmin         | `http://localhost:5050`           |
| Broker MQTT     | `mqtt://localhost:1883`           |

---

## 🦟 Configuração MQTT

### Tópico para sensores
```
facegate/{device_id}/sensors
```

Exemplo: `facegate/esp32-wokwi/sensors`

### Payload JSON (QoS 1)
```json
{
  "device_id": "esp32-wokwi",
  "timestamp": 12345678,
  "movimento": true,
  "distancia": 250
}
```

### Publicar mensagem de teste (via terminal)
```bash
docker exec -it <container_mosquitto> mosquitto_pub \
  -t "facegate/esp32-test/sensors" \
  -m '{"device_id":"esp32-test","timestamp":999,"movimento":true,"distancia":150}' \
  -q 1
```

---

## 🗄️ Banco de dados (PostgreSQL)

### Configuração
- `POSTGRES_USER=admin`
- `POSTGRES_PASSWORD=admin123`
- `POSTGRES_DB=esp32db`

### Tabela `sensor_data`
| Coluna       | Tipo                              |
|--------------|-----------------------------------|
| id           | SERIAL PRIMARY KEY                |
| device_id    | VARCHAR(100)                      |
| timestamp    | BIGINT                            |
| movimento    | BOOLEAN                           |
| distancia    | INTEGER                           |
| created_at   | TIMESTAMP DEFAULT CURRENT_TIMESTAMP |

### Tabela `face_embeddings`
| Coluna       | Tipo                              |
|--------------|-----------------------------------|
| id           | SERIAL PRIMARY KEY                |
| device_id    | VARCHAR(100)                      |
| timestamp    | BIGINT                            |
| embedding    | FLOAT8[]                          |
| image_path   | VARCHAR(500)                      |
| storage_type | VARCHAR(50) DEFAULT 'local'       |
| created_at   | TIMESTAMP DEFAULT CURRENT_TIMESTAMP |

---

## 🔎 Acessando o pgAdmin

- **URL:** `http://localhost:5050`
- **Email:** `admin@admin.com`
- **Senha:** `admin123`

O servidor PostgreSQL já estará pré-configurado como "Postgres" no pgAdmin.

---

## 🔐 Como adicionar autenticação no Mosquitto

Quando estiver pronto para produção, siga estes passos para proteger o broker:

### 1. Criar o arquivo de senhas

Execute o comando abaixo para criar um usuário (substitua `esp32user` e `senhaForte123`):

```bash
# Entrar no container do Mosquitto
docker exec -it <container_mosquitto> sh

# Criar arquivo de senhas com o primeiro usuário
mosquitto_passwd -c /mosquitto/config/password.txt esp32user
# Digite a senha quando solicitado

# Para adicionar mais usuários (sem o -c, que sobrescreve):
mosquitto_passwd /mosquitto/config/password.txt outro_usuario
```

### 2. Atualizar `mosquitto/mosquitto.conf`

Altere as seguintes linhas:

```conf
# Desabilitar conexões anônimas
allow_anonymous false

# Apontar para o arquivo de senhas
password_file /mosquitto/config/password.txt
```

### 3. Montar o arquivo de senhas no Docker

Adicione o volume no `docker-compose.yml`, dentro do serviço `mosquitto`:

```yaml
volumes:
  - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
  - ./mosquitto/password.txt:/mosquitto/config/password.txt:ro   # ← adicionar
  - mosquitto_data:/mosquitto/data
  - mosquitto_log:/mosquitto/log
```

### 4. Configurar credenciais na API

Adicione as variáveis no serviço `api` do `docker-compose.yml`:

```yaml
environment:
  MQTT_BROKER_URL: mqtt://esp32user:senhaForte123@mosquitto:1883
```

Ou, alternativamente, use variáveis separadas e ajuste o `index.js`:

```yaml
environment:
  MQTT_USERNAME: esp32user
  MQTT_PASSWORD: senhaForte123
```

### 5. Reiniciar todos os serviços

```bash
docker compose down
docker compose up --build
```

### 6. Atualizar o ESP32

No código do ESP32, configure as credenciais do MQTT:

```cpp
// Arduino / PlatformIO
mqttClient.setCredentials("esp32user", "senhaForte123");
```

---

## 🧠 Face Capture (Python)

Script para registro e verificação facial via câmera:

```bash
python face_capture.py register   # Registra a foto no banco de dados
python face_capture.py verify     # Verifica a foto no banco de dados
```

Dependências Python: `opencv-python`, `requests`, `deepface`, `scipy`