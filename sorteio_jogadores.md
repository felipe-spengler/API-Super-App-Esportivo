# Especificação Completa: Campeonato com Inscrição Individual e Sorteio de Jogadores nos Times (`sorteio_jogadores`)

Este documento descreve **toda a arquitetura, regras de negócio, travas de segurança, banco de dados, rotas de backend e telas de frontend** necessárias para implementar o modelo de campeonato onde **os atletas se inscrevem individualmente** e, após o fechamento das inscrições, **o Admin realiza o sorteio dos jogadores para formar os times**, seguindo depois o fluxo 100% normal do campeonato (grupos, tabela de jogos, súmulas, artilharia, cartões, MVP e artes).

---

## 1. Perguntas Recomendadas para Alinhar com o Cliente

Antes de iniciar a implementação (ou para validar se o padrão abaixo atende 100%), vale confirmar estes **7 pontos** com o cliente:

1. **Critério do Sorteio (Totalmente Aleatório, por Posição ou por Potes/Nível Técnico?):**
   - *Opção A (Por Posição - Recomendado):* O atleta escolhe sua posição na inscrição (ex: *Goleiro, Zagueiro/Fixo, Meia/Ala, Atacante/Pivô*). O sistema sorteia primeiro 1 Goleiro para cada time, depois distribui os defensores, meias e atacantes igualmente.
   - *Opção B (Por Potes / Nível Técnico - Muito comum em clubes):* O Admin classifica os inscritos em Potes (ex: *Pote A = Craques/Cabeças de chave, Pote B = Intermediários, Pote C = Iniciantes, Pote Goleiros*) para que nenhum time fique "apelão" e todos saiam equilibrados.
   - *Opção C (100% Aleatório):* Todos no mesmo bolo, sorteados puramente ao acaso.
   - *(Nota: Podemos suportar os 3 modos na mesma tela com um seletor!)*
2. **Troca Manual Pós-Sorteio (Arrastar e Soltar / Trocar 1 por 1):**
   - Após o clique em *"Sortear"*, o Admin quer poder **arrastar um jogador de um time para outro** (ou clicar em dois jogadores para permutar/trocar de lugar) antes de clicar em *"Confirmar e Oficializar Times"*? *(Na nossa especificação abaixo, isso já está incluído como padrão!).*
3. **Criação dos Times (Automática pela quantidade de jogadores ou Manual antes do sorteio?):**
   - O Admin prefere informar: *"Quero 8 jogadores por time"* (e com 48 inscritos o sistema gera automaticamente **6 times** chamados *Time 1..Time 6* para o Admin só renomear/colocar escudo), **OU** o Admin prefere cadastrar os times antes (ex: *Real Madrid, Barcelona, Milan...*) e o sistema divide os inscritos entre os times existentes? *(Podemos permitir as duas opções na tela do sorteio!).*
4. **O que fazer quando a divisão não for exata (Sobras / Lista de Espera)?**
   - Exemplo: 42 inscritos para times de 10 jogadores (4 times de 10 = 40 jogadores; sobram 2).
   - Esses 2 entram como **reservas extras** distribuídos em 2 times (ficando 2 times com 11 e 2 times com 10), ou existe um **limite rígido de vagas** na inscrição (ex: travar inscrição exatamente no 40º atleta pago)?
5. **Só entra no sorteio quem estiver com pagamento confirmado (`paid`)?**
   - Se a inscrição for paga via PIX/Cartão, atletas com status `pending` ficam fora do sorteio (ou o Admin pode marcar uma opção *"Incluir pendentes no sorteio"*)?
6. **Definição do Capitão e Número da Camisa de cada Time:**
   - Após o sorteio, o 1º jogador sorteado do time (ou o cabeça de chave do Pote A) vira o **Capitão** automaticamente, podendo o Admin trocar com 1 clique? E a numeração das camisas (1 a N) pode ser gerada automaticamente na ordem do sorteio e editável pelo Admin?
7. **Sorteio ao Vivo / Telão (Modo Apresentação):**
   - O cliente pretende transmitir o sorteio num telão/TV no clube (revelando jogador por jogador com animação de sorteio) ou apenas clicar em *"Sortear Todos"* rapidamente no painel?

---

## 2. Regras de Negócio e Travas de Segurança Obrigatórias

Para garantir que o sistema **nunca falhe** em produção:

1. **Trava de Datas de Inscrição (`registration_start_date` e `registration_end_date`):**
   - Validada tanto no Frontend quanto no Backend (`Championship::checkRegistrationAllowed()`).
   - Se a data atual for anterior a `registration_start_date` ou posterior a `registration_end_date` (considerando `23:59:59` do dia limite), ou se o status do campeonato não permitir inscrições, **nenhuma inscrição é aceita (HTTP 403)**.
