# 🧪 GUIA DE TESTES - PAINEL ADMIN

## 🚀 Como Iniciar

### Backend
```bash
cd backend
php artisan serve
```

### Mobile
```bash
cd mobile
npm start
```

---

## 📋 CHECKLIST DE TESTES

### 1. ✅ Autenticação e Permissões

#### Teste 1.1: Login como Super Admin
- [ ] Fazer login com `admin@admin.com` / `password`
- [ ] Selecionar qualquer clube
- [ ] Verificar que a tab "Admin" aparece
- [ ] Acessar `/admin` e ver o dashboard

#### Teste 1.2: Login como Club Admin
- [ ] Fazer login com `admin@toledao.com` / `password`
- [ ] Selecionar clube "Toledão"
- [ ] Verificar que a tab "Admin" aparece
- [ ] Tentar acessar dados de outro clube (deve bloquear)

#### Teste 1.3: Login como Atleta
- [ ] Fazer login com conta de atleta
- [ ] Verificar que a tab "Admin" NÃO aparece

---

### 2. ✅ Gerenciar Campeonatos

#### Teste 2.1: Criar Campeonato
- [ ] Ir em `/admin/championships`
- [ ] Clicar em "Novo Campeonato"
- [ ] Preencher:
  - Nome: "Campeonato Teste"
  - Esporte: Futebol
  - Data Início: Hoje
  - Data Fim: +30 dias
  - Local: "Campo Central"
- [ ] Salvar e verificar na lista

#### Teste 2.2: Editar Campeonato
- [ ] Clicar em um campeonato
- [ ] Editar o nome
- [ ] Salvar e verificar alteração

#### Teste 2.3: Deletar Campeonato
- [ ] Tentar deletar campeonato com partidas (deve bloquear)
- [ ] Deletar campeonato vazio (deve funcionar)

---

### 3. ✅ Gerenciar Equipes

#### Teste 3.1: Criar Equipe
- [ ] Ir em `/admin/teams`
- [ ] Clicar em "Nova Equipe"
- [ ] Preencher:
  - Nome: "Equipe Teste"
  - Cor Primária: #FF0000
  - Cor Secundária: #FFFFFF
- [ ] Salvar

#### Teste 3.2: Upload de Logo
- [ ] Editar equipe
- [ ] Fazer upload de logo (PNG/JPG)
- [ ] Verificar que a imagem aparece

#### Teste 3.3: Vincular ao Campeonato
- [ ] Adicionar equipe ao campeonato
- [ ] Verificar que aparece na lista de equipes do campeonato

---

### 4. ✅ Gerenciar Jogadores

#### Teste 4.1: Criar Jogador
- [ ] Ir em `/admin/players`
- [ ] Clicar em "Novo Jogador"
- [ ] Preencher dados completos
- [ ] Salvar

#### Teste 4.2: Buscar Jogador
- [ ] Usar a busca por nome
- [ ] Usar a busca por email
- [ ] Usar a busca por CPF

#### Teste 4.3: Upload de Foto
- [ ] Editar jogador
- [ ] Fazer upload de foto
- [ ] Verificar que aparece

---

### 5. ✅ Gerenciar Partidas

#### Teste 5.1: Criar Partida
- [ ] Ir em `/admin/matches`
- [ ] Clicar em "Nova Partida"
- [ ] Selecionar:
  - Campeonato
  - Equipe Casa
  - Equipe Visitante
  - Data/Hora
  - Local
- [ ] Salvar

#### Teste 5.2: Finalizar Partida
- [ ] Clicar em uma partida
- [ ] Clicar em "Finalizar"
- [ ] Definir placar (ex: 3x2)
- [ ] Salvar
- [ ] Verificar status mudou para "Finalizada"

#### Teste 5.3: Definir MVP
- [ ] Em uma partida finalizada
- [ ] Clicar em "Definir MVP"
- [ ] Selecionar jogador
- [ ] Salvar

---

### 6. ✅ Chaveamento Automático

#### Teste 6.1: Gerar Chaveamento Liga
- [ ] Criar campeonato com 4+ equipes
- [ ] Acessar opção de chaveamento
- [ ] Selecionar formato "Liga"
- [ ] Definir data início
- [ ] Gerar
- [ ] Verificar que todas as partidas foram criadas (todos contra todos)

#### Teste 6.2: Gerar Chaveamento Mata-Mata
- [ ] Criar campeonato com 8 equipes
- [ ] Selecionar formato "Mata-Mata"
- [ ] Gerar
- [ ] Verificar primeira rodada (4 partidas)

