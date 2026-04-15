import cv2
import time
import requests
import sys
import json
import os
from datetime import datetime
from deepface import DeepFace
from scipy.spatial.distance import cosine

API_URL = "http://localhost:8080"
DEVICE_ID = "facegate-cam01"

# Configuração de pasta para salvar as imagens
CAPTURES_DIR = os.path.join(os.path.expanduser("~"), "Pictures", "FaceGate")
if not os.path.exists(CAPTURES_DIR):
    os.makedirs(CAPTURES_DIR)
    print(f"📁 Pasta criada: {CAPTURES_DIR}")

def capture_and_get_embedding():
    """Captura uma foto da câmera e retorna o embedding."""
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        print("Erro ao capturar frame da câmera")
        return None, None

    # Salva a imagem com timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"face_{timestamp}.jpg"
    filepath = os.path.join(CAPTURES_DIR, filename)
    
    cv2.imwrite(filepath, frame)
    print(f"📸 Imagem salva: {filepath}")

    try:
        embedding = DeepFace.represent(
            img_path=filepath,
            model_name="Facenet",
            enforce_detection=False
        )
        return embedding[0]["embedding"], filepath
    except Exception as err:
        print(f"Erro ao gerar embedding: {err}")
        return None, filepath


def register_face():
    """Registra um novo rosto no banco de dados."""
    print("📸 Registrando novo rosto...")
    vetor, filepath = capture_and_get_embedding()

    if vetor is None:
        print("Falha ao capturar embedding")
        return

    payload = {
        "device_id": DEVICE_ID,
        "timestamp": int(time.time()),
        "embedding": vetor,
        "image_path": filepath,
        "storage_type": "local"
    }

    try:
        response = requests.post(f"{API_URL}/face", json=payload)
        if response.status_code == 200:
            print("✅ Rosto registrado com sucesso!")
            print(f"   Embedding: {len(vetor)} dimensões")
            print(f"   Arquivo: {filepath}")
        else:
            print(f"❌ Erro ao registrar: {response.status_code}")
    except Exception as err:
        print(f"❌ Erro ao enviar para API: {err}")


def verify_face():
    """Verifica se o rosto atual corresponde ao registrado."""
    print("🔍 Verificando rosto...")

    # Captura o embedding atual
    vetor_atual, filepath_atual = capture_and_get_embedding()
    if vetor_atual is None:
        print("Falha ao capturar embedding atual")
        return

    # Busca todos os embeddings do banco
    try:
        response = requests.get(f"{API_URL}/face-list")
        if response.status_code != 200:
            print(f"❌ Erro ao buscar embeddings do banco: {response.status_code}")
            return

        data = response.json()
        if not data or len(data) == 0:
            print("❌ Nenhum rosto registrado no banco")
            return

        # Compara com o último embedding registrado
        ultimo = data[0]  # Mais recente
        vetor_banco = ultimo.get("embedding")

        if vetor_banco is None:
            print("❌ Embedding não encontrado no banco")
            return

        if len(vetor_atual) != len(vetor_banco):
            print(
                f"❌ Dimensões incompatíveis: "
                f"vetor_atual={len(vetor_atual)}, vetor_banco={len(vetor_banco)}"
            )
            return

        # Calcula similaridade
        similaridade = 1 - cosine(vetor_atual, vetor_banco)
        print(f"🎯 Similaridade: {similaridade:.4f}")
        print(f"📸 Imagem capturada: {filepath_atual}")

        if similaridade > 0.5:
            print("✅ ACESSO CONCEDIDO - Mesmo rosto detectado!")
        else:
            print("❌ ACESSO NEGADO - Rosto não corresponde")

    except Exception as err:
        print(f"❌ Erro ao verificar: {err}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python face_capture.py <register|verify>")
        print("  register - Registra um novo rosto")
        print("  verify   - Verifica se o rosto corresponde ao registrado")
        sys.exit(1)

    mode = sys.argv[1].lower()

    if mode == "register":
        register_face()
    elif mode == "verify":
        verify_face()
    else:
        print(f"Modo desconhecido: {mode}")
        print("Use 'register' ou 'verify'")
