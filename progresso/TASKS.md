# Painel de Controle de Desenvolvimento (TASKS.md)

Este documento rastreia o progresso do desenvolvimento do Super App Esportivo.

## Fase 1: Fundação Backend (Laravel)
- [ ] **Banco de Dados**
    - [x] Planejamento de Schema (Migrations criadas).
    - [x] Execução `php artisan migrate`.
- [ ] **Lógica de Negócio (Models)**
    - [x] Configurar Models (Fillables, Relations).
    - [x] Criar Seeders (Dados de teste).
- [ ] **API Rest (Controllers)**
    - [x] `AuthController` (Login, Register).
    - [ ] `OCRController` (Integração com API de IA para validar documentos).
    - [x] `CoreController` (Listar Cidades, Clubes, Esportes).
    - [x] `EventController` (Campeonatos, Categorias, Partidas).
    - [x] `ShopController` (Produtos, Checkout).
    - [ ] **Refatoração Polimórfica**
        - [ ] Criar tabelas polimórficas (`matchables`, `scoreables`) para suportar Vôlei/Tênis além de Futebol.
        - [ ] Migrar lógica de pontuação para Strategies ou Services específicos por esporte.
    - [x] **Migração de Dados**
        - [x] Criar scripts de importação para banco legado (`ImportOldData.php`).
    - [ ] **Módulos Avançados (13 Módulos)**
        - [ ] Service OCR (Google Vision).
        - [ ] TeamSortingService (Balanceamento).
        - [ ] WhitelabelController (API Temas).
        - [ ] MatchStrategy (Polimorfismo).
        - [ ] ClassificationEngine (Tabelas).
        - [ ] DrawService (Sorteio Chaves).
        - [ ] WebsocketServer (Live Score).
        - [ ] PaymentGateway (Pix/Card).
        - [ ] LedgerService (Financeiro Seguro).
        - [x] DataMigrationETL.
        - [ ] ArtGeneratorEngine.

## Fase 2: App Mobile Único (Multi-perfil)
O projeto consiste em um **único binário** (App) que adapta suas funcionalidades baseado no login:
- **Perfil Torcedor:** Acesso à home, estatísticas e loja.
- **Perfil Operacional (Juiz/Mesário):** Acesso à área restrita de Súmula e Validação.


- [x] **Setup Inicial**
    - [x] Iniciarlizar Projeto Expo (`npx create-expo-app`).
    - [x] Configurar NativeWind (TailwindCSS) e Fontes.
    - [x] Configurar Navegação (Expo Router).
- [x] **Autenticação & Onboarding**
    - [x] Tela Welcome (Select Cidade/Clube).
    - [x] Tela Login/Register.
- [x] **Core Features**
    - [x] Home Dashboard (Dinâmica por Clube).
    - [x] Sports Hub (Grid de Modalidades).
- [x] **Módulo Esportes de Time**
    - [x] Tabela de Classificação.
    - [x] Detalhe da Partida (Live Score).
- [x] **Módulo Corrida**
    - [x] Inscrição e Resultados.

- [ ] **Módulo Admin (Web/Desktop)**
    - [x] **Controllers Backend**
        - [x] `AdminController` (Dashboard, Métricas).
        - [x] `TournamentManagerController` (CRUD Campeonatos, Times).
        - [x] `DrawController` (Algoritmo de Sorteio de Chaves).
        - [x] `PaymentWebhookController` (Callbacks de Pagamento).
        - [x] `ReportController` (Relatórios Excel/PDF).
        - [x] `MatchOperationController` (API Súmula Mobile).
    - [x] **Frontend Admin (Web)**
        - [x] Dashboard Geral.
        - [x] Editor de Campeonatos (Wizard).
        - [x] Gestão de Aprovações (Docs).

## Fase 4: Telas Faltantes (Gap Analysis - Mobile)
Para atingir o escopo completo (aprox. 38 telas), faltam:

- [x] **E-commerce & Histórico**
    - [x] `product-detail.tsx` (Detalhe do Produto, Tamanhos).
    - [x] `cart.tsx` (Carrinho de Compras).
    - [x] `my-orders.tsx` (Meus Pedidos/Inscrições).
- [x] **Esportes Individuais (Corrida)**
    - [x] `race-home.tsx` (Hotsite do Evento, Mapa).
    - [x] `race-results.tsx` (Ranking com Filtros).
- [x] **Gestão do Capitão**
    - [x] `my-teams.tsx` (Meus Times).
    - [x] `manage-roster.tsx` (Gerir Elenco/Convites).
- [x] **Área Restrita (Perfil Gestor de Campo/Juiz)**
    - [x] `admin/home.tsx` (Hub do Mesário).
    - [x] `admin/sumula-futebol.tsx` (Futebol, Futsal, Fut7).
    - [x] `admin/sumula-volei.tsx` (Sets e Pontos).
    - [x] `admin/sumula-tenis.tsx` (Reutiliza Volei/Sets).
    - [x] `admin/sumula-basquete.tsx` (Quartos e Faltas).
    - [x] `admin/sumula-lutas.tsx` (Cronômetro Combate).
    - [x] `admin/sumula-handebol.tsx` (Clone Futebol + 2min).
    - [x] `admin/scan.tsx` (Leitor QR Code).

---
**Legenda:**
- [x] Concluído
- [ ] Pendente
- [~] Em Andamento
