# FaceGate
Este projeto consiste em um sistema inteligente de registro de ponto automático, utilizando reconhecimento facial, integrado a uma API REST em .NET e um banco de dados relacional.

A proposta é eliminar o registro manual de ponto, permitindo que o colaborador tenha sua presença registrada automaticamente ao ser identificado pela câmera.


Ferramentas Utilizadas

Hardware
ESP32-CAM
Câmera

Processamento
Python

Backend
API REST em C# (.NET)

Comunicação
HTTP (POST / GET)
JSON
JPEG binário ou WebSocket (ESP32 → Python)

Banco de Dados
MySQL ou Firebase

Envio do Vetor (Python → API) [Apenas Demonstração]
{
  "idDispositivo": "ESP32-01",
  "timestamp": "2026-02-11T14:32:00Z",
  "vetorFacial": [0.1234, -0.3345, 0.9987, ...],
  "dimensao": 128
}

Resposta da API [Apenas Demonstração]
{
  "match": true,
  "pessoaIdentificada": "Lucas Zurano",
  "confidence": 0.94,
  "horarioRegistro": "2026-02-11T14:32:01Z"
}

| Etapa          | Formato                    |
| -------------- | -------------------------- |
| ESP32 → Python | JPEG binário ou WebSocket  |
| Vetor Facial   | Array de 128 ou 512 floats |
| Python → API   | JSON                       |
| API → Banco    | Float array ou Vector Type |
| Resposta API   | JSON                       |

Banco de dados 
MySQL ou FireBase

Tecnologia / Linguagem da API
Linguagem: C#
Framework: .NET (ASP.NET Core)
Arquitetura: API REST
Comunicação via HTTP/HTTPS
Retorno em JSON

Plataforma de prototipagem
Wokwi



Link do Ltdraw
https://www.tldraw.com/f/5MTe037B0xwBQhASzPcA_?d=v-809.-237.3471.1976.page
