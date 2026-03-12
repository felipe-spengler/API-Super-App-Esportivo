# 🏆 App Esportivo: Contexto e Funcionalidades

Este documento detalha o propósito, o contexto de negócio e as funcionalidades principais do sistema **App Esportivo**.

---

## 🌟 1. Visão Geral e Contexto
O **App Esportivo** nasceu da necessidade de modernizar a gestão de eventos esportivos amadores e profissionais. Muitas ligas ainda utilizam processos manuais (papel, planilhas) para súmulas, inscrições e divulgação. Esta plataforma centraliza toda a jornada do evento: desde a abertura das inscrições até a geração automática de artes de premiação.

### Objetivos Principais:
- **Centralização:** Um único local para gerir atletas, pagamentos e placares.
- **Engajamento:** Facilitar a divulgação dos resultados em redes sociais.
- **Transparência:** Placares em tempo real e histórico estatístico para os atletas.
- **Profissionalismo:** Identidade visual automatizada e processos validados (como CPF e idade).

---

## 🛠️ 2. Módulos e Funcionalidades

### A. Gestão de Campeonatos (Multi-esporte)
O coração do sistema permite criar competições com regras altamente customizáveis.
- **Formatos:** Suporte para Fases de Grupos, Eliminatórias (Mata-mata) com brackets, e Pontos Corridos.
- **Categorias:** Definição de regras por gênero (Masculino, Feminino, Misto) e idade (Mínima/Máxima).
- **Inscrições:** Sistema de aceite de termos, upload de documentos e controle de vagas (número máximo de times).

### B. Módulo de Corridas (Racing)
Um módulo especializado para corridas de rua e trilha.
- **Inscrição Pública:** Fluxo otimizado para atletas sem necessidade de login prévio.
- **Regra de Idade Esportiva:** Cálculo de categoria baseado na idade do atleta em 31/12 do ano do evento.
- **Logística de Kits:** Gestão de entrega de kits e seleção de tamanhos/brindes.
- **Acompanhamento:** Página pública para o atleta consultar o status da inscrição via CPF.

### C. Súmula Digital (Real-time)
Substitui o papel por uma interface dinâmica para o mesário/árbitro.
- **Futebol 7/Futsal:** Gols, cartões (Amarelo, Azul, Vermelho), faltas acumuladas e tempos técnicos.
- **Tênis / Beach Tennis:** Controle detalhado de Sets, Games e Tie-break, com histórico de placar.
- **Vôlei e Basquete:** Pontuação set a set adaptada às regras de cada modalidade.
- **Eventos:** Registro de cada ação (ex: "Ponto de erro do adversário") com timestamp.

### D. Editor de Artes e IA (Marketing)
O diferencial competitivo do sistema para gerar engajamento.
- **Geração Automática:** Criação de artes de "Próximo Jogo", "Resultado da Partida" e "MVP".
- **Remoção de Fundo (IA):** Recorte profissional das fotos dos atletas para as artes de destaque.
- **Templates de Clube:** Cada clube pode ter sua identidade visual (cores, fontes e logos) refletida nas artes geradas.

### E. Financeiro e Loja
- **Pagamentos Integrados:** Emissão de cobranças via PIX ou Cartão através do Asaas.
- **Cupons e Descontos:** Aplicação de descontos para Idosos, PCDs ou cupons promocionais.
- **Shopping:** Venda de produtos extras (camisetas, bonés) durante a inscrição ou separadamente.

---

## 👤 3. Perfis de Usuário

1.  **Super Admin:** Gestão de hospedagem, criação de novos Clubes/Ligas e auditoria global do sistema.
2.  **Admin de Clube/Liga:** Organiza seus próprios campeonatos, gerencia os times inscritos e configura a identidade visual.
3.  **Capitão de Equipe:** Gerencia o elenco do seu time, faz o pagamento da inscrição coletiva e adiciona atletas.
4.  **Atleta / Público:** Consulta tabelas, classificaçao, placares ao vivo e realiza inscrições individuais.

---

## 🚀 4. Diferenciais Tecnológicos
- **Real-time:** Atualização de placares sem necessidade de atualizar a página (WebSockets/Reverb).
- **Mobile First:** Interface pensada para ser usada na beira do campo/quadra via smartphone.
- **Ficha Médica e Documental:** Armazenamento seguro de fotos de documentos e dados de saúde dos atletas.

---

*Este documento reflete o estado atual do sistema em Março de 2026.*
