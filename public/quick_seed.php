<?php
// Script de execução rápida para rodar seeders via web
// Segurança básica: só roda se tiver a APP_KEY correta na query string
// Ex: http://seusite.com/quick_seed.php?key=SUA_APP_KEY_BASE64

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Pega a chave do .env
$envKey = env('APP_KEY');
$requestKey = $_GET['key'] ?? '';

echo "<h1>Quick Seeder Runner</h1>";

if (!$envKey || $requestKey !== $envKey) {
    die("⛔ Acesso negado. Chave incorreta.");
}

echo "<pre>";
echo "Iniciando Seed...\n";

try {
    Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
    echo Illuminate\Support\Facades\Artisan::output();
    echo "\n✅ Seed concluído com sucesso!";
} catch (\Exception $e) {
    echo "❌ Erro ao rodar seed: " . $e->getMessage();
}

echo "</pre>";
