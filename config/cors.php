<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Origens explícitas para suportar: web (produção), dev local, app mobile (Capacitor iOS/Android)
    'allowed_origins' => [
        'https://esportes7.com.br',                // novo domínio produção
        'https://acorrerondon.com.br',              // portal acorre rondon
        'https://esportivo.techinteligente.site',  // legado
        'http://localhost:5173',                    // dev local Vite
        'http://localhost',                         // Android WebView (Capacitor antigo)
        'https://localhost',                        // Android WebView (Capacitor novo)
        'capacitor://localhost',                    // iOS Capacitor
        'ionic://localhost',                        // Ionic compat
        'http://gg8sko0ook088www8s0cswgo.72.61.37.70.sslip.io', // Novo frontend (Coolify temp)
    ],

    'allowed_origins_patterns' => [
        '#^http://.*\.72\.61\.37\.70\.sslip\.io$#', // Aceita qualquer subdomínio temporário do Coolify nesta VPS
        '#^https?://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|localhost)(:\d+)?$#', // Painel ESP32 e redes locais
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // false: usa Bearer token no header (não cookie), compatível com * e com mobile
    'supports_credentials' => false,

];
