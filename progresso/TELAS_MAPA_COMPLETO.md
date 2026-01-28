# Mapa de Telas Atualizado (Frontend Mobile & Painel Web Admin)

Este documento descreve todas as telas do aplicativo "Super App Esportivo" e do Painel Administrativo.

## A. Aplicativo Mobile (Usuário/Atleta)

### 1. Fluxo Inicial & Autenticação
*   **A.1 WelcomeScreen**: Seleção de Cidade e Clube.
*   **A.2 AuthHub**:
    *   **A.2.1 LoginScreen**: Email/Senha.
    *   **A.2.2 RegisterScreen**: Criação de Conta + Upload OCR.
    *   **A.2.3 ForgotPasswordScreen**: Solicitar recuperação.
    *   **A.2.4 VerifyCodeScreen**: Validar código OTP.
    *   **A.2.5 ResetPasswordScreen**: Nova senha.
    *   **A.2.6 SuccessScreen**: Feedback positivo.

### 2. Navegação Principal
*   **A.3 HomeScreen**: Dashboard inicial.
*   **A.4 SportsHub**: Seletor de Esportes.
*   **A.5 ProfileScreen & Configs**: Inclui edição de perfil e troca de senha.

### 3. Fluxo de Eventos (Dashboard Dinâmico)
Separado por tipo de esporte.

#### Para Esportes de Time (Futebol/Vôlei)
*   **A.6 EventMenuScreen**: Menu do Campeonato.
*   **A.7 LeaderboardScreen**: Tabela de Classificação.
*   **A.8 StatisticsScreen**: Artilharia/Stats.
*   **A.9 TeamsListScreen**: Lista de Times.
*   **A.9.1 TeamDetailScreen**: Detalhe do Time.
*   **A.10 MatchesListScreen**: Lista de Jogos.
*   **A.10.1 MatchDetailScreen**: Placar ao vivo + Votação.

#### Para Esportes Individuais (Corrida)
*   **A.11 RaceEventScreen**: Home do Evento de Corrida.
*   **A.12 RaceResultsScreen**: Resultados e Tempos.

### 4. Fluxo de Pagamento (E-commerce)
*   **A.13 ProductListScreen**: Vitrine.
*   **A.14 ProductDetailScreen**: Detalhes e Variantes.
*   **A.15 CartScreen**: Carrinho.
*   **A.16 CheckoutScreen**:
    *   Resumo do Pedido.
    *   **Campo Cupom**: Validar código promocional e aplicar desconto.
    *   Pagamento Pix/Cartão.
*   **A.17 OrderSuccessScreen**: Recibo.

### 5. Histórico
*   **A.18 MyOrdersScreen**: Meus Pedidos.
*   **A.19 MyMatchesScreen**: Minhas Partidas.

### 6. Fluxos Específicos (Papéis Especiais)
*   **A.21 TeamManagementScreen** (Líder de Equipe): Convidar jogadores.

### 7. Área do Gestor (Club Admin no App)
*   **A.22 AdminHubScreen**: Menu rápido para o organizador.
*   **A.23 MobileLiveScore**: Súmula Digital Otimizada.
    *   **A.23.1. Súmula Vôlei**: Adaptada com Sets, Rotação e Tie-Break.
    *   **A.23.2. Súmula Tênis**: Adaptada para Games, Sets e Tie-Break simples.
    *   **A.23.3. Súmula Basquete**: Quartos, Faltas Coletivas, Pontos (1,2,3).
    *   **A.23.4. Súmula Lutas**: Cronômetro Combate + Pontos (Ippon/Wazari/Vantagem).
    *   **A.23.5. Cronometragem Corrida**: Input numérico de chegada + Tempo.
*   **A.24 QRCodeScanner**: Validar entrada de atletas/kits na portaria.


---


### B.1 Gestão de Eventos
*   **B.1 DashboardGeral**: Visão Geral.
*   **B.2 EventList**: Listagem.
*   **B.3 EventCreateWizard**: Criador de eventos passo-a-passo.

### B.2 Jogos e Súmulas
*   **B.4 MatchManagement**: Tabela de Jogos.
*   **B.5 LiveScoreControl**: Súmula Digital (Mesário).
    *   **Funcionalidades**: Contagem de Gols, Sets (Vôlei), Cartões, Substituições, MVP.
    *   **Controle**: Iniciar/Pausar/Encerrar partida.

### B.3 Gerador de Artes (Marketing)
*   **B.6 ArtGeneratorHub**: Galeria de Templates.
    *   *Templates*: "Atleta Confirmado", "Melhor da Partida", "Classificação", "Artilharia", "Confronto do Dia", "Resultado".
*   **B.7 ArtEditor**: Editor visual (Trocar foto de fundo, cores).

### B.4 Relatórios e Finanças
*   **B.8 InscriptionsReport**: Relatório de Inscritos.
*   **B.9 FinancialDashboard**: Gestão Financeira.
*   **B.14 CouponsManager**: Criar/Editar Cupons de Desconto e ver estatísticas de uso.
*   **B.10 FraudControl**: Validação de Docs.

### B.5 Configurações
*   **B.11 ClubSettings**: Dados do Clube.
*   **B.12 UserManagement**: Usuários e Permissões.
*   **B.13 RaceTimingManager**: Importar planilha de tempos/chips.

---

## C. Resumo Quantitativo do Projeto

Tabela final com a contagem de telas para dimensionar o esforço.

| Módulo | Tipo | Qtd. Telas Estimada |
| :--- | :--- | :--- |
| **Authentication** | Mobile | 7 Telas |
| **Navegação Core** | Mobile | 3 Telas |
| **Eventos (Times)** | Mobile | 7 Telas |
| **Eventos (Corrida)** | Mobile | 2 Telas |
| **E-commerce** | Mobile | 5 Telas |
| **Histórico** | Mobile | 2 Telas |
| **ADMIN: Eventos** | Web | 3 Telas |
| **ADMIN: Jogos** | Web | 2 Telas |
| **ADMIN: Artes** | Web | 2 Telas |
| **ADMIN: Financeiro** | Web | 3 Telas |
| **ADMIN: Configs** | Web | 2 Telas |
| **TOTAL GERAL** | - | **46 Telas (Completo)** |

*Nota: Algumas telas como "Sucesso" ou "Loading" podem ser modais ou componentes reaproveitados, mas para efeito de design/code contam como estados.*
