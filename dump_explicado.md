# Documentação do Banco de Dados — Super App Esportivo ⚽🏆

Esta documentação detalha a estrutura do banco de dados do **Super App Esportivo** para apoiar o onboarding de novos programadores. 

O banco de dados é relacional (MariaDB/MySQL) e segue as convenções do framework **Laravel**, utilizando relacionamentos via chaves estrangeiras baseadas em IDs (`bigint`).

---

## Sumário das Entidades e Módulos Principais

Para facilitar o entendimento, o banco pode ser dividido nos seguintes grandes blocos funcionais:

1. **Núcleo Organizacional:** `clubs`, `cities`, `sports`, `system_settings`
2. **Usuários e Autenticação:** `users`, `personal_access_tokens`, `sessions`
3. **Gestão de Campeonatos & Regras:** `championships`, `categories`
4. **Equipes e Atletas:** `teams`, `team_players`, `championship_team`
5. **Módulo de Jogos Coletivos (Futebol, Vôlei, etc):** `game_matches`, `match_events`, `match_sets`, `match_positions`, `mvp_votes`
6. **Módulo de Corridas & Tempos (Individual/Coletivo):** `races`, `race_results`, `competitor_times`
7. **Módulo Financeiro, Loja e Cupons:** `orders`, `order_items`, `products`, `coupons`
8. **Comunicação e Auditoria:** `posts`, `audit_logs`
9. **Infraestrutura Laravel:** `migrations`, `jobs`, `job_batches`, `failed_jobs`, `cache`, `cache_locks`

---

## Detalhamento Técnico das Tabelas

### 1. Núcleo Organizacional e Configurações

#### `clubs`
Representa as entidades/clubes esportivos que organizam e gerenciam os eventos. O sistema é multi-tenant (cada clube tem sua identidade, URL e dados separados).
*   `id`: Identificador único.
*   `city_id`: Relacionamento com a cidade do clube (`cities`).
*   `name`: Nome do clube (ex: "Toledão").
*   `slug`: URL amigável para acessar o portal público (ex: `toledao`).
*   `logo_url` / `banner_url`: Identidade visual do clube.
*   `primary_color` / `secondary_color`: Cores da interface customizada para o clube.
*   `active_modalities`: Lista (geralmente JSON) das modalidades ativas naquele clube.
*   `art_settings` / `payment_settings`: Configurações JSON de geradores de artes e credenciais de gateways de pagamentos (ex: Asaas).

#### `sports`
Tabela mestre com os esportes aceitos pelo sistema.
*   `name`: Nome amigável (ex: "Futebol 7", "Vôlei").
*   `slug`: Chave única estrutural (ex: `futebol-7`, `volei`).
*   `category_type`: Define se a modalidade segue regras normais ou dinâmicas de pontuação.
*   `icon_name`: Nome da biblioteca de ícones correspondente.

#### `cities`
Banco de apoio com as cidades cadastradas para localização dos clubes e eventos.
*   `name` / `state` / `slug`: Nome, Estado e URL simplificada da cidade.

---

### 2. Usuários e Autenticação

#### `users`
Centraliza todas as pessoas do sistema: Administradores de Clubes, Líderes de Equipes e Atletas.
*   `club_id`: Vincula o administrador ao clube correspondente (nulo se for super admin ou apenas atleta público).
*   `name` / `nickname`: Nome completo e o "Apelido" de jogo.
*   `email` / `password`: Credenciais de login.
*   `photo_path` / `photos`: URLs da foto de perfil do atleta.
*   `cpf` / `rg` / `document_number`: Documentação necessária para inscrições seguras.
*   `birth_date` / `gender`: Idade e Gênero (essenciais para enquadrar atletas nas categorias dos campeonatos).
*   `is_admin`: Flag booleana (`0` ou `1`) indicando se o usuário possui privilégios de gestão no painel interno.

---

### 3. Gestão de Campeonatos & Regras

#### `championships`
Armazena as configurações gerais de cada torneio ou evento criado.
*   `club_id`: O clube organizador.
*   `sport_id`: A modalidade do esporte.
*   `name`: Título do torneio (ex: "Copa Verão 2026").
*   `format`: **Formatos suportados** (`league` = Pontos Corridos, `knockout` = Mata-mata puro, `group_knockout` = Copa do Mundo/Grupos+Mata-mata, `racing` = Corrida de Rua individual, `time_ranking` = Cronômetro por Equipes, `double_elimination` = Dupla Eliminação).
*   `status`: Estado do evento (`draft`, `registrations_open`, `ongoing`, `finished`).
*   `start_date` / `end_date`: Duração geral.
*   `registration_start_date` / `registration_end_date`: Calendário das inscrições públicas.
*   `registration_type`: Se a inscrição é individual (`individual`) ou agrupada por equipes (`team`).
*   `allow_shopping_registration`: Habilita a oferta de produtos extras da loja durante o registro de atleta.
*   **Flags `include_*`**: Configurações que definem se gols, cartões, assistências cometidos na Repescagem ou no Mata-mata somam ou não no Ranking de Artilharia geral.
*   `tiebreaker_priority`: Regra de desempate personalizada definida pelo organizador.
*   `has_pcd_discount` / `has_elderly_discount`: Definições de descontos financeiros automáticos para PCD ou Idosos nas taxas de inscrição.

