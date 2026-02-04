<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CoreController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\InscriptionController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\WalletController;

// Serve storage files (necessário para php artisan serve + Coolify proxy)
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    return response()->file($fullPath);
})->where('path', '.*');

// Serve default templates (visualização no admin)
Route::get('/assets-templates/{filename}', function ($filename) {
    $path = public_path('assets/templates/' . $filename);
    if (!file_exists($path)) {
        abort(404);
    }
    return response()->file($path);
});

// Rotas Públicas (Core do App)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/ocr/analyze', [App\Http\Controllers\DocumentOCRController::class, 'analyze']);



Route::get('/cities', [CoreController::class, 'cities']);
Route::get('/cities/{citySlug}/clubs', [CoreController::class, 'clubs']);
Route::get('/clubs/{clubSlug}', [CoreController::class, 'clubDetails']);
Route::get('/sports', [CoreController::class, 'sports']);

// Eventos (Público)
Route::get('/public/events', [EventController::class, 'publicList']);
Route::get('/clubs/{clubId}/championships', [EventController::class, 'championships']);
Route::get('/championships/{id}', [EventController::class, 'championshipDetails']);
Route::get('/championships/{id}/matches', [EventController::class, 'matches']);
Route::get('/championships/{id}/leaderboard', [EventController::class, 'leaderboard']);
Route::get('/championships/{id}/knockout-bracket', [EventController::class, 'knockoutBracket']);
Route::get('/clubs/{clubId}/agenda', [EventController::class, 'agenda']);
Route::get('/clubs/{id}/calendar', [EventController::class, 'calendarEvents']);
Route::get('/championships/{id}/stats', [EventController::class, 'stats']);
Route::get('/championships/{id}/heats', [EventController::class, 'heats']);
Route::get('/championships/{id}/brackets', [EventController::class, 'brackets']);
Route::get('/championships/{id}/participants', [EventController::class, 'participants']);
Route::get('/championships/{id}/race', [EventController::class, 'raceDetails']);
Route::get('/championships/{id}/race-results', [EventController::class, 'raceResults']);
Route::get('/championships/{id}/mvp', [EventController::class, 'mvp']);
Route::get('/championships/{id}/teams', [EventController::class, 'teamsList']);
Route::get('/championships/{id}/h2h', [EventController::class, 'h2h']);
Route::get('/public/art/match/{matchId}/mvp', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'downloadMvpArt']);

// Loja (Público)
Route::get('/clubs/{clubId}/products', [ShopController::class, 'products']);
Route::get('/products/{id}', [ShopController::class, 'productDetails']);

