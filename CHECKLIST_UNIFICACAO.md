# 📋 Checklist de Unificação: Web Admin vs Mobile Admin

Este documento lista as funcionalidades necessárias para garantir paridade total entre as plataformas Web e Mobile.

## 📱 Mobile Admin (Trazer funcionalidades da Web para o App)

### 🛒 Gestão de Loja (E-commerce)
- [x] **Produtos:** Listagem de produtos cadastrados pelo clube.
- [x] **Criar/Editar Produto:** Formulário para adicionar nome, preço, estoque e imagem.
- [x] **Pedidos:** Lista de pedidos recebidos com filtros (Pendente, Pago, Entregue).
- [x] **Detalhe do Pedido:** Ver itens comprados e alterar status do pedido.

### 👥 Gestão de Usuários
- [x] **Lista de Usuários:** Disponível via endpoint.
- [x] **Criar Admin:** Permitir promover um usuário a Admin ou Juiz pelo celular. (Simplificado via config).
- [ ] **Bloquear/Aprovar:** Gestão rápida de acesso. (Pendente Web).

### 🏆 Gestão Avançada de Campeonatos
- [x] **Edição Completa:** Permitir editar regulamento, formato e categorias pelo app (hoje é básico).
- [x] **Gestão de Times:** Adicionar/Remover times de um campeonato.
- [x] **Tabela de Jogos:** Criar partidas manualmente (Select de times, data e local).

### ⚙️ Clube
- [x] **Configurações:** Editar cores, logo e nome do clube pelo app.

---

## 💻 Web Admin (Trazer funcionalidades do Mobile para o Painel)

### 🎮 Súmula e Jogos ao Vivo
- [ ] **Súmula Eletrônica Web:** Criar interface de jogo ao vivo (similar ao app) para uso em notebooks/tablets.
  - [ ] Cronômetro/Timer sincronizado.
  - [ ] Registro de eventos (Gol, Cartão, Ponto) em tempo real.
  - [ ] Escalação de jogadores na hora do jogo.
- [ ] **Galeria de Fotos do Jogo:** Upload de fotos da partida (MVP, lances) pela Web.

### 📢 Comunicação
- [ ] **Notificações Push:** Interface para criar e enviar Push Notifications para todos os usuários do app.
- [ ] **News/Feed:** Criar postagens de notícias que aparecem na home do app.

### 🎟️ Portaria e Acesso
- [ ] **Validador Manual:** Campo para digitar código da carteirinha/ingresso (já que Web não tem scanner de câmera nativo fácil).

---

## 🚀 Plano de Execução (Modo Turbo)

### Fase 1: Súmula na Web (Prioridade Máxima)
Habilitar mesários com notebook a controlarem o jogo.
1. [x] Criar `LiveGameResource` no Filament.
2. [x] Implementar interface React/Livewire que simula a tela do App (Placar + Cronômetro).

### Fase 2: Loja no Mobile
Permitir gestão de vendas no campo.
1. [x] Criar telas `admin/shop/products` e `admin/shop/orders`.
2. [x] Conectar com API de CRUD de produtos.

### Fase 3: Gestão de Times e Jogos no Mobile
1. [x] Criar tela de `admin/matches/create` e `admin/teams` (Já existiam, foram melhoradas).

### Fase 4: Notificações na Web
### Fase 4: Web Admin Completo (Turbo)
1. [x] Criar `NotificationResource` (Page SendPushNotification).
2. [x] Criar `PostResource` para News/Feed.
3. [x] Adicionar Galeria de Fotos em Partidas.
4. [x] Criar Validador Manual de Acesso (`AccessControl`).
