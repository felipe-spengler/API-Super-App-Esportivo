import sys
from rembg import remove
from PIL import Image
import os

# Uso: python remove_bg.py <input_path> <output_path>

if len(sys.argv) < 3:
    print("Erro: Faltam argumentos. Uso: python remove_bg.py <input> <output>")
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]

try:
    if not os.path.exists(input_path):
        print(f"Erro: Arquivo não encontrado: {input_path}")
        sys.exit(1)

    print(f"Processando: {input_path}...")
    
    # Processamento
    img = Image.open(input_path)
    output = remove(img)
    output.save(output_path)
    
    print(f"Sucesso: {output_path}")

except Exception as e:
    print(f"Erro ao processar: {e}")
    sys.exit(1)
