
# Guia de Implantação: Separação de Elencos por Campeonato

Este guia descreve os passos necessários para implantar e validar a funcionalidade de elencos separados por campeonato.

## 1. Migrações de Banco de Dados

Existem duas migrações críticas que devem ser executadas **nesta ordem**.

### Migração A: Adicionar Coluna (Estrutural)
Esta migração adiciona a coluna `championship_id` na tabela `team_players`.

- **Arquivo:** `2026_02_11_120000_add_championship_id_to_team_players_table.php`
- **Comando:** `php artisan migrate`

### Migração B: Migrar Dados Existentes (Script de Dados)
Esta migração é o "script" que garante que os dados existentes não sejam perdidos. Ela copia todos os jogadores "globais" (sem campeonato) para todos os campeonatos que o time participa atualmente.

- **Arquivo:** `2026_02_11_123000_migrate_global_players_to_championships.php`
- **Lógica:**
    1. Busca todos os vínculos de jogadores que não têm `championship_id`.
    2. Para cada time desses jogadores, verifica em quais campeonatos o time está inscrito.
    3. Cria uma cópia do vínculo do jogador para CADA campeonato encontrado.
- **Resultado:** Se o time "Flamengo" tem o jogador "Gabigol" e joga o "Brasileirão" e a "Copa do Brasil", após essa migração existirão 3 registros:
    - Gabigol (Global)
    - Gabigol (Brasileirão)
    - Gabigol (Copa do Brasil)
- **Comando:** (Executado automaticamente junto com o anterior se rodar `php artisan migrate`, ou isoladamente).

## 2. Implantação de Código (Backend & Frontend)

Atualizar os arquivos no servidor:

### Backend
- `app/Http/Controllers/TeamController.php` (Lógica de adicionar jogador com contexto)
- `app/Http/Controllers/Admin/AdminTeamController.php` (Lógica de listar/remover com contexto)

### Frontend
- `src/pages/Teams/TeamDetails.tsx` (Nova interface de seleção de contexto e gestão)
- `src/pages/Championships/AdminTeamChampionshipManager.tsx` (Passagem de estado na navegação)

## 3. Validação Pós-Implantação

1.  **Acesse um Time via Menu "Times" (Global)**
    - Verifique se a lista de jogadores aparece (são os jogadores globais/originais).
    - Eles devem aparecer na opção "Base Geral".

2.  **Acesse um Campeonato > Gerenciar Times > Ver Time**
    - O sistema deve abrir diretamente no contexto do campeonato.
    - Verifique se os jogadores aparecem. Graças à Migração B, os jogadores antigos devem estar lá.

3.  **Adicionar um Jogador Novo em um Campeonato**
    - Adicione um jogador enquanto estiver visualizando o contexto de um campeonato específico.
    - Volte para a "Base Geral" ou outro campeonato. O novo jogador NÃO deve aparecer lá.

## Resumo para o Usuário
Para garantir que não haja problemas com os dados atuais: **Basta rodar as migrations**. O script de migração de dados incluído cuidará de duplicar os vínculos existentes para os campeonatos ativos.
