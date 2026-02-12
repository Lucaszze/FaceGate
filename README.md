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
