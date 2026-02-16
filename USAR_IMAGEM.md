# Guia: Como Usar Imagens e Uploads (Solução Proxy)

Este documento explica a estratégia adotada para servir imagens de upload (especialmente as processadas por IA) e como resolver problemas de "Imagem Quebrada" ou 404 em produção.

## 🚨 O Problema

Em ambientes de produção com Docker, Coolify ou Proxies Reversos (Nginx/Traefik), é comum que o link simbólico `public/storage` -> `storage/app/public` não funcione corretamente ou que o servidor web não tenha permissão para ler arquivos criados dinamicamente por scripts externos (como o Python da IA).

**Sintoma:**
- O arquivo existe no disco (visto via logs).
- A URL gerada (`https://dominio.com/storage/players/foto.jpg`) retorna 404 Not Found ou 403 Forbidden.

## ✅ A Solução (Rota Proxy via API)

Para garantir que a imagem **sempre** carregue, independente da configuração do servidor web, nós criamos uma rota no Laravel que lê o arquivo e entrega o conteúdo manualmente.

### 1. A Rota (`routes/api.php`)
Existe uma rota dedicada para servir arquivos da pasta storage:
```php
// routes/api.php
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) abort(404);
    return response()->file($fullPath);
})->where('path', '.*');
```

### 2. No Controller (`ImageUploadController.php`)
Ao salvar/gerar a imagem, usamos a URL dessa rota em vez da URL estática padrão (`asset()`).

**Como era (Padrão Laravel - Pode falhar):**
```php
$url = asset('storage/' . $path); 
// Gera: https://dominio.com/storage/players/foto.jpg
// Depende do Nginx + Symlink estarem perfeitos.
```

**Como está agora (Garantido):**
```php
$url = url('api/storage/' . $path);
// Gera: https://dominio.com/api/storage/players/foto.jpg
// O PHP lê o arquivo e entrega. Funciona sempre.
```

## 🛠️ Manutenção e Permissões

Se o script Python (IA) criar arquivos, eles podem vir com permissões restritas (ex: root). O código PHP agora força a permissão correta após a criação:

```php
if (file_exists($outputAbsPath)) {
    @chmod($outputAbsPath, 0664); // Permite que o servidor web/www-data leia
}
```

## 🚀 Resumo para Debug Futuro

Se as imagens pararem de aparecer:
1. Verifique se a rota `/storage/{path}` existe em `api.php`.
2. Verifique se o Controller está usando `url('api/storage/' ...)` e não `asset()`.
3. Verifique se os arquivos nas pastas `storage/app/public/` têm permissão de leitura.
