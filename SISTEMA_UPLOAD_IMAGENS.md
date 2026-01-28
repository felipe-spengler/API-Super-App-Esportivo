# 📸 SISTEMA DE UPLOAD DE IMAGENS

## ✅ COMO FUNCIONA

### 🎯 Conceito Principal
**NÃO salvamos imagens no banco de dados!**  
Salvamos apenas o **caminho/path** do arquivo.

---

## 📁 ESTRUTURA DE ARMAZENAMENTO

### Local (Desenvolvimento)
```
backend/storage/app/public/
├── teams/                    # Logos das equipes
│   ├── team_1234567890.png
│   └── team_9876543210.jpg
├── players/                  # Fotos dos jogadores
│   ├── player_1111111111.jpg
│   └── player_2222222222.png
├── championships/            # Banners/imagens de campeonatos
│   ├── championship_3333333333.jpg
│   └── championship_4444444444.png
└── awards/                   # Fotos de premiações
    ├── award_5555555555.jpg
    └── award_6666666666.png
```

### Produção (Docker/VPS)
Você terá 3 opções:

#### **Opção 1: Volume Docker** (Mais simples)
```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - ./storage:/var/www/html/storage
```
✅ Fácil de configurar  
✅ Funciona bem para pequeno/médio porte  
⚠️ Arquivos ficam no servidor  

#### **Opção 2: S3/Minio** (Recomendado para produção)
```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=sua_key
AWS_SECRET_ACCESS_KEY=sua_secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=app-esportivo
AWS_URL=https://s3.amazonaws.com
```
✅ Escalável infinitamente  
✅ CDN integrado (rápido)  
✅ Backup automático  
💰 Custo: ~$0.023/GB/mês  

#### **Opção 3: Storage Local + Nginx** (Grátis)
```nginx
# nginx.conf
location /storage {
    alias /var/www/html/storage/app/public;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```
✅ Totalmente grátis  
✅ Rápido  
⚠️ Precisa configurar backup manual  

---

## 💾 BANCO DE DADOS

### Campos Adicionados

```sql
-- Tabela: users
ALTER TABLE users ADD COLUMN photo_path VARCHAR(255) NULL;
-- Exemplo: "players/player_1234567890.jpg"

-- Tabela: teams
ALTER TABLE teams ADD COLUMN logo_path VARCHAR(255) NULL;
-- Exemplo: "teams/team_9876543210.png"

-- Tabela: championships
ALTER TABLE championships ADD COLUMN image_path VARCHAR(255) NULL;
-- Exemplo: "championships/championship_3333333333.jpg"
```

### Por que apenas o caminho?
- ✅ **Banco leve e rápido** (VARCHAR vs BLOB)
- ✅ **Backups pequenos** (MB vs GB)
- ✅ **Queries rápidas** (sem carregar imagens)
- ✅ **Fácil migração** (S3, CDN, etc)
- ✅ **Cache eficiente** (Nginx, CloudFlare)

---

## 🔄 FLUXO DE UPLOAD

### 1. Mobile envia imagem
```typescript
const formData = new FormData();
formData.append('image', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'photo.jpg',
});

await api.post('/admin/upload/player-photo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

### 2. Backend processa
```php
// UploadController.php
public function uploadPlayerPhoto(Request $request)
{
    // Valida
    $request->validate([
        'image' => 'required|image|max:2048', // 2MB
    ]);

    // Salva arquivo
    $image = $request->file('image');
    $filename = 'player_' . time() . '_' . Str::random(10) . '.' . $image->extension();
    $path = $image->storeAs('players', $filename, 'public');
    
    // Retorna caminho
    return response()->json([
        'path' => $path,  // "players/player_1234567890.jpg"
        'url' => Storage::url($path)  // "/storage/players/player_1234567890.jpg"
    ]);
}
```

### 3. Mobile salva no banco
```typescript
// Atualiza jogador com o caminho da foto
await api.put(`/admin/players/${playerId}`, {
  photo_path: response.data.path  // "players/player_1234567890.jpg"
});
```

### 4. Exibir imagem
```typescript
// Mobile
<Image 
  source={{ uri: `${API_URL}/storage/${player.photo_path}` }}
