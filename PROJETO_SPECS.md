# 📄 Especificações do Projeto App Esportivo

Este documento serve como um guia técnico e de arquitetura para a plataforma **App Esportivo**.

## 🏗️ Estrutura do Projeto

O projeto é dividido em duas partes principais:

1.  **Backend (Laravel):** Localizado na raiz do repositório.
2.  **Frontend (React/Vite):** Localizado na pasta `/frontend`.

---

## 🛠️ Requisitos de Instalação

### Backend (Ambiente Local)
-   **PHP 8.2+** (extensões: GD, Fileinfo, MySQL, Redis)
-   **Composer**
-   **MySQL 8.0+**
-   **Python 3.10+** (necessário para os recursos de IA de remoção de fundo)

### Frontend (Ambiente Local)
-   **Node.js 18+**
-   **npm** ou **yarn**

---

## 🚀 Como Executar



## 📂 Arquitetura do Sistema

### Módulos Principais
-   **Gestão de Clubes (Super Admin):** Criação de clubes, logs de auditoria e configurações globais.
-   **Campeonatos (Admin de Clube):** Gestão de inscrições, categorias por idade/sexo e sorteio de chaves.
-   **Súmula Digital:** Sistema dinâmico para esportes coletivos (Futebol, Vôlei, Basquete) e individuais (Tênis, Beach Tennis).
-   **Editor de Artes:** Criação de artes para redes sociais com templates customizáveis e pré-visualização.
-   **Corrida de Rua (Racing):** Módulo especializado com inscrição pública, integração de pagamento Asaas e entrega de kits.

### Banco de Dados (Destaques)
-   `users`: Armazena atletas, capitães e administradores. Possui campo `photos` (JSON) para múltiplas fotos.
-   `match_events`: Logs de tudo que acontece em uma partida (gols, pontos, início/fim de set).
-   `championship_team`: Tabela pivô com informações de pagamento e aceitação de termos para equipes.
-   `race_results`: Gerencia inscritos em corridas, vinculando à categoria e status de pagamento.

---

## 🔗 Integrações Externas

### Asaas (Pagamentos)
O sistema utiliza o Asaas para emissão de PIX, Cartão e Boleto. 
-   As configurações ficam em `clubs.payment_settings`.
-   A integração está centralizada no `App\Services\AsaasService`.

### OpenAI (Opcional/Futuro)
Há hooks preparados para utilização de GPT em relatórios de partidas ou geração de textos.

---

