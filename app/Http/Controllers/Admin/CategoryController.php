<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\Championship;
use App\Services\AuditLogger;

class CategoryController extends Controller
{
    /**
     * Listar todas as categorias de um campeonato
     */
    public function index(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para acessar este campeonato.'
            ], 403);
        }

        $categories = $championship->categories()
            ->withCount('teams')
            ->get();

        $race = \App\Models\Race::where('championship_id', $championshipId)->first();
        $raceId = $race?->id;

        // Append art background URL and count of registered athletes
        $artSettings = $championship->art_settings ?? [];
        $categories->each(function ($category) use ($artSettings, $raceId) {
            $path = $artSettings['category_backgrounds'][$category->id] ?? null;
            if ($path) {
                $category->art_background_url = rtrim(config('app.url'), '/') . '/api/storage/' . $path;
            } else {
                $category->art_background_url = null;
            }

            $category->athletes_count = $raceId
                ? \App\Models\RaceResult::where('race_id', $raceId)->where('category_id', $category->id)->count()
                : 0;
        });

        return response()->json($categories);
    }

    /**
     * Atualizar fundo da arte para a categoria
     */
    public function updateArtBackground(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)->findOrFail($categoryId);

        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json(['message' => 'Permissão negada.'], 403);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp,jfif|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = 'bg_cat_' . $categoryId . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('art-backgrounds', $filename, 'public');

            $artSettings = $championship->art_settings ?? [];
            $artSettings['category_backgrounds'][$categoryId] = $path;
            $championship->art_settings = $artSettings;
            $championship->save();

            $fullUrl = rtrim(config('app.url'), '/') . '/api/storage/' . $path;

            return response()->json([
                'message' => 'Fundo atualizado com sucesso!',
                'url' => $fullUrl
            ]);
        }

        return response()->json(['message' => 'Nenhum arquivo enviado.'], 400);
    }

    /**
     * Criar nova categoria
     */
    public function store(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'min_age' => 'nullable|integer|min:0',
            'max_age' => 'nullable|integer|min:0',
            'gender' => 'nullable|in:male,female,mixed',
            'max_teams' => 'nullable|integer|min:0',
            'parent_id' => 'nullable|exists:categories,id',
            'price' => 'nullable|numeric|min:0',
            'included_products' => 'nullable|array',
            'included_products.*.product_id' => 'required|exists:products,id',
            'included_products.*.quantity' => 'required|integer|min:1',
            'included_products.*.required' => 'boolean'
        ]);

        $category = $championship->categories()->create($validated);

        AuditLogger::log('category.create_in_champ', "Criou a categoria '{$category->name}' no campeonato '{$championship->name}'", [
            'category_id' => $category->id,
            'championship_id' => $championship->id
        ]);

        return response()->json([
            'message' => 'Categoria criada com sucesso!',
            'category' => $category
        ], 201);
    }

    /**
     * Atualizar categoria
     */
    public function update(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'min_age' => 'nullable|integer|min:0',
            'max_age' => 'nullable|integer|min:0',
            'gender' => 'nullable|in:male,female,mixed',
            'max_teams' => 'nullable|integer|min:0',
            'parent_id' => 'nullable|exists:categories,id',
            'price' => 'nullable|numeric|min:0',
            'included_products' => 'nullable|array',
            'included_products.*.product_id' => 'required|exists:products,id',
            'included_products.*.quantity' => 'required|integer|min:1',
            'included_products.*.required' => 'boolean'
        ]);

        $category->update($validated);

        AuditLogger::log('category.update_in_champ', "Editou a categoria '{$category->name}' (ID: {$categoryId})", [
            'category_id' => $categoryId,
            'championship_id' => $championshipId
        ]);

        return response()->json([
            'message' => 'Categoria atualizada com sucesso!',
            'category' => $category
        ]);
    }

    /**
     * Deletar categoria
     */
    public function destroy(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        // Verifica se há equipes vinculadas
        if ($category->teams()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível deletar categoria com equipes vinculadas.'
            ], 400);
        }

        $category->delete();

        AuditLogger::log('category.delete_in_champ', "Excluiu a categoria '{$category->name}' (ID: {$categoryId}) do campeonato '{$championship->name}'");

        return response()->json([
            'message' => 'Categoria deletada com sucesso!'
        ]);
    }

    /**
     * Adicionar equipe à categoria
     */
    public function addTeam(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        // Verifica se a equipe já está na categoria
        if ($category->teams()->where('team_id', $validated['team_id'])->exists()) {
            return response()->json([
                'message' => 'Equipe já está nesta categoria.'
            ], 400);
        }

        // Validação de elegibilidade de todos os membros do time (incluindo capitão)
        $team = \App\Models\Team::with(['players', 'captain'])->findOrFail($validated['team_id']);

        // Removida a validação automática do capitão global e dos jogadores globais do time ($team->captain e $team->players).
        // Isso porque no momento em que um time entra em um campeonato/categoria, o seu elenco local é vazio 
        // e o capitão da categoria pode ser definido depois. As validações ocorrerão no momento de adicionar o jogador.

        $category->teams()->attach($validated['team_id']);

        AuditLogger::log('category.team_add', "Vinculou o time (ID: {$validated['team_id']}) à categoria '{$category->name}'", [
            'category_id' => $category->id,
            'team_id' => $validated['team_id']
        ]);

        return response()->json([
            'message' => 'Equipe adicionada à categoria com sucesso!'
        ]);
    }

    /**
     * Remover equipe da categoria
     */
    public function removeTeam(Request $request, $championshipId, $categoryId, $teamId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $category->teams()->detach($teamId);

        AuditLogger::log('category.team_remove', "Removeu o time (ID: {$teamId}) da categoria '{$category->name}'", [
            'category_id' => $category->id,
            'team_id' => $teamId
        ]);

        return response()->json([
            'message' => 'Equipe removida da categoria com sucesso!'
        ]);
    }

    /**
     * Listar atletas vinculados a esta categoria e atletas disponíveis do campeonato
     */
    public function getAthletes(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)->findOrFail($categoryId);

        $race = \App\Models\Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            return response()->json([
                'category' => $category,
                'category_athletes' => [],
                'available_athletes' => []
            ]);
        }

        // Atletas atualmente nesta categoria
        $categoryAthletes = \App\Models\RaceResult::where('race_id', $race->id)
            ->where('category_id', $categoryId)
            ->with(['user', 'category'])
            ->orderBy('name', 'asc')
            ->get();

        // Todos os atletas inscritos no campeonato/corrida
        $allAthletes = \App\Models\RaceResult::where('race_id', $race->id)
            ->with(['user', 'category'])
            ->orderBy('name', 'asc')
            ->get();

        $enrolledUserIds = $categoryAthletes->pluck('user_id')->filter()->unique()->toArray();
        $enrolledResultIds = $categoryAthletes->pluck('id')->toArray();

        // Atletas disponíveis: que estão no campeonato mas NÃO nesta categoria
        $availableAthletes = $allAthletes->filter(function ($item) use ($enrolledUserIds, $enrolledResultIds) {
            if ($item->user_id) {
                return !in_array($item->user_id, $enrolledUserIds);
            }
            return !in_array($item->id, $enrolledResultIds);
        })->unique(function ($item) {
            return $item->user_id ?: 'result_' . $item->id;
        })->values();

        return response()->json([
            'category' => $category,
            'category_athletes' => $categoryAthletes,
            'available_athletes' => $availableAthletes
        ]);
    }

    /**
     * Adicionar um atleta a esta categoria
     */
    public function addAthlete(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)->findOrFail($categoryId);

        $user = $request->user();
        if ($user && $user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json(['message' => 'Você não tem permissão para editar este campeonato.'], 403);
        }

        $request->validate([
            'athlete_id' => 'nullable|integer',
            'user_id' => 'nullable|integer',
        ]);

        $race = \App\Models\Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            $race = \App\Models\Race::create([
                'championship_id' => $championshipId,
                'start_datetime' => $championship->start_date ?? now(),
                'location_name' => 'A definir',
                'kits_info' => 'Informações do kit em breve'
            ]);
        }

        if ($request->filled('athlete_id')) {
            $sourceResult = \App\Models\RaceResult::where('race_id', $race->id)->findOrFail($request->athlete_id);

            // Verifica se o atleta já está cadastrado nesta categoria
            $alreadyEnrolled = \App\Models\RaceResult::where('race_id', $race->id)
                ->where('category_id', $categoryId)
                ->where(function ($q) use ($sourceResult) {
                    if ($sourceResult->user_id) {
                        $q->where('user_id', $sourceResult->user_id);
                    } else {
                        $q->where('name', $sourceResult->name);
                    }
                })->exists();

            if ($alreadyEnrolled) {
                return response()->json(['message' => 'Atleta já está inscrito nesta categoria.'], 400);
            }

            // Se o atleta estava sem categoria definida (category_id null), atualiza o registro existente
            if ($sourceResult->category_id === null) {
                $sourceResult->update(['category_id' => $categoryId]);
                $finalResult = $sourceResult;
            } else {
                // Atleta já possui outra categoria: cria uma nova inscrição nesta categoria mantendo dados essenciais
                $finalResult = \App\Models\RaceResult::create([
                    'race_id' => $race->id,
                    'user_id' => $sourceResult->user_id,
                    'name' => $sourceResult->name,
                    'bib_number' => $sourceResult->bib_number,
                    'team_name' => $sourceResult->team_name,
                    'category_id' => $categoryId,
                    'status_payment' => $sourceResult->status_payment ?? 'paid',
                    'payment_method' => $sourceResult->payment_method ?? 'manual',
                    'payment_group_id' => $sourceResult->payment_group_id,
                    'asaas_payment_id' => $sourceResult->asaas_payment_id,
                ]);
            }

            AuditLogger::log('category.athlete_add', "Vinculou o atleta '{$sourceResult->name}' (BIB: {$sourceResult->bib_number}) à categoria '{$category->name}'", [
                'category_id' => $categoryId,
                'athlete_id' => $finalResult->id,
                'race_id' => $race->id
            ]);

            $finalResult->load(['user', 'category.parent', 'race.championship']);
            if ($finalResult->user && \App\Services\TeamInscriptionService::isValidAthleteEmail($finalResult->user->email)) {
                try {
                    \Illuminate\Support\Facades\Mail::to(trim($finalResult->user->email))
                        ->send(new \App\Mail\InscriptionConfirmedMail($finalResult));
                } catch (\Throwable $mailEx) {
                    \Illuminate\Support\Facades\Log::error("Erro ao enviar confirmação de categoria ao atleta: " . $mailEx->getMessage());
                }
            }

            return response()->json([
                'message' => 'Atleta adicionado à categoria com sucesso!',
                'result' => $finalResult
            ]);
        }

        if ($request->filled('user_id')) {
            $athleteUser = \App\Models\User::findOrFail($request->user_id);

            // Verifica se tem inscrição sem categoria
            $nullResult = \App\Models\RaceResult::where('race_id', $race->id)
                ->where('user_id', $athleteUser->id)
                ->whereNull('category_id')
                ->first();

            if ($nullResult) {
                $nullResult->update(['category_id' => $categoryId]);
                $finalResult = $nullResult;
            } else {
                $existing = \App\Models\RaceResult::where('race_id', $race->id)
                    ->where('user_id', $athleteUser->id)
                    ->first();

                $bib = $existing?->bib_number;
                if (!$bib) {
                    $lastBib = \App\Models\RaceResult::where('race_id', $race->id)->max(\Illuminate\Support\Facades\DB::raw('CAST(bib_number AS SIGNED)'));
                    $bib = (string) ($lastBib ? $lastBib + 1 : 1);
                }

                $finalResult = \App\Models\RaceResult::create([
                    'race_id' => $race->id,
                    'user_id' => $athleteUser->id,
                    'name' => $athleteUser->name,
                    'bib_number' => $bib,
                    'team_name' => $existing?->team_name,
                    'category_id' => $categoryId,
                    'status_payment' => $existing?->status_payment ?? 'paid',
                    'payment_method' => $existing?->payment_method ?? 'manual',
                ]);
            }

            AuditLogger::log('category.athlete_add', "Vinculou o atleta '{$athleteUser->name}' à categoria '{$category->name}'", [
                'category_id' => $categoryId,
                'user_id' => $athleteUser->id,
                'race_id' => $race->id
            ]);

            $finalResult->load(['user', 'category.parent', 'race.championship']);
            if (\App\Services\TeamInscriptionService::isValidAthleteEmail($athleteUser->email)) {
                try {
                    \Illuminate\Support\Facades\Mail::to(trim($athleteUser->email))
                        ->send(new \App\Mail\InscriptionConfirmedMail($finalResult));
                } catch (\Throwable $mailEx) {
                    \Illuminate\Support\Facades\Log::error("Erro ao enviar confirmação de categoria ao atleta: " . $mailEx->getMessage());
                }
            }

            return response()->json([
                'message' => 'Atleta adicionado à categoria com sucesso!',
                'result' => $finalResult
            ]);
        }

        return response()->json(['message' => 'Nenhum atleta informado.'], 422);
    }

    /**
     * Remover um atleta desta categoria
     */
    public function removeAthlete(Request $request, $championshipId, $categoryId, $athleteId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)->findOrFail($categoryId);

        $user = $request->user();
        if ($user && $user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json(['message' => 'Você não tem permissão para editar este campeonato.'], 403);
        }

        $race = \App\Models\Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            return response()->json(['message' => 'Corrida não encontrada.'], 404);
        }

        $result = \App\Models\RaceResult::where('race_id', $race->id)
            ->where('category_id', $categoryId)
            ->where(function ($q) use ($athleteId) {
                $q->where('id', $athleteId)->orWhere('user_id', $athleteId);
            })->first();

        if (!$result) {
            return response()->json(['message' => 'Atleta não encontrado nesta categoria.'], 404);
        }

        $userId = $result->user_id;
        $otherResultsCount = $userId
            ? \App\Models\RaceResult::where('race_id', $race->id)->where('user_id', $userId)->where('id', '!=', $result->id)->count()
            : 0;

        $athleteName = $result->name;

        if ($otherResultsCount > 0) {
            // Atleta está em outras categorias do campeonato, exclui apenas esta participação
            $result->delete();
            $msg = "Atleta removido da categoria com sucesso.";
        } else {
            // Era a única categoria do atleta: mantemos ele registrado no campeonato com category_id null
            // para que possa ser alocado em outras categorias depois pelo admin
            $result->update(['category_id' => null]);
            $msg = "Atleta desvinculado da categoria e mantido como participante geral do evento.";
        }

        AuditLogger::log('category.athlete_remove', "Removeu o atleta '{$athleteName}' da categoria '{$category->name}'", [
            'category_id' => $categoryId,
            'athlete_id' => $athleteId,
            'race_id' => $race->id
        ]);

        return response()->json([
            'message' => $msg
        ]);
    }
}
