# Guia de Resolução de Problemas: Upload de Imagens

Este guia foi criado para ajudar a resolver os problemas recorrentes com upload de imagens (jogadores, times, campeonatos) no sistema.

## 1. Como Funciona o Upload

O fluxo de upload segue os seguintes passos:

1.  **Frontend**: O usuário envia a imagem via formulário (`FormData`).
2.  **Backend (Laravel)**:
    *   Recebe o arquivo.
    *   Verifica permissões (Se é Admin, Dono do Clube ou Capitão do Time).
    *   **Opcional**: Se "Remover Fundo" estiver marcado, chama um script Python (`scripts/remove_bg.py`) para processar a imagem.
    *   Salva o arquivo na pasta `storage/app/public/` (ex: `players/foto.jpg`).
    *   Salva o caminho no banco de dados.
3.  **Visualização**:
    *   O frontend recebe a URL da imagem.
    *   A imagem é servida através do link simbólico `public/storage`.

---

## 2. Problemas Comuns e Soluções

### ❌ Erro 500 (Tela Vermelha / "Request failed")

Geralmente indica um erro no código do servidor ou falha no script de IA.

*   **Causa 1 (IA Falhando):** O script Python de remover fundo pode estar travando ou demorando muito.
    *   *Solução:* Tente subir a foto desmarcando a opção "Remover Fundo com IA". Se funcionar, o problema é no script ou memória do servidor.
*   **Causa 2 (Permissões de Pasta):** O Laravel não consegue escrever na pasta `storage`.
    *   *Solução:* Verificar permissões da pasta `storage` e `bootstrap/cache` (devem ser 775 ou 777).

### 🚫 Erro 403 (Forbidden / "Você não tem permissão")

Acontece quando você tenta editar um jogador ou time que não "pertence" ao seu escopo.

*   **Regra de Ouro:** Um **Admin do Clube** só pode editar jogadores que:
    1.  Tenham o `club_id` igual ao do Admin.
    2.  OU estejam em um time (`team_id`) que pertença ao Clube do Admin.
*   *Correção Recente:* Atualizamos o sistema para ser mais flexível. Se o jogador não tem clube definido, mas está no time do seu clube, você PODE editar a foto.

### 🖼️ Imagem Quebrada (404 Not Found)

Você faz o upload, diz "Sucesso", mas a imagem não aparece (ícone de arquivo quebrado).

*   **Causa Principal:** O Link Simbólico do Storage não existe ou está errado.
*   **Solução:**
    1.  Acesse o terminal do servidor.
    2.  Rode: `php artisan storage:link`.
    3.  Se disser que já existe, mas não funciona, tente remover e recriar:
        ```bash
        rm public/storage
        php artisan storage:link
        ```

### 🐢 Upload Lento ou Timeout

*   **Causa:** Imagens muito grandes ou Internet lenta.
*   **Solução:** O sistema tem um limite de tempo. Tente usar imagens menores (abaixo de 2MB) ou redes mais rápidas. O processamento de IA adiciona 5-10 segundos ao tempo de upload.

---

## 3. Checklist Rápido para "Upload travado"

1.  [ ] **Refresh na Página:** Dê um `Ctrl + F5` para limpar cache antigo do navegador.
2.  [ ] **Tamanho do Arquivo:** A imagem tem menos de 5MB?
3.  [ ] **Formato:** É JPG ou PNG? (WebP ou HEIC podem dar erro em alguns navegadores antigos).
4.  [ ] **Log do Servidor:** Se der Erro 500, verifique o arquivo `storage/logs/laravel.log`.

---

## 4. Estrutura de Pastas (Para Desenvolvedores)

*   `storage/app/public/players`: Fotos de jogadores.
*   `storage/app/public/teams`: Logos de times.
*   `storage/app/public/championships`: Logos/Banners de campeonatos.
*   `scripts/remove_bg.py`: Script Python para IA (Requer bibliotecas instaladas: `rembg`, `Pillow`).