2. **Trava de Limite Máximo de Atletas Inscritos por Categoria (`max_athletes`):**
   - Se a categoria tiver limite de vagas (ex: `max_athletes = 60` para formar 6 times de 10), assim que atingir 60 inscrições ativas (`paid` ou `pending` dentro da validade), o backend e o frontend bloqueiam novas inscrições informando **"Vagas Esgotadas para esta Categoria"**.
3. **Trava de Quantidade de Jogadores por Time (`players_per_team` / `max_players_per_team`):**
   - Na tela do sorteio, o Admin define:
     - **Jogadores por time (ideal):** ex. `8` jogadores.
     - **Máximo permitido por time:** ex. `10` jogadores.
   - Ao arrastar um jogador manualmente de um time para outro, o sistema mostra um contador visual em cada card de time (`8/10 atletas`) e alerta/bloqueia caso o Admin tente colocar mais jogadores do que o limite máximo configurado.
4. **Trava de Elegibilidade (Idade e Gênero da Categoria):**
   - No momento da inscrição individual, o backend valida `Category::isUserEligible($user, true)` (idade mínima, idade máxima e gênero da categoria).
5. **Trava de Unicidade (Impedir Dupla Inscrição):**
   - O mesmo atleta (`user_id` / `cpf`) não pode se inscrever duas vezes na mesma categoria do mesmo campeonato.
6. **Trava de Re-sorteio após Jogos Iniciados:**
   - Enquanto os jogos do campeonato ainda não começaram, o Admin pode refazer o sorteio ou mover jogadores entre os times livremente.
   - Se o campeonato já tiver partidas finalizadas (`status = 'finished'`) ou ao vivo (`status = 'live'`), o botão *"Refazer Sorteio do Zero"* fica bloqueado (com aviso de segurança) para não desmanchar times que já jogaram, permitindo apenas transferências pontuais se necessário.

---

## 3. Banco de Dados e Migrations Necessárias

Para manter compatibilidade total com o que já existe e suportar o pool de atletas antes e depois do sorteio:

### 3.1. Nova Tabela `championship_player_inscriptions` (ou extensão de `team_players`)
Criar a migration `create_championship_player_inscriptions_table.php` para registrar a inscrição individual do atleta no campeonato/categoria **antes e depois** de ele ser sorteado para um time:
- `id` (PK)
- `championship_id` (FK -> `championships.id`, cascade)
- `category_id` (FK -> `categories.id`, nullable)
- `user_id` (FK -> `users.id`, cascade)
- `preferred_position` (string, nullable — ex: `Goleiro`, `Fixo/Zagueiro`, `Ala/Meia`, `Pivô/Atacante`)
- `draw_pot` (string, default `'Geral'` — ex: `Pote A`, `Pote B`, `Pote C`, `Goleiro` para sorteio equilibrado)
- `shirt_number` (integer, nullable)
- `assigned_team_id` (FK -> `teams.id`, nullable, `nullOnDelete` — preenchido quando o sorteio é salvo)
- `status_payment` (`pending`, `paid`, `cancelled`, default `'paid'`)
- `payment_method` (string, nullable)
- `payment_info` (json, nullable)
- `asaas_payment_id` (string, nullable)
- `coupon_id` (FK -> `coupons.id`, nullable)
- `gifts` (json, nullable)
- `shop_items` (json, nullable)
- `timestamps()`
- **Unique index:** `unique(['championship_id', 'category_id', 'user_id'])`

### 3.2. Colunas Auxiliares em `categories`
Migration `add_draw_settings_to_categories_table.php`:
- `max_athletes` (integer, nullable) — limite total de atletas inscritos na categoria.
- `players_per_team` (integer, nullable) — quantidade padrão de atletas por time no sorteio (ex: 8).
- `max_players_per_team` (integer, nullable) — limite máximo de atletas por time (ex: 10).

---

## 4. Backend (Laravel) — Rotas, Controllers e Services

### 4.1. Inscrição Pública Individual em Esportes Coletivos (`InscriptionController.php`)
- **Novo Método:** `POST /api/inscriptions/individual-player` (`InscriptionController::registerIndividualPlayer`)
  1. Valida `championship_id`, `category_id`, `preferred_position`, `gifts`, `shop_items`, `coupon_code`, `payment_method`.
  2. Executa `$championship->checkRegistrationAllowed()` (trava de data `registration_end_date` e `status`).
  3. Verifica se a categoria atingiu `max_athletes` (trava de limite de vagas).
  4. Verifica elegibilidade de idade/gênero (`$category->isUserEligible($user, true)`).
  5. Verifica se o atleta já está inscrito naquela categoria.
  6. Calcula preço, brindes, itens de loja e cupom; gera cobrança Asaas (se pago) ou marca `status_payment = 'paid'` (se gratuito).
  7. Salva em `championship_player_inscriptions`.
