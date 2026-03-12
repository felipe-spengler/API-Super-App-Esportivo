# 📄 Especificações do Projeto App Esportivo

Este documento serve como um guia técnico e de arquitetura para a plataforma **App Esportivo**.

## 🏗️ Estrutura do Projeto

O projeto é dividido em duas partes principais:

1.  **Backend (Laravel):** Localizado na raiz do repositório.
2.  **Frontend (React/Vite):** Localizado na pasta `/frontend`.

---

## 🛠️ Requisitos de Instalação

### Backend (Ambiente Local)
-   **PHP 8.2+** (extensões: GD, Fileinfo, MySQL, Redis)
-   **Composer**
-   **MySQL 8.0+**
-   **Python 3.10+** (necessário para os recursos de IA de remoção de fundo)

### Frontend (Ambiente Local)
-   **Node.js 18+**
-   **npm** ou **yarn**

---

## 🚀 Como Executar

### 1. Configurando o Banco de Dados
Crie um banco de dados no MySQL e configure as credenciais no arquivo `.env` do backend:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=app_esportivo
DB_USERNAME=root
DB_PASSWORD=
```

### 2. Rodando o Backend
Abra um terminal na pasta raiz e execute:
```bash
composer install
php artisan migrate         # Executa as migrações do banco
php artisan key:generate    # Gera a chave da aplicação
php artisan serve           # Inicia o servidor em http://localhost:8000
```

### 3. Rodando o Frontend
Em outro terminal, navegue até a pasta `frontend` e execute:
```bash
npm install
npm run dev                 # Inicia o servidor em http://localhost:5173
```
*Certifique-se que o arquivo `frontend/.env` aponta para a URL correta do backend (VITE_API_URL).*

### 4. Configurando a IA de Remoção de Fundo
Para que a IA de remoção de fundo funcione (usada em perfis de jogadores e artes), você deve instalar o `rembg` no seu ambiente Python:
```bash
pip install rembg[gpu,cli]   # Ou apenas rembg se não tiver placa de vídeo
```
O backend chama o script localizado em `scripts/remove_bg.py`.

---

## 📂 Arquitetura do Sistema

### Módulos Principais
-   **Gestão de Clubes (Super Admin):** Criação de clubes, logs de auditoria e configurações globais.
-   **Campeonatos (Admin de Clube):** Gestão de inscrições, categorias por idade/sexo e sorteio de chaves.
-   **Súmula Digital:** Sistema dinâmico para esportes coletivos (Futebol, Vôlei, Basquete) e individuais (Tênis, Beach Tennis).
-   **Editor de Artes:** Criação de artes para redes sociais com templates customizáveis e pré-visualização.
-   **Corrida de Rua (Racing):** Módulo especializado com inscrição pública, integração de pagamento Asaas e entrega de kits.

### Banco de Dados (Destaques)
-   `users`: Armazena atletas, capitães e administradores. Possui campo `photos` (JSON) para múltiplas fotos.
-   `match_events`: Logs de tudo que acontece em uma partida (gols, pontos, início/fim de set).
-   `championship_team`: Tabela pivô com informações de pagamento e aceitação de termos para equipes.
-   `race_results`: Gerencia inscritos em corridas, vinculando à categoria e status de pagamento.

---

## 🔗 Integrações Externas

### Asaas (Pagamentos)
O sistema utiliza o Asaas para emissão de PIX, Cartão e Boleto. 
-   As configurações ficam em `clubs.payment_settings`.
-   A integração está centralizada no `App\Services\AsaasService`.

### OpenAI (Opcional/Futuro)
Há hooks preparados para utilização de GPT em relatórios de partidas ou geração de textos.

---

## 🛠️ Comandos de Manutenção

-   **Limpeza de Cache:** `php artisan optimize:clear`
-   **Novas Migrações:** `php artisan make:migration nome_da_migracao`
-   **Logs de Erro:** Verifique `storage/logs/laravel.log` para o backend e o console do navegador para o frontend.

---

## 📝 Notas de Versão Recentes
-   Adicionado suporte detalhado a placar de Tênis (Sets, Games, Tie-break).
-   Implementado fluxo de inscrição de corrida pública com validação de idade por ano (31/12).
-   Correção na largura de campos de telefone e CPF para aceitar máscaras e DDI.
-   Melhoria no tempo de timeout para uploads de fotos pesadas.