#### `categories`
Um único campeonato pode possuir várias subcategorias (ex: Campeonato de Futebol Sub-15 Masculino, Veterano Feminino, etc).
*   `championship_id`: Campeonato pai.
*   `name` / `description`: Título da categoria.
*   `min_age` / `max_age` / `gender`: Regras restritivas de idade mínima, máxima e sexo para validação automática na inscrição pública.
*   `price`: Valor em dinheiro cobrado para se inscrever nessa categoria específica.
*   `included_products`: Itens da loja já inclusos por padrão no valor da inscrição (ex: camiseta do evento).

---

### 4. Equipes e Atletas

#### `teams`
Representa as agremiações/equipes cadastradas. Uma equipe existe de forma global e pode se inscrever em diversos campeonatos ao longo do tempo.
*   `club_id`: O clube ao qual o time pertence ou onde foi criado.
*   `captain_id`: ID do usuário (`users`) responsável pelo time. É ele quem paga as inscrições e envia a lista de jogadores.
*   `name` / `city`: Nome do time e local de origem.
*   `logo_url` / `primary_color`: Escudo e identidade visual do time.

#### `championship_team`
Tabela pivô de inscrição. Registra a entrada de um **Time** em um **Campeonato** em uma determinada **Categoria**.
*   `championship_id` / `team_id` / `category_id`: Os três eixos da inscrição.
*   `group_name`: Qual grupo da primeira fase o time caiu (ex: Grupo A, Grupo B). Definido no sorteio automático ou manual.
*   `status_payment`: Situação financeira do time no campeonato (ex: `pending`, `paid`).
*   `payment_method`: Método de pagamento usado.
*   `gifts` / `shop_items`: Campos de texto em JSON guardando os brindes (ex: tamanhos de meias/camisetas) e itens extras comprados pelo time na inscrição.

#### `team_players`
Lista de atletas escalados pelo time especificamente para aquele campeonato.
*   `team_id` / `user_id` / `championship_id`: Associa o atleta à equipe naquele campeonato.
*   `position` / `number`: Posição tática e o número da camisa do jogador durante o torneio.
*   `is_approved`: Status de aprovação (para validação se o atleta foi liberado pela comissão do campeonato).

---

### 5. Módulo de Jogos Coletivos (Futebol, Futsal, Vôlei...)

#### `game_matches`
Centraliza todas as partidas geradas para as chaves ou tabelas de pontos corridos.
*   `championship_id` / `category_id`: Identifica de onde é esse jogo.
*   `home_team_id` / `away_team_id`: IDs das equipes adversárias.
*   `home_score` / `away_score`: Placar oficial do tempo normal.
*   `home_penalty_score` / `away_penalty_score`: Placar secundário de penalidades, se aplicável.
*   `status`: Andamento da partida (`scheduled`, `live`, `finished`).
*   `round_name` / `round_number`: Identifica o número da rodada (ex: "Rodada 1") ou a fase (ex: "Semifinal").
*   `is_knockout`: Flag de controle técnico (`1` se for jogo de eliminação/mata-mata, `0` se for fase de grupos).
*   `mvp_player_id`: ID do jogador eleito o "Craque do Jogo" (Most Valuable Player).
*   `match_details`: JSON complexo armazenando a súmula da partida de forma compactada para o frontend.

#### `match_events`
Log cronológico de tudo o que aconteceu no jogo para a geração de estatísticas automáticas.
*   `game_match_id`: O jogo onde ocorreu.
*   `team_id` / `player_id`: Quem cometeu a ação.
*   `event_type`: O tipo da ocorrência (`goal`, `yellow_card`, `red_card`, `blue_card`, `assist`, `point`, `ace`, `block`).
*   `game_time` / `period`: Tempo cronometrado e o período (1º tempo, 2º tempo, Tie-break).
*   `value`: O valor numérico do evento (ex: pontos no basquete valendo `2` ou `3`).

#### `match_sets`
Tabela de suporte utilizada em esportes com múltiplos sets (como Vôlei, Tênis, Beach Tennis).
*   `game_match_id`: Partida correspondente.
*   `set_number`: Sequência do set (1, 2, 3, 4, 5).
*   `home_score` / `away_score`: Placar específico deste set.

#### `mvp_votes`
Guarda o log de votações de usuários/torcedores do MVP do jogo.

