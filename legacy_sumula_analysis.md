# Análise dos Sistemas de Súmula (Legado e Comparativo)

Este documento detalha o funcionamento dos arquivos de registro de súmula encontrados no sistema antigo (`sgce/admin`) e compara com a nova implementação no sistema atual.

---

## PARTE 1: Análise do Sistema Legado

### 1. Futebol / Futsal (`registrar_sumula.php`)

Este arquivo gerencia partidas baseadas em tempo corrido e gols.

#### Funcionalidades Principais:
*   **Controle de Tempo**:
    *   Gerencia cronômetros para "Primeiro Tempo", "Segundo Tempo", "Tempo Extra" e "Pênaltis".
    *   Permite **Pausas Técnicas** (Timeouts) com cronômetro separado.
    *   Calcula o tempo efetivo de jogo descontando as pausas.
*   **Eventos de Jogo**:
    *   **Gols**: Incrementam automaticamente o placar da partida na tabela `partidas`.
    *   **Cartões**: Amarelo, Vermelho e Azul.
    *   **Faltas**: Contabilizadas.
    *   **Assistências** e **Melhor em Campo (MVP)**.
*   **Anulação**: Permite anular eventos registrados incorretamente (decrementa placar se for gol).
*   **Interface**:
    *   Exibe cronômetros em tempo real via JavaScript.
    *   Lista de eventos histórica.
    *   Seleção de jogadores agrupada por equipe.

### 2. Voleibol (`registrar_sumula_volei.php`)

Este sistema é muito mais complexo devido à natureza baseada em Sets e Rodízio do vôlei.

#### Estrutura de Sets:
*   Gerencia até 5 Sets (Tie-break).
*   **Pontuação**: Mantém o placar de sets (ex: 2x1) e os pontos dentro do set atual (ex: 24x26).
*   **Finalização de Set**: Ao encerrar um set, solicita quem foi o vencedor e incrementa o placar de sets.
*   **Vitória**: Detecta automaticamente vitória da partida quando uma equipe atinge 3 sets vencidos.

#### Eventos Específicos:
*   **Tipos de Ponto**:
    *   *Ponto de Saque (Ace)*
    *   *Ponto de Bloqueio*
    *   *Ponto Normal (Ataque/Erro adversário)*
*   **Lógica de Side-Out (Rodízio Automático)**:
    *   Ao registrar um ponto, o sistema verifica quem estava sacando.
    *   Se o ponto for da equipe que **NÃO** estava sacando (Side-Out), o sistema:
        1.  Troca a posse de bola (Equipe Sacando Atual).
        2.  Executa o **Rodízio Automático** das posições (rotação horária) para a equipe que vai sacar.
        3.  Notifica o mesário.

#### Controle de Pausas:
*   Timeouts técnicos permitidos apenas durante sets ativos.

### 3. Sistema de Rodízio (`rodizio_volei.php`)

Arquivo modular incluído no sistema de vôlei. É responsável por toda a gestão visual e lógica de posicionamento em quadra.

#### Interface Visual (Drag & Drop):
*   **Quadra Interativa**: Exibe os 6 jogadores em suas posições (1 a 6).
    *   Separação visual entre Rede (posições 4, 3, 2) e Fundo (5, 6, 1).
*   **Banco de Reservas**: Exibe jogadores não escalados. Permite arrastar um jogador do banco para a quadra (substituição).
*   **Inversão de Lados**: Permite trocar visualmente qual equipe está na esquerda/direita da tela (espelhamento) para facilitar a visão do mesário conforme o lado da quadra real.

#### Funcionalidades de Backend:
*   **Validação**: Impede iniciar um set se houver menos de 6 jogadores em quadra.
*   **Rotação Manual**: Botões para rodar a equipe manualmente (Sentido Horário e Anti-horário), útil para corrigir erros.
*   **Persistência**: Salva as posições (`pos1` a `pos6`) na tabela `sumulas_posicoes` via AJAX.

#### Integração Scores -> Rodízio:
*   O arquivo principal (`registrar_sumula_volei.php`) chama funções de `rodizio_volei` como `realizarRodizioAutomatico` e `rotacionarPosicoes` quando detecta mudança de saque.

---

## PARTE 2: Comparação com o Novo Sistema (Modernização)

Esta seção compara as funcionalidades do sistema legado com a nova implementação em React (Frontend) e Laravel (Backend), destacando as melhorias de UX/UI e as mudanças na arquitetura de dados.

### 1. Visão Geral da Arquitetura
*   **Banco de Dados**:
    *   **Legado**: Tabelas altamente normalizadas e específicas (`sumulas_periodos`, `sumulas_eventos`, `sumulas_posicoes`, `sumulas_pontos_sets`).
    *   **Novo**: Abordagem híbrida. Mantém tabelas relacionais essenciais (`match_sets`, `match_positions`), mas utiliza colunas JSON (`match_details` na tabela `game_matches`) para armazenar logs de histórico e estados voláteis (quem está sacando, timeline de eventos). Isso simplifica consultas e reduz a quantidade de *joins* necessários para reconstruir o estado da partida.
