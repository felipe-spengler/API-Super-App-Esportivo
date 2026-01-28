<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/admin');
});

// Route::prefix('admin')->group(function () { ... });
// Routes removed to allow Filament Admin Panel to handle /admin

