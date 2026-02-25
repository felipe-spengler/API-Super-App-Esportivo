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
        'https://esportivo.techinteligente.site',  // web produção
        'http://localhost:5173',                    // dev local Vite
        'http://localhost',                         // Android WebView (Capacitor)
        'capacitor://localhost',                    // iOS Capacitor
        'ionic://localhost',                        // Ionic compat
        'http://gg8sko0ook088www8s0cswgo.72.61.37.70.sslip.io', // Novo frontend (Coolify temp)
    ],

    'allowed_origins_patterns' => [
        '#^http://.*\.72\.61\.37\.70\.sslip\.io$#', // Aceita qualquer subdomínio temporário do Coolify nesta VPS
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // false: usa Bearer token no header (não cookie), compatível com * e com mobile
    'supports_credentials' => false,

];