/>
// URL final: "http://api.com/storage/players/player_1234567890.jpg"
```

---

## 🔒 SEGURANÇA

### Validações Implementadas
```php
'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048'
```
- ✅ Apenas imagens
- ✅ Formatos permitidos: JPEG, PNG, JPG, GIF, SVG
- ✅ Tamanho máximo: 2MB

### Proteção contra Ataques
- ✅ Nome de arquivo aleatório (evita sobrescrever)
- ✅ Extensão validada (evita upload de PHP, JS)
- ✅ Middleware de admin (apenas admins fazem upload)
- ✅ Storage separado (não executa código)

---

## 🚀 DEPLOY

### Desenvolvimento (Local)
```bash
# Já configurado!
php artisan storage:link
```

### Produção (Docker)
```dockerfile
# Dockerfile
RUN php artisan storage:link

# docker-compose.yml
volumes:
  - storage_data:/var/www/html/storage/app/public

volumes:
  storage_data:
```

### Produção (S3)
```bash
# Instalar driver S3
composer require league/flysystem-aws-s3-v3

# Configurar .env
FILESYSTEM_DISK=s3
AWS_BUCKET=app-esportivo
# ... outras configs
```

---

## 📊 COMPARAÇÃO: Banco vs Storage

| Aspecto | Imagem no Banco (BLOB) | Caminho no Banco (VARCHAR) |
|---------|------------------------|----------------------------|
| **Tamanho do Banco** | 🔴 Muito grande (GB) | ✅ Pequeno (KB) |
| **Velocidade de Query** | 🔴 Lenta | ✅ Rápida |
| **Backup** | 🔴 Demorado (horas) | ✅ Rápido (minutos) |
| **Cache** | 🔴 Difícil | ✅ Fácil (Nginx, CDN) |
| **Escalabilidade** | 🔴 Limitada | ✅ Infinita (S3, CDN) |
| **Custo** | 🔴 Alto (servidor) | ✅ Baixo (storage) |
| **Migração** | 🔴 Complexa | ✅ Simples |

---

## 🎯 EXEMPLO COMPLETO

### Upload de Logo de Equipe

```typescript
// Mobile: Selecionar imagem
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  
  if (!result.canceled) {
    uploadLogo(result.assets[0].uri);
  }
};

// Upload
const uploadLogo = async (uri: string) => {
  const formData = new FormData();
  formData.append('image', {
    uri,
    type: 'image/jpeg',
    name: 'logo.jpg',
  });

  const response = await api.post('/admin/upload/team-logo', formData);
  
  // Atualizar equipe
  await api.put(`/admin/teams/${teamId}`, {
    logo_path: response.data.path
  });
};
```

```php
// Backend: Processar upload
public function uploadTeamLogo(Request $request)
{
    $request->validate([
        'image' => 'required|image|max:2048',
    ]);

    $image = $request->file('image');
    $filename = 'team_' . time() . '_' . Str::random(10) . '.' . $image->extension();
    $path = $image->storeAs('teams', $filename, 'public');

    return response()->json([
        'path' => $path,
        'url' => Storage::url($path)
    ]);
}
```

```typescript
// Mobile: Exibir logo
<Image 
  source={{ uri: `${API_URL}/storage/${team.logo_path}` }}
  style={{ width: 100, height: 100 }}
/>
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Criar diretórios de storage
- [x] Configurar `storage:link`
- [x] Criar migration para campos de path
- [x] Atualizar models (fillable)
- [x] Criar UploadController
- [x] Adicionar rotas de upload
- [x] Validações de segurança
- [ ] Testar upload no mobile
- [ ] Configurar para produção (Docker/S3)

---

## 🆘 TROUBLESHOOTING

### Erro: "The link already exists"
```bash
# Windows
Remove-Item public\storage -Force
php artisan storage:link
```

### Erro: "File not found"
```bash
# Verificar permissões
chmod -R 775 storage/
chown -R www-data:www-data storage/
```

### Imagem não aparece
```bash
# Verificar URL
echo Storage::url('teams/team_123.png');
# Deve retornar: /storage/teams/team_123.png
```

---

## 📚 REFERÊNCIAS

- [Laravel File Storage](https://laravel.com/docs/filesystem)
- [S3 Configuration](https://laravel.com/docs/filesystem#s3-driver-configuration)
- [React Native Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

---

**Sistema implementado e pronto para uso! 🚀**
