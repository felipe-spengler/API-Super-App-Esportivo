<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return redirect('/admin');
});

// Route::prefix('admin')->group(function () { ... });
// Routes removed to allow Filament Admin Panel to handle /admin

// Serve storage files (necessário para php artisan serve que não serve symlinks)
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    return response()->file($fullPath);
})->where('path', '.*');

// 🧪 Página de teste - Remoção de fundo com IA
Route::get('/testando-imagem', function () {
    return response()->file(public_path('testando_imagem.php'));
});
