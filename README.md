# 🏆 App Esportivo - Plataforma de Gestão Esportiva

Uma solução completa e moderna para gerenciamento de ligas, campeonatos, times e atletas, com recursos avançados de automação e inteligência artificial.

![Banner do Projeto](https://placehold.co/1200x400/indigo/white?text=App+Esportivo)

## ✨ Principais Funcionalidades

### 🏟️ Gestão de Campeonatos
- **Criação Flexível**: Suporte a fases de grupos, mata-mata e pontos corridos.
- **Chaveamento Automático**: Sorteio e geração de brackets inteligentes.
- **Súmula Digital em Tempo Real**: Registro de gols, cartões, faltas e estatísticas ao vivo.

### 👥 Gestão de Times e Atletas
- **Cadastro Completo**: Histórico de jogos, estatísticas individuais e documentos.
- **Carteirinha Digital**: Acesso via QR Code para validação de atletas em partidas.
- **Transferências**: Sistema de contratação e movimentação de jogadores entre times.

### 🎨 Design & Automação com IA (Destaque)
- **Gerador de Artes Automático**: Criação instantânea de artes para redes sociais (Confrontos, MVP, Agenda de Jogos).
- **Remoção de Fundo com IA**: Upload de fotos de jogadores com recorte automático de fundo (integração Python/U2Net).
- **Personalização**: Templates ajustáveis por campeonato ou clube.

### 🛒 Módulos Adicionais
- **Loja Virtual**: Venda de produtos e kits dos clubes.
- **Financeiro**: Controle de inscrições e pagamentos.

---

## 🚀 Tecnologias Utilizadas

### Backend
- **Laravel** (PHP): API RESTful robusta e segura.
- **MySQL**: Banco de dados relacional.
- **Python**: Scripts de IA para processamento de imagem (`rembg`, `u2net`).

### Frontend
- **React** (Vite): Interface rápida e responsiva.
- **TailwindCSS**: Estilização moderna e customizável.
- **Lucide Icons**: Iconografia limpa e consistente.
- **TypeScript**: Segurança e tipagem estática.

---

## 🛠️ Instalação e Configuração

### Pré-requisitos
- PHP 8.1+
- Composer
- Node.js & npm/yarn/bun
- Python 3.8+ (para recursos de IA)
- MySQL

### 1. Backend (Laravel)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/app-esportivo.git
cd app-esportivo/backend

# Instale as dependências do PHP
composer install

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais de banco de dados

# Gere a chave da aplicação
php artisan key:generate

# Execute as migrações
php artisan migrate --seed

# Inicie o servidor
php artisan serve
```

### 2. Frontend (React)

```bash
# Navegue até a pasta do frontend (dentro de backend/frontend ou raiz separada)
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### 3. Configuração da IA (Opcional - Para Remoção de Fundo)

Certifique-se de ter o Python instalado e as bibliotecas necessárias:

```bash
pip install rembg
# O script de IA fica em: backend/scripts/remove_bg.py
```

---

## 📱 Acesso ao Sistema

- **Admin**: `http://localhost:5173/admin` (Frontend)
- **API**: `http://localhost:8000/api` (Backend)

---

## 📄 Licença

Este projeto é proprietário e desenvolvido para uso exclusivo. Todos os direitos reservados.
