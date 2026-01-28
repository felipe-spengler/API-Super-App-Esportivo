# Catálogo de Modalidades Suportadas

Este documento define quais esportes o sistema suporta e como eles são tecnicamente classificados.
**Lógica de Negócio**: O sistema global tem TODAS essas modalidades cadastradas. Cada Clube contrata/ativa apenas as que deseja usar.

## Classificação Técnica das Modalidades

O sistema divide os esportes em 4 grandes "Arquétipos". Isso facilita o desenvolvimento, pois todos os esportes do mesmo tipo funcionam quase igual (só muda regras de ponto).

### 1. Esportes de Time / Placar (Team Sports)
Característica: Dois times/lados se enfrentam. O resultado é definido por Gols, Pontos ou Sets.
*   **Futebol de Campo** (11 vs 11) - *Regra: Gols, Cartões, Tempo 45min*.
*   **Futsal** (5 vs 5) - *Regra: Gols, Cartões, Tempo Cronometrado*.
*   **Futebol Sete / Society** (7 vs 7) - *Regra: Gols, Cartões*.
*   **Vôlei de Quadra** - *Regra: Sets (25pts), Tie-break, Rotação*.
*   **Futevôlei** - *Regra: Sets (18pts ou 21pts), Duplas*.
*   **Beach Tennis** - *Regra: Sets/Games (15/30/40), Duplas*.
*   **Vôlei de Praia** - *Regra: Sets (21pts), Duplas*.
*   **Basquete** - *Regra: Pontos (1,2,3), Quartos de Tempo, Faltas Coletivas*.
*   **Handebol** - *Regra: Gols*.

### 1B. Esportes de Combate (Combat Sports)
Característica: 1 vs 1, cronômetro de combate e pontuação técnica.
*   **Jiu-Jitsu / Judô**: Lutas, chaveamento, pontuação específica (Ippon, Wazari).
*   **Boxe / Muay Thai**: Rounds, Pontos dos Juízes.

### 2. Esportes de Corrida / Tempo (Racing Sports)
Característica: Todos competem ao mesmo tempo. O resultado é definido por Tempo ou Ordem de Chegada.
*   **Corrida de Rua (Running)**: 5km, 10km, 21km, 42km.
*   **Ciclismo de Estrada (Road Bike)**: Distância/Tempo.
*   **Mountain Bike (MTB)**: Categorias Pro/Amador, x voltas ou km.
*   **Natação (Águas Abertas)**: Travessias.
*   **Duathlon / Triathlon**: Combinados (nada, pedala, corre).

### 3. Esportes Individuais de Confronto (Combat/Individual Match)
Característica: 1 vs 1, estilo chaveamento (mata-mata).
*   **Tênis de Mesa (Ping-Pong)**: Sets.
*   **Tênis de Campo**: Sets/Games.
*   **Jiu-Jitsu / Judô / Taekwondo**: Lutas, chaveamento, pontuação específica.
*   **Xadrez**: Partidas 1vs1.

### 4. Esportes de Pontuação/Performance (Score Sports)
Característica: Cada um faz sua apresentação e recebe uma nota.
*   **Skate**: Notas dos juízes.
*   **Ginástica Rítmica**: Notas.
*   **Crossfit**: WODs (tempo ou repetições).

---

## Como funciona a Venda para o Clube?

No Banco de Dados Global, teremos a tabela `modalidades_disponiveis` com todos os itens acima.
E teremos a tabela `clube_modalidades` (tabela de ligação).

**Exemplo Prático**:

1.  **Clube Toledão (Pacote "Verão")**:
    *   Futebol Sete
    *   Futevôlei
    *   Beach Tennis
    *   Natação (Piscina)

2.  **Associação de Corredores (Pacote "Racing")**:
    *   Corrida de Rua
    *   MTB
    *   Duathlon

3.  **Complexo Esportivo X (Pacote "Completo")**:
    *   Futsal
    *   Vôlei
    *   Tênis de Mesa
    *   Xadrez

**No App do Usuário**:
Quando ele entra no "Clube Toledão", o menu de ícones só mostra os 4 ícones contratados. O ícone de MTB fica oculto.
