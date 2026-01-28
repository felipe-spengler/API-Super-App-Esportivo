# Fluxo de Telas do App Esportivo

Este documento descreve o fluxo de navegação do aplicativo e as funcionalidades de cada tela.

## 1. Autenticação e Entrada

*   **Login (`/login`)**
    *   **Entrada:** E-mail/Telefone e Senha.
    *   **Botão "Entrar":** Valida credenciais. Sucesso -> Redireciona para **Home**.
    *   **Botão "Cadastre-se":** Redireciona para **Cadastro**.
    *   *Funcionalidades:* Autenticação segura, suporte a Dark Mode.

*   **Cadastro (`/register`)**
    *   **Passo 1: Validação de Identidade (OCR):** Escaneamento de RG/CNH via câmera ou galeria.
    *   **Passo 2: Formulário:** Dados preenchidos automaticamente (Nome, CPF, Data). Usuário completa E-mail e Senha.
    *   *Funcionalidades:* Validação de documentos via IA, criação de conta.

---

## 2. Abas Principais (Tabs)

O aplicativo possui uma navegação principal em abas na parte inferior.

### A. Home / Início (`(tabs)/index`)
*   **Seleção de Cidade/Clube:** Lista suspensa para escolher a cidade e o clube desejado.
*   **Dashboard do Clube (Visão Interna):**
    *   **Banner Principal:** Destaques (ex: "Copa Verão"). Clicar -> **Lista de Campeonatos**.
    *   **Acesso Rápido:**
        *   **Agenda:** -> **Calendário (`/agenda`)** (Próximos eventos geral).
    *   **Modalidades (Grid):** (Futebol, Vôlei, Corrida...). Clicar em um ícone -> **Lista de Campeonatos** filtrada por aquele esporte.

### B. Perfil (`(tabs)/profile`)
*   **Cabeçalho:** Foto (avatar), Nome e E-mail.
*   **Menu de Opções:**
    1.  **Editar Perfil:** -> **Edição (`/profile/edit`)** (Alterar Telefone. CPF e Data de Nascimento travados).
    2.  **Minhas Inscrições:** -> **Inscrições (`/inscriptions`)** (Histórico de campeonatos inscritos).
    3.  **Certificados:** -> **Certificados (`/certificates`)** (Download de certificados de participação).
    4.  **Configurações:** -> **Configurações (`/settings`)** (Tema Dark/Light, Notificações).
    5.  **Sair:** -> Realiza Logout e volta para **Login**.

---

## 3. Telas Internas (O "Miolo")

### Campeonatos e Eventos
*   **Lista de Campeonatos (`/championships`)**
    *   Lista todos os eventos disponíveis ou filtrados por esporte.
    *   Clicar em um evento -> **Detalhes do Evento**.

*   **Detalhes do Evento (`/championship-detail` ou `/race/[id]`)**
    *   *Varia conforme o tipo (Corrida vs Torneio).*
    *   **Infos:** Data, Local, Descrição, Mapa.
    *   **Botão "Inscrever-se":** -> **Fluxo de Inscrição (`/inscription`)**.
    *   **Botão "Resultados":** -> **Resultados (`/results`)**.
    *   **Botão "Galeria":** -> Fotos do evento.

*   **Inscrição (`/inscription/[id]`)**
    *   Seleção de Categoria.
    *   Pagamento (Pix/Cartão).
    *   Confirmação.

### Carteira e Loja
*   **Carteira (`/wallet`)**: Exibe QR Code para acesso físico ao clube.
*   **Loja (`/shop`)**: Lista produtos (Camisas, Bonés). Clicar -> Detalhes do Produto -> Carrinho -> Checkout.

---

## Legenda Técnica
*   **Dark Mode:** Todas as telas principais suportam alternância automática de tema.
*   **Backend:** Os dados de perfil e autenticação são sincronizados com a API Laravel.