#### Teste 6.3: Avançar Fase
- [ ] Finalizar todas as partidas da rodada 1
- [ ] Clicar em "Avançar Fase"
- [ ] Verificar que rodada 2 foi criada com os vencedores

#### Teste 6.4: Sortear Equipes
- [ ] Clicar em "Sortear"
- [ ] Verificar que a ordem das equipes mudou

---

### 7. ✅ Súmulas Digitais

#### Teste 7.1: Acessar Súmula
- [ ] Ir em uma partida
- [ ] Clicar em "Súmula"
- [ ] Verificar que abre o seletor de súmula
- [ ] Clicar em "Abrir Súmula Automática"
- [ ] Verificar que abre a súmula correta do esporte

#### Teste 7.2: Preencher Súmula de Futebol
- [ ] Adicionar gol (time, jogador, minuto)
- [ ] Adicionar cartão amarelo
- [ ] Adicionar cartão vermelho
- [ ] Salvar
- [ ] Verificar que eventos foram salvos

#### Teste 7.3: Preencher Súmula de Vôlei
- [ ] Adicionar sets (25x23, 25x20, etc)
- [ ] Definir vencedor
- [ ] Salvar

---

### 8. ✅ Premiações

#### Teste 8.1: Definir Artilheiro
- [ ] Ir em `/admin/awards`
- [ ] Selecionar campeonato
- [ ] Escolher "Artilheiro"
- [ ] Selecionar jogador
- [ ] Salvar

#### Teste 8.2: Definir Melhor Goleiro
- [ ] Escolher "Melhor Goleiro"
- [ ] Selecionar jogador
- [ ] Fazer upload de foto da premiação
- [ ] Salvar

---

### 9. ✅ Categorias

#### Teste 9.1: Criar Categoria
- [ ] Acessar campeonato
- [ ] Ir em "Categorias"
- [ ] Criar categoria "Sub-17"
- [ ] Definir idade mínima: 15
- [ ] Definir idade máxima: 17
- [ ] Salvar

#### Teste 9.2: Vincular Equipes
- [ ] Adicionar equipe à categoria
- [ ] Verificar que aparece na lista

#### Teste 9.3: Deletar Categoria
- [ ] Tentar deletar categoria com equipes (deve bloquear)
- [ ] Remover todas as equipes
- [ ] Deletar categoria (deve funcionar)

---

### 10. ✅ Scanner QR Code

#### Teste 10.1: Validar Carteirinha
- [ ] Ir em `/admin/scan`
- [ ] Permitir acesso à câmera
- [ ] Escanear QR Code de carteirinha
- [ ] Verificar informações do atleta

---

## 🐛 TESTES DE VALIDAÇÃO

### Validação 1: Campos Obrigatórios
- [ ] Tentar criar campeonato sem nome (deve bloquear)
- [ ] Tentar criar partida sem equipes (deve bloquear)
- [ ] Tentar criar jogador sem dados (deve bloquear)

### Validação 2: Permissões
- [ ] Como club admin, tentar acessar campeonato de outro clube (deve bloquear)
- [ ] Como club admin, tentar editar equipe de outro clube (deve bloquear)

### Validação 3: Integridade
- [ ] Tentar deletar equipe com partidas (deve bloquear)
- [ ] Tentar deletar campeonato com partidas (deve bloquear)
- [ ] Tentar deletar categoria com equipes (deve bloquear)

---

## 📊 TESTES DE PERFORMANCE

### Performance 1: Listagens
- [ ] Listar 100+ campeonatos (deve ser rápido)
- [ ] Listar 500+ partidas (deve paginar)
- [ ] Buscar jogadores (deve ser instantâneo)

### Performance 2: Upload
- [ ] Upload de imagem 2MB (deve funcionar)
- [ ] Upload de imagem 5MB (deve bloquear)

---

## ✅ CHECKLIST FINAL

- [ ] Todos os CRUDs funcionam
- [ ] Validações estão ativas
- [ ] Permissões estão corretas
- [ ] Upload de imagens funciona
- [ ] Chaveamento gera partidas
- [ ] Súmulas salvam dados
- [ ] Scanner lê QR Codes
- [ ] Premiações são salvas
- [ ] Categorias gerenciam equipes

---

## 🎉 SISTEMA TESTADO E APROVADO!

Se todos os testes passarem, o sistema está pronto para produção! 🚀
