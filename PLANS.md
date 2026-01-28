# Arquitetura Técnica Master - Sistema Esportivo SaaS (PLANS.md)
VERSÃO: V3 (Atualizado 22/01/2026) -> Alinhado com Budget V3 e Escopo Completo.

Este é o documento definitivo (Master Plan) que guia todo o desenvolvimento.
Ele unifica a Estrutura de Banco, Fluxo de Telas, Regras de Negócio e Catálogo de Modalidades.

---

## 1. Visão Geral do Produto
*   **Modelo**: SaaS Multi-tenant (Multi-Clube / Multi-Cidade).
*   **Plataforma Universal**: 
    1.  **Mobile App**: iOS / Android (React Native + Expo).
    2.  **Web Admin**: Dashboard de Gestão (React).
    3.  **Cross-Platform**: O Frontend Mobile roda no Desktop (React Native Web).
*   **Proposta de Valor**: Um único ecossistema que gerencia qualquer esporte (Futebol ao Xadrez).
*   **Diferenciais Técnicos**: 
    *   **Polimorfismo**: Backend adaptável para regras de Gols, Pontos, Sets ou Tempo.
    *   **Live Score**: Websocket para placar em tempo real (<100ms).
    *   **IA Antifraude**: OCR automático de documentos.
    *   **Offline-First**: Súmula funciona sem internet.

---

## 2. Catálogo de Modalidades (Arquitetura Polimórfica)

O sistema suporta nativamente 5 arquétipos de esporte (Strategy Pattern).

| Arquétipo | Esportes Suportados (Exemplos) | Estrutura de Dados (Polimórfica) |
| :--- | :--- | :--- |
| **A. Gols** | Futebol, Futsal, Society, Handebol | `score_a` (int), `score_b` (int), `events` (cartões, gols) |
| **B. Sets/Pontos** | Vôlei, Vôlei Praia, Futevôlei | `sets_won` (int), `current_set_score` (25x23), `tiebreak` |
| **C. Games/Sets** | Tênis, Padel, Beach Tennis, Squash | `sets_won` (int), `games` (6x5), `points` (15/30/40) |
| **D. Tempo/Racing** | Corrida Rua, Ciclismo, Natação | `result_time` (00:45:12), `position` (int), `bib_number` |
| **E. Combate/Luta** | Judô, Jiu-Jitsu, Lutas (Mata-mata) | `match_time` (cronômetro), `ippon/wazari` (flags) |

---

## 3. Banco de Dados (Diagrama Lógico Macro)

### Módulo Core & Multi-Tenancy
*   **`clubes`**: `nome`, `slug`, `branding_config` (JSON Cores/Logo), `active_modules` (JSON).
*   **`users`**: `name`, `email`, `cpf`, `document_url` (OCR), `is_verified`.

### Módulo Competição (Engine Polimórfica)
*   **`championships`**: `clube_id`, `sport_type` (A, B, C, D, E).
*   **`categories`**: `name` (Sub-20), `rules_config` (JSON específico do esporte).
*   **`matches`** (Partidas):
    *   `team_a_id`, `team_b_id`.
    *   `score_type`: Enum (GOALS, SETS, TIME).
    *   `livedata`: JSON Blob atualizado via Websocket.
    *   `mvp_id`: FK User.

### Módulo Financeiro
*   **`orders`**: `user_id`, `total`, `status`, `payment_gateway_id`.
*   **`items`**: `order_id`, `product_type` (INSCRICAO, PRODUTO), `price`.
*   **`ledger`**: Histórico imutável de transações (Entradas/Saídas).

---

## 4. Mapa de Telas (Resumo Quantitativo: 49 Telas)

### Frontend Mobile (App Universal)
*   **Acesso**: Welcome, Login, Register, OCR Upload, Recovery.
*   **Navegação**: Home Dashboard, SportsHub, Perfil.
*   **Competição**: Tabelas, Lista de Jogos, Detalhe da Partida (Live).
*   **E-commerce**: Loja, Carrinho, Checkout, Pedidos.
*   **Gestor (Admin Mobile)**:
    *   Scanner QR Code.
    *   **Súmulas (6 Variantes)**: Futebol, Vôlei, Tênis, Basquete, Luta, Corrida.

### Frontend Web (Backoffice)
*   **Gestão**: Criar Campeonato (Wizard), Times, Tabela de Jogos.
*   **Financeiro**: Relatórios, Cupons, Fraudes.
*   **Marketing**: Gerador de Artes (Canvas), Configurar Temas.

---

## 5. Plano de Execução (Roadmap Backend em 13 Passos)

1.  Auth (JWT + Refresh).
2.  Multi-tenant ACL.
3.  Microserviço OCR.
4.  Polimorfismo (Schema DB + Strategies).
5.  Motor de Classificação.
6.  Sorteio de Chaves.
7.  Sorteio de Times (Balancer).
8.  Websocket Server.
9.  Gateway Pix/Cartão.
10. Webhooks/Ledger.
11. ETL Migração.
12. Gerador PDF/Artes.
13. API Whitelabel.
