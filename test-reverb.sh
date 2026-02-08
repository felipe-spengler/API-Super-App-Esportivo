#!/bin/bash

# Script de teste para verificar a configuração do Reverb

echo "🔍 Testando Configuração do Reverb WebSocket"
echo "=============================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se o container do Reverb está rodando
echo "1️⃣ Verificando se o container Reverb está rodando..."
if docker ps | grep -q "reverb"; then
    echo -e "${GREEN}✅ Container Reverb está rodando${NC}"
else
    echo -e "${RED}❌ Container Reverb NÃO está rodando${NC}"
    echo "   Execute: docker-compose up -d reverb"
    exit 1
fi
echo ""

# 2. Verificar logs do Reverb
echo "2️⃣ Últimas 20 linhas dos logs do Reverb:"
echo "----------------------------------------"
docker-compose logs reverb --tail 20
echo ""

# 3. Verificar se a porta 9090 está exposta
echo "3️⃣ Verificando porta 9090 do Reverb..."
if docker ps | grep reverb | grep -q "9090"; then
    echo -e "${GREEN}✅ Porta 9090 está exposta${NC}"
else
    echo -e "${YELLOW}⚠️ Porta 9090 pode não estar exposta corretamente${NC}"
fi
echo ""

# 4. Verificar variáveis de ambiente
echo "4️⃣ Verificando variáveis de ambiente do Reverb:"
echo "------------------------------------------------"
docker-compose exec -T reverb env | grep REVERB
echo ""

# 5. Testar conexão WebSocket (se wscat estiver instalado)
echo "5️⃣ Testando conexão WebSocket..."
if command -v wscat &> /dev/null; then
    echo "   Tentando conectar via wscat..."
    timeout 5 wscat -c "wss://esportivo.techinteligente.site/app/appesportivo2026" || echo -e "${YELLOW}⚠️ Timeout ou erro na conexão${NC}"
else
    echo -e "${YELLOW}⚠️ wscat não instalado. Instale com: npm install -g wscat${NC}"
fi
echo ""

# 6. Verificar configuração do Traefik
echo "6️⃣ Verificando labels do Traefik no container Reverb:"
echo "------------------------------------------------------"
docker inspect $(docker ps -q -f name=reverb) | grep -A 20 "Labels"
echo ""

echo "=============================================="
echo "✅ Teste concluído!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Verifique os logs acima para erros"
echo "   2. Acesse o frontend e abra o DevTools → Console"
echo "   3. Procure por mensagens de conexão WebSocket"
echo "   4. Abra DevTools → Network → WS para ver conexões WebSocket"
echo ""