---

### 6. Módulo de Corridas e Tempos

#### `races`
Configuração exclusiva para eventos de atletismo, ciclismo ou corridas de rua.
*   `championship_id`: Relacionamento 1-para-1 com a tabela principal de campeonatos.
*   `start_datetime`: Dia e hora da largada.
*   `location_name`: Ponto de partida/chegada.
*   `kits_info`: Orientações textuais sobre a retirada do kit do corredor.

#### `race_results`
Resultados finais dos competidores inscritos na corrida.
*   `race_id` / `user_id` / `category_id`: Quem correu e em qual categoria.
*   `bib_number`: Número de peito atribuído ao atleta.
*   `chip_id`: Identificador eletrônico do chip para cronometragem automática.
*   `net_time` / `gross_time`: Tempo Líquido (cronometrado da passagem do chip) e Tempo Bruto (da buzina da largada).
*   `position_general` / `position_category`: Rank de colocação geral e dentro da sua faixa etária/gênero.

#### `competitor_times`
Utilizado em competições cronometradas de pista ou por equipe (formato `time_ranking`).
*   `time_ms`: O tempo registrado do competidor, salvo nativamente em **milissegundos** inteiros para evitar perda de precisão no ordenamento de décimos de segundos.

---

### 7. Módulo Financeiro e E-commerce

#### `orders`
Centraliza os carrinhos de compras fechados no sistema, sejam inscrições diretas ou compras na lojinha do clube.
*   `user_id` / `club_id`: Quem comprou e para quem pagou.
*   `total_amount`: Valor bruto da venda.
*   `fee_platform` / `net_club`: Divisão automática da taxa da nossa plataforma e o lucro líquido enviado ao clube.
*   `status`: Situação da transação (`pending`, `paid`, `expired`).
*   `payment_id`: Referência gerada pelo Asaas/Stripe para checagem via webhook.

#### `order_items`
Itens que compõem a `order`.
*   `product_id`: O item comprado.
*   `category_id`: Caso o item seja uma inscrição esportiva, salva aqui qual foi a categoria adquirida.
*   `quantity` / `unit_price` / `subtotal`: Quantidades e valores na hora da compra.
*   `variants_chosen`: JSON guardando a variação escolhida pelo comprador (ex: cor, tamanho).

#### `products`
Lojinha virtual do clube.
*   `name` / `description` / `price`: Informações do item.
*   `type`: Tipo do produto (`kit_item`, `shirt`, `ticket`, `extra_product`).
*   `variants`: Campo JSON armazenando tamanhos e variações em estoque (ex: `["P", "M", "G", "GG"]`).

#### `coupons`
Cupons de desconto promocionais que diminuem o preço final na finalização da compra.
*   `code`: Código do cupom que o usuário digita (ex: `BEMVINDO10`).
*   `discount_type`: Tipo de desconto (`percentage` para porcentagem ou `fixed` para dinheiro fixo).
*   `discount_value`: O valor real do desconto.

---

### 8. Comunicação e Logística

#### `posts`
Módulo de Feed de Notícias e Redes Sociais para as páginas públicas de cada clube.
*   `title` / `content` / `image_url`: Dados visuais da postagem.
*   `is_published`: Flag para controle de rascunho ou publicação imediata.

#### `audit_logs`
Trilha de auditoria de segurança. Grava todas as modificações de dados sensíveis para histórico administrativo.
*   `user_id`: Quem realizou a operação.
*   `action`: Identificador do evento (ex: `championship.create`).
*   `description`: Texto legível explicando a ação.
*   `metadata`: JSON rico gravando quais campos foram alterados e o seu valor prévio para auditoria de histórico.

---

### 9. Infraestrutura Básica Framework (Laravel)

Estas tabelas pertencem ao ecossistema central do Laravel. Raramente devem ser editadas manualmente:
*   `migrations`: Registro de versionamento estrutural do banco.
*   `jobs` / `job_batches` / `failed_jobs`: Controle do sistema de Filas Assíncronas (ex: envio de emails em background, geração de artes em massa). 
    *   *Nota:* A tabela `jobs` no ambiente de produção tende a acumular tamanho físico se existirem tarefas aguardando ou em loop. O dump padrão ignora os dados dela, mantendo apenas sua estrutura leve.
*   `cache` / `cache_locks`: Banco rápido para armazenamento temporário e travas de concorrência nativas do framework.
*   `sessions`: Persistência de conexões ativas dos usuários pelo navegador.

---
**Dica de Ouro para o Novo Programador:** 
Toda vez que for programar uma regra de classificação (Tabela de Pontos) ou geração de mata-mata no frontend/backend, preste atenção extrema nos relacionamentos:
`Championship` ➔ `Category` ➔ `GameMatch` ➔ `MatchEvents`. 

Bom código! 🚀🏆