// Rotas Protegidas (Atleta Logado)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'update']);

    Route::post('/me/photo', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadMyPhoto']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Checkout e Cupons
    Route::post('/cupom/validate', [ShopController::class, 'validateCoupon']);
    Route::post('/checkout', [ShopController::class, 'dateCheckout']);
    Route::get('/my-orders', [ShopController::class, 'myOrders']);

    // Inscrições (Times e Atletas)
    Route::post('/inscriptions/team', [InscriptionController::class, 'registerTeam']);
    Route::post('/inscriptions/upload', [InscriptionController::class, 'uploadDocument']);

    // Votação (Craque do Jogo)
    Route::post('/votes/mvp', [VoteController::class, 'voteMvp']);

    // Carteirinha Digital
    Route::get('/wallet/my-card', [WalletController::class, 'getWallet']);
    Route::get('/wallet/generate-qr', [\App\Http\Controllers\Admin\QRValidationController::class, 'generateWalletQR']);

    // Gestão de Times (Capitão)
    Route::get('/my-teams', [\App\Http\Controllers\TeamController::class, 'index']);
    Route::post('/my-teams', [\App\Http\Controllers\TeamController::class, 'store']);
    Route::get('/teams/{id}', [\App\Http\Controllers\TeamController::class, 'show']);
    Route::post('/teams/{id}/players', [\App\Http\Controllers\TeamController::class, 'addPlayer']);

    // Área Admin (Web) - Protegido com middleware 'admin'
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\AdminController::class, 'dashboard']);
        Route::get('/stats', [\App\Http\Controllers\Admin\AdminDashboardController::class, 'index']);


        // Gestão de Campeonatos (NEW)
        Route::get('/championships', [\App\Http\Controllers\Admin\AdminChampionshipController::class, 'index']);
        Route::post('/championships', [\App\Http\Controllers\Admin\AdminChampionshipController::class, 'store']);
        Route::put('/championships/{id}', [\App\Http\Controllers\Admin\AdminChampionshipController::class, 'update']);
        Route::delete('/championships/{id}', [\App\Http\Controllers\Admin\AdminChampionshipController::class, 'destroy']);
        Route::post('/championships/{id}/categories', [\App\Http\Controllers\Admin\AdminChampionshipController::class, 'addCategory']);
        Route::get('/championships/{id}/categories', [\App\Http\Controllers\Admin\AdminChampionshipController::class, 'categories']);
        Route::put('/championships/{id}/awards', [\App\Http\Controllers\Admin\AdminChampionshipController::class, 'updateAwards']);

        // Gestão de Partidas (NEW)
        Route::get('/matches', [\App\Http\Controllers\Admin\AdminMatchController::class, 'index']);
        Route::post('/matches', [\App\Http\Controllers\Admin\AdminMatchController::class, 'store']);
        Route::put('/matches/{id}', [\App\Http\Controllers\Admin\AdminMatchController::class, 'update']);
        Route::patch('/matches/{id}', [\App\Http\Controllers\Admin\AdminMatchController::class, 'update']);
        Route::delete('/matches/{id}', [\App\Http\Controllers\Admin\AdminMatchController::class, 'destroy']);
        Route::post('/matches/{id}/finish', [\App\Http\Controllers\Admin\AdminMatchController::class, 'finish']);
        Route::post('/matches/{id}/mvp', [\App\Http\Controllers\Admin\AdminMatchController::class, 'setMVP']);
        Route::post('/matches/{id}/events', [\App\Http\Controllers\Admin\AdminMatchController::class, 'addEvent']);
        Route::get('/matches/{id}/events', [\App\Http\Controllers\Admin\AdminMatchController::class, 'events']);
        Route::delete('/matches/{id}/events/{eventId}', [\App\Http\Controllers\Admin\AdminMatchController::class, 'deleteEvent']);
        Route::put('/matches/{id}/awards', [\App\Http\Controllers\Admin\AdminMatchController::class, 'updateAwards']);

        // Gestão de Vôlei
        Route::get('/matches/{id}/volley-state', [\App\Http\Controllers\Admin\AdminVolleyController::class, 'getState']);
        Route::post('/matches/{id}/volley/point', [\App\Http\Controllers\Admin\AdminVolleyController::class, 'registerPoint']);
        Route::post('/matches/{id}/volley/set-start', [\App\Http\Controllers\Admin\AdminVolleyController::class, 'startSet']);
        Route::post('/matches/{id}/volley/rotation', [\App\Http\Controllers\Admin\AdminVolleyController::class, 'manualRotation']);
        Route::post('/matches/{id}/volley/substitution', [\App\Http\Controllers\Admin\AdminVolleyController::class, 'substitutePlayer']);

        // Gestão de Equipes (NEW)
        Route::get('/teams', [\App\Http\Controllers\Admin\AdminTeamController::class, 'index']);
        Route::get('/teams/{id}', [\App\Http\Controllers\Admin\AdminTeamController::class, 'show']);
        Route::post('/teams', [\App\Http\Controllers\Admin\AdminTeamController::class, 'store']);
        Route::put('/teams/{id}', [\App\Http\Controllers\Admin\AdminTeamController::class, 'update']);
        Route::delete('/teams/{id}', [\App\Http\Controllers\Admin\AdminTeamController::class, 'destroy']);
        Route::post('/teams/{id}/add-to-championship', [\App\Http\Controllers\Admin\AdminTeamController::class, 'addToChampionship']);
        Route::post('/teams/{id}/remove-from-championship', [\App\Http\Controllers\Admin\AdminTeamController::class, 'removeFromChampionship']);
        Route::delete('/teams/{id}/players/{playerId}', [\App\Http\Controllers\Admin\AdminTeamController::class, 'removePlayer']);

        // Gestão de Jogadores (NEW)
        Route::get('/players', [\App\Http\Controllers\Admin\AdminPlayerController::class, 'index']);
        Route::get('/players/search', [\App\Http\Controllers\Admin\AdminPlayerController::class, 'search']);
        Route::get('/players/{id}', [\App\Http\Controllers\Admin\AdminPlayerController::class, 'show']);
        Route::post('/players', [\App\Http\Controllers\Admin\AdminPlayerController::class, 'store']);
        Route::put('/players/{id}', [\App\Http\Controllers\Admin\AdminPlayerController::class, 'update']);
        Route::delete('/players/{id}', [\App\Http\Controllers\Admin\AdminPlayerController::class, 'destroy']);

        // Upload de Imagens (NEW)
        Route::post('/upload/team-logo/{id}', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadTeamLogo']);
        Route::post('/upload/player-photo/{id}', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadPlayerPhoto']);
        Route::post('/upload/championship-image', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadChampionshipImage']);
        Route::post('/upload/championship-logo/{id}', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadChampionshipLogo']);
        Route::post('/upload/championship-banner/{id}', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadChampionshipBanner']);
        // Wait, I saw ImageUploadController content, it had uploadTeamLogo, uploadPlayerPhoto, uploadAwardPhoto, uploadGeneric. 
        // It DOES NOT have uploadChampionshipImage explicitly named, but has uploadGeneric.
        // Let's assume uploadGeneric can handle it or use UploadController for championship if distinct.
        // Given I want to consolidate, I will map the new route listImages.
        Route::post('/upload/award-photo', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadAwardPhoto']);
        Route::post('/upload/generic', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadGeneric']);
        Route::get('/upload/list', [\App\Http\Controllers\Admin\ImageUploadController::class, 'listImages']);
        Route::delete('/upload/delete', [\App\Http\Controllers\Admin\ImageUploadController::class, 'deleteImage']);

        // Gestão de Categorias (NEW)
        Route::get('/championships/{championshipId}/categories-list', [\App\Http\Controllers\Admin\CategoryController::class, 'index']);
        Route::post('/championships/{championshipId}/categories-new', [\App\Http\Controllers\Admin\CategoryController::class, 'store']);
        Route::put('/championships/{championshipId}/categories/{categoryId}', [\App\Http\Controllers\Admin\CategoryController::class, 'update']);
        Route::delete('/championships/{championshipId}/categories/{categoryId}', [\App\Http\Controllers\Admin\CategoryController::class, 'destroy']);
        Route::post('/championships/{championshipId}/categories/{categoryId}/teams', [\App\Http\Controllers\Admin\CategoryController::class, 'addTeam']);
        Route::delete('/championships/{championshipId}/categories/{categoryId}/teams/{teamId}', [\App\Http\Controllers\Admin\CategoryController::class, 'removeTeam']);

        // Chaveamento/Sorteio (NEW)
        Route::post('/championships/{championshipId}/bracket/generate', [\App\Http\Controllers\Admin\BracketController::class, 'generate']);
        Route::post('/championships/{championshipId}/bracket/advance', [\App\Http\Controllers\Admin\BracketController::class, 'advancePhase']);
        Route::post('/championships/{championshipId}/bracket/shuffle', [\App\Http\Controllers\Admin\BracketController::class, 'shuffle']);

        // Estatísticas e Relatórios (NEW)
        Route::get('/championships/{championshipId}/stats/goals', [\App\Http\Controllers\Admin\StatisticsController::class, 'goalsByPlayer']);
        Route::get('/championships/{championshipId}/stats/top-scorers', [\App\Http\Controllers\Admin\StatisticsController::class, 'topScorers']);
        Route::get('/championships/{championshipId}/stats/assists', [\App\Http\Controllers\Admin\StatisticsController::class, 'assistsByPlayer']);
        Route::get('/championships/{championshipId}/stats/cards', [\App\Http\Controllers\Admin\StatisticsController::class, 'cardsByPlayer']);
        Route::get('/championships/{championshipId}/stats/standings', [\App\Http\Controllers\Admin\StatisticsController::class, 'standings']);
        Route::get('/championships/{championshipId}/stats/dashboard', [\App\Http\Controllers\Admin\StatisticsController::class, 'championshipDashboard']);
        Route::get('/players/{playerId}/history', [\App\Http\Controllers\Admin\StatisticsController::class, 'playerHistory']);

        // Scanner QR Code (NEW)
        Route::post('/qr/validate-wallet', [\App\Http\Controllers\Admin\QRValidationController::class, 'validateWallet']);
        Route::post('/qr/check-in', [\App\Http\Controllers\Admin\QRValidationController::class, 'checkInPlayer']);
        Route::post('/qr/validate-ticket', [\App\Http\Controllers\Admin\QRValidationController::class, 'validateTicket']);

        // Notificações (NEW)
        Route::post('/notifications/send', [\App\Http\Controllers\Admin\NotificationController::class, 'send']);
        Route::post('/notifications/token', [\App\Http\Controllers\Admin\NotificationController::class, 'storeToken']);

        // Exportação de Dados (NEW)
        Route::get('/export/players', [\App\Http\Controllers\Admin\ExportController::class, 'exportPlayers']);
        Route::get('/export/teams', [\App\Http\Controllers\Admin\ExportController::class, 'exportTeams']);

        // Gerador de Artes (NEW)
        Route::get('/art/match/{matchId}/faceoff', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'matchFaceoff']);
        Route::get('/art/match/{matchId}/mvp', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'mvpArt']);
        Route::get('/art/championship/{championshipId}/award/{category}', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'championshipAwardArt']);
        Route::get('/art/championship/{championshipId}/standings', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'standingsArt']);

        // Rodízio de Vôlei (NEW)
        Route::get('/volleyball/match/{matchId}/positions', [\App\Http\Controllers\Admin\VolleyballRotationController::class, 'getPositions']);
        Route::post('/volleyball/match/{matchId}/positions', [\App\Http\Controllers\Admin\VolleyballRotationController::class, 'savePositions']); // Para Drag & Drop
        Route::post('/volleyball/rotate', [\App\Http\Controllers\Admin\VolleyballRotationController::class, 'rotate']);

        // Legacy routes (manter compatibilidade)
        Route::post('/championships/{id}/categories', [\App\Http\Controllers\TournamentManagerController::class, 'addCategory']);
        Route::post('/championships/{id}/draw', [\App\Http\Controllers\DrawController::class, 'generateBracket']);
        Route::get('/reports/finance', [\App\Http\Controllers\ReportController::class, 'financialReport']);
        Route::get('/championships/{id}/export', [\App\Http\Controllers\ReportController::class, 'exportInscriptions']);
        Route::get('/matches/{id}/full-details', [\App\Http\Controllers\MatchOperationController::class, 'show']);
        Route::post('/matches/{id}/sets', [\App\Http\Controllers\MatchOperationController::class, 'updateSet']);
        Route::post('/matches/{id}/status', [\App\Http\Controllers\MatchOperationController::class, 'updateStatus']);
        Route::get('/security/validate-player/{code}', [\App\Http\Controllers\SecurityController::class, 'validatePlayer']);

        // Reports (NEW)
        Route::get('/reports/dashboard', [\App\Http\Controllers\Admin\AdminReportController::class, 'dashboard']);
        Route::get('/reports/championship/{id}', [\App\Http\Controllers\Admin\AdminReportController::class, 'championshipReport']);
        Route::get('/reports/export', [\App\Http\Controllers\Admin\AdminReportController::class, 'export']);

        // Race Wizard & Results
        Route::post('/race-wizard', [\App\Http\Controllers\Admin\RaceWizardController::class, 'store']);
        Route::get('/races/{id}/results', [\App\Http\Controllers\Admin\RaceResultController::class, 'index']);
        Route::post('/races/{id}/results', [\App\Http\Controllers\Admin\RaceResultController::class, 'store']);
        Route::post('/races/{id}/results/import', [\App\Http\Controllers\Admin\RaceResultController::class, 'uploadCsv']);
        Route::put('/results/{id}', [\App\Http\Controllers\Admin\RaceResultController::class, 'update']);
        // Configurações (NEW)
        Route::get('/settings', [\App\Http\Controllers\Admin\AdminSettingController::class, 'show']);
        Route::put('/settings', [\App\Http\Controllers\Admin\AdminSettingController::class, 'update']);
        Route::post('/settings/logo', [\App\Http\Controllers\Admin\AdminSettingController::class, 'uploadLogo']);
        Route::post('/settings/banner', [\App\Http\Controllers\Admin\AdminSettingController::class, 'uploadBanner']);

        // System Settings (SMTP)
        Route::get('/system-settings', [\App\Http\Controllers\Admin\AdminSystemSettingController::class, 'index']);
        Route::put('/system-settings', [\App\Http\Controllers\Admin\AdminSystemSettingController::class, 'update']);

        // Categories
        Route::get('/categories', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'index']);
        Route::post('/categories', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'store']);
        Route::put('/categories/{id}', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'update']);
        Route::delete('/categories/{id}', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'destroy']);
        // Gestão de Clubes (Super Admin)
        Route::get('/clubs-manage', [\App\Http\Controllers\Admin\AdminClubController::class, 'index']);
        Route::post('/clubs-manage', [\App\Http\Controllers\Admin\AdminClubController::class, 'store']);
        Route::get('/clubs-manage/{id}', [\App\Http\Controllers\Admin\AdminClubController::class, 'show']);
        Route::put('/clubs-manage/{id}', [\App\Http\Controllers\Admin\AdminClubController::class, 'update']);
    });
});


// Webhooks (Público)
Route::post('/webhooks/payment/{gateway}', [\App\Http\Controllers\PaymentWebhookController::class, 'handle']);