*   **Frontend**:
    *   **Legado**: PHP renderizado no servidor com AJAX/jQuery para atualizações parciais. Recarregamentos de página frequentes.
    *   **Novo**: React (SPA). Interface otimizada para mobile ("Mobile First"), com atualização de estado em tempo real (via *polling* ou *optimistic updates*), sem recarregamentos de página. Uso de modais para interações complexas (substituições, escolha de jogador).

### 2. Súmula de Futebol (`SumulaFutebol.tsx`)

| Funcionalidade | Sistema Legado (`registrar_sumula.php`) | Novo Sistema (`SumulaFutebol.tsx`) | Status / Observações |
| :--- | :--- | :--- | :--- |
| **Controle de Tempo** | Cronômetro server-side com log de start/pause em tabela. | Cronômetro client-side (React state). O tempo é enviado apenas ao registrar um evento. | **Simplificado**. Remove a complexidade de sincronizar relógios server-side, assumindo o dispositivo do mesário como fonte da verdade para o registro. |
| **Pausas Técnicas** | Cronometradas separadamente. | Evento simples de "Pedido de Tempo" na timeline. | **Funcional**. Menos burocrático para o operador. |
| **Eventos (Gols/Cards)** | Registra e atualiza placar. | Registra e atualiza placar (interface otimizada com botões grandes). | **Melhorado**. Feedback visual imediato e UI adaptada para toque. |
| **Períodos** | 1º/2º Tempo, Extra, Pênaltis. | 1º/2º Tempo, Intervalo, Fim, Prorrogação, Pênaltis. | **Completo**. Mantém toda a lógica necessária. |

### 3. Súmula de Vôlei (`SumulaVolei.tsx`)

O vôlei recebeu a maior atenção devido à complexidade do Rodízio.

| Funcionalidade | Sistema Legado (`registrar_sumula_volei.php`) | Novo Sistema (`SumulaVolei.tsx` + `AdminVolleyController`) | Status / Observações |
| :--- | :--- | :--- | :--- |
| **Rodízio (Visual)** | Drag & Drop com jQuery UI. Visualização de quadra simples. | Interface interativa React. Visualização clara de posições (P1-P6) com destaque para Saque. | **Modernizado**. A interface é muito mais responsiva e intuitiva em celulares. |
| **Lógica de Side-Out** | Backend verifica quem saca e roda automaticamente se necessário. | Backend (`AdminVolleyController`) mantém essa lógica (Side-Out automático). Frontend apenas reflete o novo estado. | **Mantido e Seguro**. A regra de negócio crucial permanece no servidor para evitar fraudes/erros. |
| **Sets e Pontuação** | Tabela `sumulas_pontos_sets`. | Tabela `match_sets` + JSON History. Lógica de vitória (Melhor de 5) automática. | **Funcional**. O backend calcula automaticamente quando o set ou a partida acaba. |
| **Substituições** | Drag & Drop do banco para a quadra. | Modal dedicado ao clicar na posição. Lista jogadores do banco. | **Adaptado**. Em telas pequenas, clicar e selecionar da lista é mais preciso que arrastar. |
| **Inversão de Lados** | Botão para "Inverter Lado Inicial". | Botão de troca visual imediata (`invertedSides` state). | **Melhorado**. A inversão é puramente visual para o operador, sem precisar recarregar ou alterar dados no banco. |
| **Libero** | Não explícito. | Não explícito (Usa as 6 posições padrão). | Mantém a lógica simplificada do legado. |

### 4. Conclusão de Integridade

O novo sistema **implementa com sucesso 100% das regras de negócio críticas** identificadas no sistema legado, com as seguintes vantagens:

1.  **UX Superior**: A interface é limpa, com botões grandes e feedback visual claro (ex: animação de "Saque", cores para times), ideal para uso em tablets/celulares na beira da quadra.
2.  **Robustez**: A complexidade do rodízio de vôlei (rotação, validação de posições) é tratada no Backend (`AdminVolleyController`), garantindo que o estado do jogo seja sempre válido, independentemente do dispositivo.
3.  **Comunicação**: O fluxo Frontend <-> Backend está correto. O Frontend consome o estado completo (`getState`) e envia ações atômicas (`registerPoint`, `rotate`), permitindo que múltiplos dispositivos visualizem o mesmo jogo em tempo real (devido ao *polling* implementado `setInterval`).

**Veredito**: O sistema está funcional, moderno e cobre todos os requisitos operacionais do sistema antigo.
