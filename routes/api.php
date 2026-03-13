<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CoreController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\InscriptionController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\DocumentOCRController;
use App\Http\Controllers\MatchOperationController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\Admin\ImageUploadController;
use App\Http\Controllers\Admin\AdminChampionshipController;
use App\Http\Controllers\Admin\AdminTeamController;
use App\Http\Controllers\Admin\AdminPlayerController;
use App\Http\Controllers\Admin\AdminMatchController;
use App\Http\Controllers\Admin\AdminVolleyController;
use App\Http\Controllers\Admin\AdminTennisController;
use App\Http\Controllers\Admin\AdminCategoryController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\BracketController;
use App\Http\Controllers\Admin\StatisticsController;
use App\Http\Controllers\Admin\QRValidationController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\ExportController;
use App\Http\Controllers\Admin\ArtGeneratorController;
use App\Http\Controllers\Admin\VolleyballRotationController;
use App\Http\Controllers\Admin\AdminProductController;
use App\Http\Controllers\Admin\RaceWizardController;
use App\Http\Controllers\Admin\RaceResultController;
use App\Http\Controllers\Admin\RaceInscriptionController;
use App\Http\Controllers\Admin\RacePaymentController;
use App\Http\Controllers\Admin\AdminSettingController;
use App\Http\Controllers\Admin\AdminSystemSettingController;
use App\Http\Controllers\Admin\CouponController;
use App\Http\Controllers\Admin\AsaasController;
use App\Http\Controllers\Admin\TemporaryAccessController;
use App\Http\Controllers\Admin\AdminClubController;
use App\Http\Controllers\Admin\AuditController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\DrawController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SecurityController;
use App\Http\Controllers\PaymentWebhookController;

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

// Serve fonts (visualização no admin)
Route::get('/assets-fonts/{filename}', function ($filename) {
    $path = public_path('assets/fonts/' . $filename);
    if (!file_exists($path)) {
        // Tenta adicionar extensão .ttf se não tiver
        if (file_exists($path . '.ttf')) {
            $path .= '.ttf';
        } else {
            abort(404);
        }
    }
    return response()->file($path);
});

// Rotas Públicas (Core do App)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/ocr/analyze', [DocumentOCRController::class, 'analyze']);

// 🧪 ROTA DE TESTE - Remover em produção ou proteger
Route::post('/test-remove-bg', [\App\Http\Controllers\Admin\ImageUploadController::class, 'testRemoveBg']);
Route::get('/debug/player-art/{playerId}', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'debugPlayerArt']);


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
Route::post('/championships/{id}/race/register', [RaceInscriptionController::class, 'publicRegister']);
Route::post('/championships/{id}/race/track', [RaceInscriptionController::class, 'publicTrackRegistration']);
Route::post('/inscriptions/{id}/recreate-payment', [RacePaymentController::class, 'recreatePayment']);
Route::get('/championships/{id}/mvp', [EventController::class, 'mvp']);
Route::get('/championships/{id}/teams', [EventController::class, 'teamsList']);
Route::get('/championships/{id}/h2h', [EventController::class, 'h2h']);
Route::get('/public/art/match/{matchId}/mvp', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'downloadMvpArt']);
Route::get('/public/art/match/{matchId}/scheduled', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'downloadScheduledArt']);
Route::get('/public/art/match/{matchId}/faceoff', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'matchFaceoff']);
Route::get('/public/matches/{id}/pdf', [EventController::class, 'matchPdf']);
Route::get('/public/matches/{id}', [EventController::class, 'matchDetails']); // NEW Public Match Details
Route::get('/public/matches/{id}/full-details', [MatchOperationController::class, 'show']); // NEW Public Full Details for Print

// Public Art Generation Routes (Matching /api/art structure)
Route::get('/art/match/{matchId}/scheduled', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'downloadScheduledArt']);
Route::get('/art/match/{matchId}/mvp', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'downloadMvpArt']);
Route::get('/art/championship/{championshipId}/award/{category}', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'championshipAwardArt']);
Route::get('/art/championship/{championshipId}/individual/{athleteId}/{category}', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'individualAthleteArt']);

// Loja (Público)
Route::get('/clubs/{clubId}/products', [ShopController::class, 'products']);
Route::get('/shop/products/{clubId}', [ShopController::class, 'products']);
Route::get('/public/products', [ShopController::class, 'allProducts']); // NEW
Route::get('/products/{id}', [ShopController::class, 'productDetails']);
Route::post('/asaas/webhook', [\App\Http\Controllers\Admin\AsaasController::class, 'webhook']);
Route::post('/admin/asaas/webhook', [\App\Http\Controllers\Admin\AsaasController::class, 'webhook']);

