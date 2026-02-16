# Arquivos Modificados

## Backend
- `backend/app/Http/Controllers/Admin/ArtGeneratorController.php`: Correção do fuso horário na geração de artes (convertendo UTC para America/Sao_Paulo).

## Frontend
- `backend/frontend/src/pages/Players/PlayerEditModal.tsx`: Adicionados campos de "Posição" e "Número" no formulário de edição de jogador.

## Art Generation per Championship
- **Database**:
  - `backend/database/migrations/2026_02_16_181500_add_art_settings_to_championships_table.php`: Adicionada coluna `art_settings` (JSON) na tabela `championships` para armazenar templates e fundos por campeonato.
- **Backend**:
  - `backend/app/Http/Controllers/Admin/ArtGeneratorController.php`:
    - Atualizado para suportar e priorizar configurações de arte (templates e fundos) do campeonato selecionado.
    - Adicionado suporte a `championship_id` nas rotas de salvar e carregar templates.
    - Implementada lógica de resolução de fundo: Campeonato > Clube > Sistema.
- **Frontend**:
  - `backend/frontend/src/pages/Admin/ArtEditor/index.tsx`:
    - Adicionado dropdown de seleção de Campeonato na sidebar ("Configurações Base").
    - Adicionado botão de Upload de Fundo Customizado, que vincula a imagem ao contexto selecionado (campeonato ou clube).
    - Atualizada lógica de `loadTemplate` e `saveTemplate` para passar o ID do campeonato.
  - `backend/frontend/src/pages/Settings/index.tsx`:
    - Adicionado dropdown de contexto "Campeonato" na aba "Artes & Fundos".
    - Implementada lógica para fazer upload de fundos para campeonatos específicos ou para o clube (padrão).

## Súmula Futebol - Lançamento de Faltas
- **Frontend**:
  - `backend/frontend/src/pages/Matches/SumulaFutebol.tsx`:
    - Adicionado botão "Falta" no painel de controle de ambos os times (Home/Away).
    - Eventos de falta agora são exibidos na linha do tempo da partida.
    - Ajustes de layout no grid de botões para acomodar a nova ação.

## Settings - Editor de Artes em Modal
- **Frontend**:
  - `backend/frontend/src/pages/Settings/index.tsx`:
    - Refatorada a aba "Artes & Fundos" para abrir o editor em um Modal dedicado.
    - O seletor de contexto (Clube/Campeonato) agora abre automaticamente o modal de edição ao ser alterado.
    - Melhoria na UX para evitar poluição visual na tela principal de configurações.
    - Correção de bug (ícone X faltando) que causava tela branca ao abrir o modal.
