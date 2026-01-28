from rembg import remove
from PIL import Image
import os

# Caminhos
input_path = 'corredor.jpg'
output_path = 'corredor_sem_fundo.png'

print(f"Processando: {input_path}...")

try:
    # Abrir imagem
    input_image = Image.open(input_path)
    
    # Remover fundo
    output_image = remove(input_image)
    
    # Salvar
    output_image.save(output_path)
    print(f"Sucesso! Salvo em: {output_path}")

except Exception as e:
    print(f"Erro: {e}")