// Rotas Protegidas (Atleta Logado)
Route::middleware(['auth:sanctum', 'audit'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'update']);

    Route::post('/me/photo', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadMyPhoto']);
    Route::delete('/me', [AuthController::class, 'deleteAccount']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Inscrições e Comprovantes
    Route::get('/my-inscriptions', [RaceInscriptionController::class, 'myInscriptions']);
    Route::get('/inscriptions/{id}/receipt', [\App\Http\Controllers\ReceiptController::class, 'download']);

    // Checkout e Cupons
    Route::post('/cupom/validate', [ShopController::class, 'validateCoupon']);
    Route::post('/checkout', [ShopController::class, 'dateCheckout']);
    Route::get('/my-orders', [ShopController::class, 'myOrders']);

    // Inscrições (Times e Atletas)
    Route::get('/my-inscriptions', [RaceInscriptionController::class, 'myInscriptions']);
    Route::post('/inscriptions/team', [InscriptionController::class, 'registerTeam']);

    Route::post('/inscriptions/upload', [InscriptionController::class, 'uploadDocument']);

    // Votação (Craque do Jogo)
    Route::post('/votes/mvp', [VoteController::class, 'voteMvp']);

    // Carteirinha Digital
    Route::get('/wallet/my-card', [WalletController::class, 'getWallet']);
    Route::get('/wallet/generate-qr', [QRValidationController::class, 'generateWalletQR']);

    // Gestão de Times (Capitão)
    Route::get('/my-teams', [TeamController::class, 'index']);
    Route::post('/my-teams', [TeamController::class, 'store']);
    Route::get('/teams/{id}', [TeamController::class, 'show']);
    Route::post('/teams/{id}/players', [TeamController::class, 'addPlayer']);
    Route::put('/teams/{id}/players/{playerId}', [TeamController::class, 'updatePlayer']);
    Route::delete('/teams/{id}/players/{playerId}', [TeamController::class, 'removePlayer']);
    Route::post('/teams/{id}/upload-player-photo/{playerId}', [TeamController::class, 'uploadPlayerPhoto']);

    // Área Admin (Web) - Protegido com middleware 'admin'
    Route::prefix('admin')->middleware(['admin'])->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/stats', [AdminDashboardController::class, 'index']);


        // Gestão de Campeonatos (NEW)
        Route::get('/championships', [AdminChampionshipController::class, 'index']);
        Route::get('/championships/{id}', [AdminChampionshipController::class, 'show']);
        Route::post('/championships', [AdminChampionshipController::class, 'store']);
        Route::put('/championships/{id}', [AdminChampionshipController::class, 'update']);
        Route::delete('/championships/{id}', [AdminChampionshipController::class, 'destroy']);
        Route::post('/championships/{id}/categories', [AdminChampionshipController::class, 'addCategory']);
        Route::get('/championships/{id}/categories', [AdminChampionshipController::class, 'categories']);
        Route::put('/championships/{id}/awards', [AdminChampionshipController::class, 'updateAwards']);

        // Gestão de Partidas (NEW)
        Route::get('/matches', [AdminMatchController::class, 'index']);
        Route::get('/matches/{id}', [AdminMatchController::class, 'show']);
        Route::post('/matches', [AdminMatchController::class, 'store']);
        Route::put('/matches/{id}', [AdminMatchController::class, 'update']);
        Route::patch('/matches/{id}', [AdminMatchController::class, 'update']);
        Route::delete('/matches/{id}', [AdminMatchController::class, 'destroy']);
        Route::post('/matches/{id}/finish', [AdminMatchController::class, 'finish']);
        Route::post('/matches/{id}/mvp', [AdminMatchController::class, 'setMVP']);
        Route::post('/matches/{id}/events', [AdminMatchController::class, 'addEvent']);
        Route::get('/matches/{id}/events', [AdminMatchController::class, 'events']);
        Route::delete('/matches/{id}/events/{eventId}', [AdminMatchController::class, 'deleteEvent']);
        Route::put('/matches/{id}/awards', [AdminMatchController::class, 'updateAwards']);

        // Gestão de Vôlei
        Route::get('/matches/{id}/volley-state', [AdminVolleyController::class, 'getState']);
        Route::post('/matches/{id}/volley/point', [AdminVolleyController::class, 'registerPoint']);
        Route::post('/matches/{id}/volley/set-start', [AdminVolleyController::class, 'startSet']);
        Route::post('/matches/{id}/volley/set-finish', [AdminVolleyController::class, 'finishSet']);
        Route::post('/matches/{id}/volley/rotation', [AdminVolleyController::class, 'manualRotation']);
        Route::post('/matches/{id}/volley/substitution', [AdminVolleyController::class, 'substitutePlayer']);

        // Gestão de Tênis
        Route::get('/matches/{id}/tennis-state', [AdminTennisController::class, 'getState']);
        Route::post('/matches/{id}/tennis/point', [AdminTennisController::class, 'registerPoint']);
        Route::post('/matches/{id}/tennis/server', [AdminTennisController::class, 'setServer']);
        Route::post('/matches/{id}/tennis/undo', [AdminTennisController::class, 'undoPoint']);
        Route::post('/matches/{id}/tennis/times', [AdminTennisController::class, 'updateTimes']);
        Route::post('/matches/{id}/tennis/finish', [AdminTennisController::class, 'finishMatch']);

        // Gestão de Equipes (NEW)
        Route::get('/teams', [AdminTeamController::class, 'index']);
        Route::get('/teams/{id}', [AdminTeamController::class, 'show']);
        Route::post('/teams', [AdminTeamController::class, 'store']);
        Route::put('/teams/{id}', [AdminTeamController::class, 'update']);
        Route::delete('/teams/{id}', [AdminTeamController::class, 'destroy']);
        Route::post('/teams/{id}/add-to-championship', [AdminTeamController::class, 'addToChampionship']);
        Route::patch('/teams/{id}/championship-captain', [AdminTeamController::class, 'updateChampionshipCaptain']);
        Route::post('/teams/{id}/remove-from-championship', [AdminTeamController::class, 'removeFromChampionship']);
        Route::post('/teams/{id}/copy-roster', [AdminTeamController::class, 'copyRoster']);
        Route::delete('/teams/{id}/players/{playerId}', [AdminTeamController::class, 'removePlayer']);

        // Gestão de Jogadores (NEW)
        Route::get('/players', [AdminPlayerController::class, 'index']);
        Route::get('/players/search', [AdminPlayerController::class, 'search']);
        Route::get('/players/{id}', [AdminPlayerController::class, 'show']);
        Route::post('/players', [AdminPlayerController::class, 'store']);
        Route::put('/players/{id}', [AdminPlayerController::class, 'update']);
        Route::delete('/players/{id}', [AdminPlayerController::class, 'destroy']);

        // Upload de Imagens
        Route::post('/upload/team-logo/{teamId}', [ImageUploadController::class, 'uploadTeamLogo']);
        Route::post('/upload/player-photo/{playerId}', [ImageUploadController::class, 'uploadPlayerPhoto']);
        Route::post('/upload/championship-logo/{championshipId}', [ImageUploadController::class, 'uploadChampionshipLogo']);
        Route::post('/upload/championship-banner/{championshipId}', [ImageUploadController::class, 'uploadChampionshipBanner']);
        Route::post('/upload/award-photo', [ImageUploadController::class, 'uploadAwardPhoto']);
        Route::post('/upload/generic', [ImageUploadController::class, 'uploadGeneric']);
        Route::post('/upload-image', [ImageUploadController::class, 'uploadImage']);
        Route::get('/upload/list', [ImageUploadController::class, 'listImages']);
        Route::delete('/upload/delete', [ImageUploadController::class, 'deleteImage']);
        Route::get('/test-ai-env', [ImageUploadController::class, 'testAiEnv']);

        // Gestão de Categorias
        Route::get('/categories', [AdminCategoryController::class, 'index']);
        Route::post('/categories', [AdminCategoryController::class, 'store']);
        Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
        Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);

        // Categorias específicas de Campeonato (Fundo de arte, times)
        Route::get('/championships/{championshipId}/categories-list', [CategoryController::class, 'index']);
        Route::post('/championships/{championshipId}/categories-new', [CategoryController::class, 'store']);
        Route::put('/championships/{championshipId}/categories/{categoryId}', [CategoryController::class, 'update']);
        Route::delete('/championships/{championshipId}/categories/{categoryId}', [CategoryController::class, 'destroy']);
        Route::post('/championships/{championshipId}/categories/{categoryId}/teams', [CategoryController::class, 'addTeam']);
        Route::delete('/championships/{championshipId}/categories/{categoryId}/teams/{teamId}', [CategoryController::class, 'removeTeam']);
        Route::post('/championships/{championshipId}/categories/{categoryId}/art-background', [CategoryController::class, 'updateArtBackground']);

        // Chaveamento/Sorteio
        Route::post('/championships/{championshipId}/bracket/generate', [\App\Http\Controllers\Admin\BracketController::class, 'generate']);
        Route::post('/championships/{championshipId}/bracket/advance', [\App\Http\Controllers\Admin\BracketController::class, 'advancePhase']);
        Route::post('/championships/{championshipId}/bracket/shuffle', [\App\Http\Controllers\Admin\BracketController::class, 'shuffle']);
        Route::post('/championships/{championshipId}/bracket/generate-from-groups', [\App\Http\Controllers\Admin\BracketController::class, 'generateFromGroups']);

        // Gestão Manual de Grupos
        Route::get('/championships/{championshipId}/groups', [\App\Http\Controllers\Admin\BracketController::class, 'getGroups']);
        Route::post('/championships/{championshipId}/groups', [\App\Http\Controllers\Admin\BracketController::class, 'saveGroups']);

        // Estatísticas e Relatórios
        Route::get('/championships/{championshipId}/stats/goals', [\App\Http\Controllers\Admin\StatisticsController::class, 'goalsByPlayer']);
        Route::get('/championships/{championshipId}/stats/top-scorers', [\App\Http\Controllers\Admin\StatisticsController::class, 'topScorers']);
        Route::get('/championships/{championshipId}/stats/assists', [\App\Http\Controllers\Admin\StatisticsController::class, 'assistsByPlayer']);
        Route::get('/championships/{championshipId}/stats/cards', [\App\Http\Controllers\Admin\StatisticsController::class, 'cardsByPlayer']);
        Route::get('/championships/{championshipId}/stats/standings', [\App\Http\Controllers\Admin\StatisticsController::class, 'standings']);
        Route::get('/championships/{championshipId}/stats/dashboard', [\App\Http\Controllers\Admin\StatisticsController::class, 'championshipDashboard']);
        Route::get('/players/{playerId}/history', [\App\Http\Controllers\Admin\StatisticsController::class, 'playerHistory']);

        // Scanner QR Code
        Route::post('/qr/validate-wallet', [\App\Http\Controllers\Admin\QRValidationController::class, 'validateWallet']);
        Route::post('/qr/check-in', [\App\Http\Controllers\Admin\QRValidationController::class, 'checkInPlayer']);
        Route::post('/qr/validate-ticket', [\App\Http\Controllers\Admin\QRValidationController::class, 'validateTicket']);

        // Notificações
        Route::post('/notifications/send', [\App\Http\Controllers\Admin\NotificationController::class, 'send']);
        Route::post('/notifications/token', [\App\Http\Controllers\Admin\NotificationController::class, 'storeToken']);

        // Exportação de Dados
        Route::get('/export/players', [\App\Http\Controllers\Admin\ExportController::class, 'exportPlayers']);
        Route::get('/export/teams', [\App\Http\Controllers\Admin\ExportController::class, 'exportTeams']);

        // Gerador de Artes Templates
        Route::get('/art-templates', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'getTemplate']);
        Route::post('/art-templates', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'saveTemplate']);

        // Gerador de Artes
        Route::get('/art/match/{matchId}/faceoff', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'matchFaceoff']);
        Route::get('/art/match/{matchId}/scheduled', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'matchScheduled']);
        Route::get('/art/match/{matchId}/mvp', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'mvpArt']);
        Route::get('/art/championship/{championshipId}/award/{category}', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'championshipAwardArt']);
        Route::get('/art/championship/{championshipId}/standings', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'standingsArt']);
        Route::get('/art/championship/{championshipId}/individual/{athleteId}/{category}', [\App\Http\Controllers\Admin\ArtGeneratorController::class, 'individualAthleteArt']);

        // Rodízio de Vôlei
        Route::get('/volleyball/match/{matchId}/positions', [\App\Http\Controllers\Admin\VolleyballRotationController::class, 'getPositions']);
        Route::post('/volleyball/match/{matchId}/positions', [\App\Http\Controllers\Admin\VolleyballRotationController::class, 'savePositions']);
        Route::post('/volleyball/rotate', [\App\Http\Controllers\Admin\VolleyballRotationController::class, 'rotate']);

        // Gestão de Produtos
        Route::get('/products-manage', [\App\Http\Controllers\Admin\AdminProductController::class, 'index']);
        Route::post('/products-manage', [\App\Http\Controllers\Admin\AdminProductController::class, 'store']);
        Route::put('/products-manage/{id}', [\App\Http\Controllers\Admin\AdminProductController::class, 'update']);
        Route::delete('/products-manage/{id}', [\App\Http\Controllers\Admin\AdminProductController::class, 'destroy']);
        Route::post('/products/upload-image', [\App\Http\Controllers\Admin\AdminProductController::class, 'uploadImage']);

        // Outros/Legados Consolidado
        Route::post('/championships/{id}/draw', [\App\Http\Controllers\DrawController::class, 'generateBracket']);
        Route::get('/reports/finance', [\App\Http\Controllers\ReportController::class, 'financialReport']);
        Route::get('/championships/{id}/export', [\App\Http\Controllers\ReportController::class, 'exportInscriptions']);
        Route::get('/matches/{id}/full-details', [\App\Http\Controllers\MatchOperationController::class, 'show']);
        Route::post('/matches/{id}/sets', [\App\Http\Controllers\MatchOperationController::class, 'updateSet']);
        Route::post('/matches/{id}/status', [\App\Http\Controllers\MatchOperationController::class, 'updateStatus']);
        Route::get('/security/validate-player/{code}', [\App\Http\Controllers\SecurityController::class, 'validatePlayer']);
        Route::get('/security/validate-race-kit/{id}', [\App\Http\Controllers\Admin\QRValidationController::class, 'validateRaceKit']);
        Route::post('/security/confirm-kit-delivery/{id}', [\App\Http\Controllers\Admin\QRValidationController::class, 'confirmKitDelivery']);

        // Reports (NEW)
        Route::get('/reports/dashboard', [\App\Http\Controllers\Admin\AdminReportController::class, 'dashboard']);
        Route::get('/reports/championship/{id}', [\App\Http\Controllers\Admin\AdminReportController::class, 'championshipReport']);
        Route::get('/reports/export', [\App\Http\Controllers\Admin\AdminReportController::class, 'export']);

        // Race Wizard & Results
        Route::post('/race-wizard', [\App\Http\Controllers\Admin\RaceWizardController::class, 'store']);
        Route::get('/races/{id}/results', [RaceResultController::class, 'index']);
        Route::post('/races/{id}/results', [RaceResultController::class, 'store']);
        Route::post('/races/{id}/results/import', [RaceResultController::class, 'uploadCsv']);
        Route::put('/results/{id}', [RaceResultController::class, 'update']);
        Route::patch('/results/{id}/payment', [RaceResultController::class, 'updatePayment']);
        Route::get('/championships/{id}/results/export', [RaceResultController::class, 'exportCsv']);

        // Configurações
        Route::get('/settings', [\App\Http\Controllers\Admin\AdminSettingController::class, 'show']);
        Route::put('/settings', [\App\Http\Controllers\Admin\AdminSettingController::class, 'update']);
        Route::post('/settings/logo', [\App\Http\Controllers\Admin\AdminSettingController::class, 'uploadLogo']);
        Route::post('/settings/banner', [\App\Http\Controllers\Admin\AdminSettingController::class, 'uploadBanner']);

        // System Settings (SMTP)
        Route::get('/system-settings', [\App\Http\Controllers\Admin\AdminSystemSettingController::class, 'index']);
        Route::put('/system-settings', [\App\Http\Controllers\Admin\AdminSystemSettingController::class, 'update']);

        // Cupons
        Route::apiResource('/coupons', \App\Http\Controllers\Admin\CouponController::class);

        // Asaas
        Route::get('/asaas/settings', [\App\Http\Controllers\Admin\AsaasController::class, 'getSettings']);
        Route::post('/asaas/settings', [\App\Http\Controllers\Admin\AsaasController::class, 'updateSettings']);

        // Acessos Temporários
        Route::get('/temporary-access', [\App\Http\Controllers\Admin\TemporaryAccessController::class, 'index']);
        Route::post('/temporary-access', [\App\Http\Controllers\Admin\TemporaryAccessController::class, 'store']);
        Route::put('/temporary-access/{id}', [\App\Http\Controllers\Admin\TemporaryAccessController::class, 'update']);
        Route::delete('/temporary-access/{id}', [\App\Http\Controllers\Admin\TemporaryAccessController::class, 'destroy']);

        // Gestão de Clubes (Super Admin)
        Route::get('/clubs-manage', [\App\Http\Controllers\Admin\AdminClubController::class, 'index']);
        Route::post('/clubs-manage', [\App\Http\Controllers\Admin\AdminClubController::class, 'store']);
        Route::get('/clubs-manage/{id}', [\App\Http\Controllers\Admin\AdminClubController::class, 'show']);
        Route::put('/clubs-manage/{id}', [AdminClubController::class, 'update']);
        Route::delete('/clubs-manage/{id}', [AdminClubController::class, 'destroy']);
        Route::post('/clubs-manage/{id}/impersonate', [AdminClubController::class, 'impersonate']);

        // Auditoria
        Route::get('/audit-logs', [AuditController::class, 'index']);
    });
});

// Webhooks (Público)
Route::post('/webhooks/payment/{gateway}', [PaymentWebhookController::class, 'handle']);