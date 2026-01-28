#!/bin/sh
set -e

echo "--- Entrypoint Iniciado ---"
echo "Diretório atual: $(pwd)"
ls -la

# Busca dinâmica pelo arquivo artisan (limite 3 níveis)
if [ ! -f "artisan" ]; then
    echo "Artisan não encontrado na raiz. Procurando..."
    FOUND_ARTISAN=$(find . -maxdepth 3 -name artisan | head -n 1)
    
    if [ -n "$FOUND_ARTISAN" ]; then
        TARGET_DIR=$(dirname "$FOUND_ARTISAN")
        echo "Encontrado artisan em: $FOUND_ARTISAN. Entrando em: $TARGET_DIR"
        cd "$TARGET_DIR"
    else
        echo "ERRO CRÍTICO: Arquivo artisan não encontrado! Verifique se os arquivos foram copiados corretamente."
        # Lista recursiva para ajudar no debug
        ls -R
        exit 1
    fi
fi

# Agora estamos na pasta correta
echo "Pasta do projeto: $(pwd)"

# Se o vendor não existir (caso de volume montado sobrepondo), instala
if [ ! -d "vendor" ]; then
    echo "Pasta vendor não encontrada. Instalando dependências..."
    composer install --no-dev --optimize-autoloader
fi

echo "Aguardando banco de dados..."
sleep 10

echo "Rodando migrações..."
php artisan migrate --force

echo "Iniciando servidor..."
php artisan serve --host=0.0.0.0 --port=8000