- **Webhook Asaas (`AsaasController.php`):**
  - Adicionar suporte ao prefixo `CPI_{id}` (`ChampionshipPlayerInscription`): quando o pagamento PIX/Cartão/Boleto confirmar, atualiza `status_payment = 'paid'`, dá baixa no estoque de brindes/loja e envia e-mail de confirmação da inscrição individual para o atleta.

### 4.2. Controller de Sorteio de Jogadores (`Admin\PlayerDrawController.php`)
Rotas protegidas em `/api/admin/championships/{championshipId}/player-draw`:

1. **`GET /api/admin/championships/{championshipId}/player-draw`** (`index`):
   - Retorna:
     - Lista de atletas inscritos na categoria (`championship_player_inscriptions` com dados do `User`: foto, nome, apelido, posição preferida, pote, status de pagamento, `assigned_team_id`).
     - Lista de times já vinculados àquela categoria em `championship_team` (com seus jogadores atualmente alocados).
     - Configurações da categoria (`max_athletes`, `players_per_team`, `max_players_per_team`).
2. **`POST /api/admin/championships/{championshipId}/player-draw/auto-create-teams`** (`autoCreateTeams`):
   - Recebe `category_id`, `players_per_team` (ex: 8) ou `num_teams` (ex: 6), e um prefixo/lista de nomes (ex: `["Time 1", "Time 2", ...]`).
   - Cria os registros em `teams` (vinculados ao `club_id` do campeonato) e vincula todos em `championship_team` para aquela categoria.
   - Permite que o Admin edite o nome, cor e escudo de cada time ali mesmo na tela.
3. **`PATCH /api/admin/championships/{championshipId}/player-draw/athletes/{inscriptionId}`** (`updateAthletePotOrPosition`):
   - Permite ao Admin alterar a posição (`preferred_position`) ou o pote de nível (`draw_pot`: `Pote A`, `Pote B`, `Goleiro`, etc.) de qualquer atleta antes de rodar o sorteio.
4. **`POST /api/admin/championships/{championshipId}/player-draw/save`** (`saveDraw`):
   - Recebe a distribuição final dos times após o sorteio e após os ajustes manuais (drag-and-drop) do Admin:
     ```json
     {
       "category_id": 12,
       "notify_athletes": true,
       "teams": [
         {
           "team_id": 101,
           "name": "Time Azul",
           "captain_id": 45,
           "players": [
             { "user_id": 45, "position": "Goleiro", "number": 1 },
             { "user_id": 48, "position": "Atacante", "number": 9 }
           ]
         }
       ]
     }
     ```
   - **O que o `saveDraw` faz dentro de uma `DB::transaction`:**
     1. Valida se nenhum time ultrapassou `max_players_per_team`.
     2. Atualiza o nome do time e o `captain_id` em `teams` e `championship_team`.
     3. Limpa os registros anteriores de `team_players` daqueles times naquele `championship_id` e insere todos os jogadores sorteados em `team_players` (`team_id`, `user_id`, `championship_id`, `position`, `number`, `is_approved = 1`).
     4. Atualiza `assigned_team_id` em `championship_player_inscriptions`.
     5. Se `notify_athletes = true`, dispara o `TeamInscriptionService::notifyAthleteTeamInscription(...)` para cada atleta sorteado informando em qual time ele caiu!

---

## 5. Frontend (React) — Telas a Criar e Atualizar

### 5.1. Atualização de `ChampionshipForm.tsx` e `AdminCategoryManager.tsx`
- Em `ChampionshipForm.tsx`:
  - Destacar claramente a opção `registration_type`:
    - **Por Equipe (`team`):** O capitão inscreve o time.
    - **Individual com Sorteio de Equipes (`individual`):** Os atletas se inscrevem individualmente e o Admin sorteia os jogadores nos times.
- Em `AdminCategoryManager.tsx`:
  - Adicionar os campos opcionais na categoria:
    - **Limite Total de Atletas Inscritos (`max_athletes`)**
    - **Jogadores por Time no Sorteio (`players_per_team`)**
    - **Máximo de Jogadores por Time (`max_players_per_team`)**

### 5.2. Atualização de `ChampionshipInscription.tsx` (Inscrição Pública do Atleta)
- Quando `championship.registration_type === 'individual'` (em esportes coletivos como Futebol, Futsal, Society, Vôlei, Basquete):
  - No **Passo 2**, em vez de pedir `Nome do Time` (e corrigindo o `disabled={!teamName}` atual), exibe o seletor de **Posição Preferida em Jogo** (conforme o esporte: ex. *Goleiro, Zagueiro/Fixo, Lateral/Ala, Meia, Atacante/Pivô*) e número de camisa preferido (opcional).
  - No **Passo 6 (Submit)**, envia para `POST /api/inscriptions/individual-player`.

