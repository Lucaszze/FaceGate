# FaceGate (Dockerized ESP32 Sensor Backend)

> **Nota:** Este workspace agora inclui um backend Node.js + PostgreSQL (Docker) para receber dados de sensores ESP32 (PIR + VL53L0X) via HTTP e armazená-los em um banco relacional.

---

## 🚀 O que está implementado

### ✅ API Node.js (Express)
- Recebe dados via **POST /data**
- Valida `device_id` + `timestamp`
- Armazena em **PostgreSQL** usando `pg`
- Documentação Swagger em **/api-docs**

### ✅ Banco de dados PostgreSQL
- Tabela `sensor_data` criada automaticamente (via `init.sql` e script de inicialização)
- Persistência em volume Docker

### ✅ pgAdmin 4
- Interface web para gerenciar o banco
- Conexão configurada automaticamente para o serviço PostgreSQL

---

## 🧱 Estrutura do Projeto

```
project-root/
├─ docker-compose.yml
├─ index.js
├─ package.json
├─ package-lock.json
├─ api/
│  └─ Dockerfile
└─ database/
   ├─ init.sql
   └─ pgadmin-servers.json
```

---

## 🐳 Executando o projeto

```bash
docker compose up --build
```

Aguarde os serviços subirem; o API aguarda o PostgreSQL ficar disponível antes de iniciar.

---

## 🔌 Endpoints principais

- **Health check:** `GET http://localhost:3000/`
- **Receber dados:** `POST http://localhost:3000/data`
- **Swagger docs:** `http://localhost:3000/api-docs`
- **pgAdmin:** `http://localhost:5050`

---

## 🗄️ Banco de dados (PostgreSQL)

### Configuração do banco (via `docker-compose.yml`)

- `POSTGRES_USER=admin`
- `POSTGRES_PASSWORD=admin123`
- `POSTGRES_DB=esp32db`

### Estrutura da tabela `sensor_data` (criadas em `database/init.sql`)

- `id SERIAL PRIMARY KEY`
- `device_id VARCHAR(100)`
- `timestamp BIGINT`
- `movimento BOOLEAN`
- `distancia INTEGER`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

---

## 🔧 Variáveis de ambiente da API

Configuradas no `docker-compose.yml`:

- `DB_HOST=postgres`
- `DB_PORT=5432`
- `DB_USER=admin`
- `DB_PASSWORD=admin123`
- `DB_NAME=esp32db`

---

## 🧪 Exemplo de payload (ESP32)

```json
{
  "device_id": "esp32-wokwi",
  "timestamp": 12345678,
  "movimento": true,
  "distancia": 250
}
```

---

## 🔎 Acessando o pgAdmin

- **URL:** `http://localhost:5050`
- **Email:** `admin@admin.com`
- **Senha:** `admin123`

O servidor PostgreSQL já estará pré-configurado como "Postgres" no pgAdmin via `database/pgadmin-servers.json`.

---

## 🧠 Nota (legado)

Este repositório originalmente continha uma ideia de sistema FaceGate com reconhecimento facial. O foco atual é a API Node.js + PostgreSQL para consumo de dados de sensores ESP32.