### 5.3. Nova Tela no Painel Admin: `AdminPlayerDraw.tsx` (`/admin/championships/:id/player-draw`)
Acessível por um botão em destaque **"🎲 Sorteio de Jogadores nos Times"** dentro de `AdminChampionshipDetails.tsx` e `AdminTeamChampionshipManager.tsx`.

A tela `AdminPlayerDraw.tsx` terá **4 áreas interativas (Mobile-First + Desktop Drag-and-Drop)**:

1. **Barra de Configuração e Geração de Times (Topo):**
   - Mostra: `Total de Inscritos: 48 atletas (45 pagos, 3 pendentes)`.
   - Se os times ainda não foram criados, exibe o gerador rápido:
     - *"Quantos jogadores por time?"* -> input `8` -> *"O sistema criará 6 times automaticamente"*.
     - Botão **"Gerar 6 Times Base"** (ou botão **"+ Adicionar Time Manualmente"**).
   - Em cada time criado, o Admin pode clicar no nome do time (ex: `Time 1`) para renomear na hora (ex: ` Esquadrão Azul`) ou trocar o escudo.

2. **Banco de Atletas Inscritos (Pool Lateral / Topo):**
   - Lista todos os atletas ainda sem time, com filtro por **Posição** (*Goleiros, Defensores, Meias, Atacantes*) e seletor rápido de **Pote/Nível** (*Pote A, Pote B, Pote C, Goleiro*).
   - Checkbox: `[x] Sortear apenas atletas com pagamento confirmado`.

3. **Motor de Sorteio Inteligente (Botão "🎲 Sortear Jogadores"):**
   - Três modos de sorteio com 1 clique:
     - **Equilibrado por Posição + Pote (Recomendado):**
       1. Separa primeiro os **Goleiros** e sorteia 1 para cada time.
       2. Depois sorteia os atletas do **Pote A (Cabeças de chave)** distribuindo 1 por time em formato *snake draft* (`Time 1 -> Time 2 -> ... -> Time N`).
       3. Em seguida distribui **Pote B**, **Pote C** e demais posições até completar `players_per_team` em cada equipe!
     - **Equilibrado Apenas por Posição:** garante a mesma proporção de goleiros, defensores, meias e atacantes em cada time.
     - **100% Aleatório:** embaralha todos e distribui igualmente.

4. **Ajuste Manual Pós-Sorteio (Drag-and-Drop + Troca 1-para-1 no Celular):**
   - **No Computador (Drag & Drop com `react-beautiful-dnd`):**
     - O Admin pode **arrastar qualquer jogador** do `Time A` e soltar no `Time B` (ou devolver para a lista de espera).
   - **No Celular / Tablet (Toque para Trocar — Mobile-First):**
     - Além de arrastar, cada jogador tem um botão **`⇄ Trocar`**: ao tocar no `Jogador X (Time A)` e depois tocar no `Jogador Y (Time B)`, **os dois trocam de time instantaneamente** (mantendo a quantidade exata de jogadores nos dois times)!
   - **Definir Capitão `(C)` e Número:**
     - Em cada card de time, o Admin pode clicar no ícone `👑 (C)` ao lado de qualquer atleta sorteado para defini-lo como Capitão do time.
   - **Indicador de Limite por Time:**
     - Cada time exibe um badge `8 / 8 atletas` (verde quando completo, amarelo se tiver vaga, vermelho se exceder `max_players_per_team`).
   - **Botão Final "✅ Salvar e Oficializar Elencos":**
     - Grava todos os elencos na tabela `team_players` do campeonato.

---

## 6. Como o Campeonato Desenrola Após o Sorteio (100% Padrão)

Assim que o Admin clica em **"✅ Salvar e Oficializar Elencos"** na tela de sorteio:
1. Os times estão cadastrados em `championship_team` e seus respectivos jogadores estão gravados em `team_players` com `championship_id` — **exatamente na mesma estrutura** de um campeonato onde os times se inscreveram prontos.
2. O Admin vai para **Grupos / Sorteio de Chaves** (`AdminGroupManager.tsx` / `AdminMatchManager.tsx`) e gera a tabela de jogos normalmente (Pontos Corridos, Grupos + Mata-Mata ou Eliminatória Simples).
3. Na hora do jogo, o mesário abre a **Súmula Digital** (`SumulaFutebol.tsx`, `SumulaFutsal.tsx`, `SumulaFutebol7.tsx`, `SumulaVolei.tsx`, etc.) e todos os jogadores sorteados para aquele time já aparecem automaticamente na lista da súmula com seus números e capitão.
4. Gols, assistências, cartões amarelos/vermelhos, melhor defesa, classificação, votação de Craque do Jogo (MVP) e geração de Cards/Artes funcionam **sem nenhuma diferença e sem precisar alterar nada** nas telas de súmula ou estatísticas!
