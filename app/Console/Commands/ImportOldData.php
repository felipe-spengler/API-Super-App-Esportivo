<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\Championship;
use App\Models\Category;
use App\Models\MatchEvent;
use App\Models\MatchSet;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImportOldData extends Command
{
    protected $signature = 'import:old-data';
    protected $description = 'Import matches and stats from old system CSVs (with headers)';

    protected $oldChampionshipIds = [];
    protected $oldCategoryIds = [];

    public function handle()
    {
        Schema::disableForeignKeyConstraints();

        $this->info("Importing Users (System)...");
        $this->importUsers();

        $this->info("Importing Participants (Players as Users)...");
        $this->importParticipants();

        $this->info("Importing Teams...");
        $this->importTeams();

        $this->info("Importing Championships & Categories...");
        $this->importChampionshipsAndCategories();

        $this->info("Importing Matches (Status + Sets Volei)...");
        $this->importMatches();

        $this->info("Importing Match Sets...");
        $this->importSets(); // New

        $this->info("Importing Match Events...");
        $this->importEvents(); // New

        Schema::enableForeignKeyConstraints();
        $this->info("Done.");
    }

    private function importUsers()
    {
        User::unguard();
        $file = base_path('database/data/usuarios.csv');
        if (!file_exists($file))
            return;

        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            // 0:id, 1:nome, 2:email, 3:senha, 4:tipo, 5:created_at
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;

            User::updateOrCreate(['id' => $row[0]], [
                'name' => $row[1],
                'email' => $row[2],
                'password' => $row[3],
                'club_id' => 1,
                'is_admin' => (isset($row[4]) && $row[4] === 'admin'),
            ]);
        }
        fclose($handle);
        User::reguard();
    }

    private function importParticipants()
    {
        User::unguard();
        $file = base_path('database/data/participantes.csv');
        if (!file_exists($file))
            return;

        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;
            $id = $row[0];
            $name = $row[1] ?? 'Participante ' . $id;
            if (!empty($row[2]))
                $name .= " (" . $row[2] . ")";
            $email = "player{$id}@simulador.local";

            User::updateOrCreate(['id' => $id], [
                'name' => $name,
                'email' => $email,
                'password' => '$2y$12$K.J.W.Z.X.123456789012345678901234567890', // Dummy hash
                'club_id' => 1,
                'is_admin' => false,
            ]);
        }
        fclose($handle);
        User::reguard();
    }

    // ... (readCsvWithHeader, importUsers, importParticipants kept same until importTeams) ...

    private function importTeams()
    {
        Team::unguard();
        $file = base_path('database/data/equipes.csv');
        if (!file_exists($file))
            return;

        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;
            // Correct Mapping based on CSV view:
            // 0:id, 1:sys_id?, 2:club_id?, 3:name, 4:sigla, 5:city, 8:logo

            $logo = $row[8] ?? null;
            if ($logo && $logo == 'NULL')
                $logo = null;

            Team::updateOrCreate(['id' => $row[0]], [
                'name' => $row[3] ?? 'Team ' . $row[0],
                'club_id' => 1, // Defaulting to club 1 for now
                'logo_url' => $logo ? "https://sgce.clubetoledao.com.br/assets/logos/" . $logo : null,
                'primary_color' => '#000000'
            ]);
        }
        fclose($handle);
        Team::reguard();
    }

    private function importChampionshipsAndCategories()
    {
        Championship::unguard();
        Category::unguard();

        $file = base_path('database/data/campeonatos.csv');
        if (!file_exists($file))
            return;

        // Pass 1: Championships (Parent ID empty or NULL)
        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;
            // 0:id, 1:id_esporte, 2:nome, 3:pai, 4:data, 7:status

            $parentId = $row[9];
            if (empty($parentId) || $parentId === 'NULL') {
                $status = 'upcoming';
                $oldStatus = strtolower($row[7] ?? '');
                if (strpos($oldStatus, 'andamento') !== false)
                    $status = 'ongoing';
                if (strpos($oldStatus, 'finalizado') !== false)
                    $status = 'finished';
                if (strpos($oldStatus, 'inscri') !== false)
                    $status = 'registrations_open';

                $champ = Championship::updateOrCreate(['id' => $row[0]], [
                    'name' => $row[2],
                    'club_id' => 1,
                    'sport_id' => $row[1] ?: 1,
                    'start_date' => $row[4] ?: now(),
                    'status' => $status,
                    'awards' => null
                ]);
                $this->oldChampionshipIds[$row[0]] = $champ->id;
            }
        }
        fclose($handle);

        // Pass 2: Categories
        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;

            $parentId = $row[9];
            if (!empty($parentId) && $parentId !== 'NULL') {
                $newChampId = $this->oldChampionshipIds[$parentId] ?? null;
                if ($newChampId) {
                    $cat = Category::updateOrCreate(['id' => $row[0]], [
                        'championship_id' => $newChampId,
                        'name' => $row[2],
                        'parent_id' => null,
                        'price' => 0.00
                    ]);
                    $this->oldCategoryIds[$row[0]] = ['id' => $cat->id, 'championship_id' => $newChampId];
                }
            }
        }
        fclose($handle);

        Championship::reguard();
        Category::reguard();
    }

    private function importMatches()
    {
        GameMatch::unguard();
        $file = base_path('database/data/partidas.csv');
        if (!file_exists($file))
            return;

        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;

            $id = $row[0];
            $champRef = $row[1];

            $champId = null;
            $catId = null;

            if (isset($this->oldCategoryIds[$champRef])) {
                $info = $this->oldCategoryIds[$champRef];
                $catId = $info['id'];
                $champId = $info['championship_id'];
            } elseif (isset($this->oldChampionshipIds[$champRef])) {
                $champId = $this->oldChampionshipIds[$champRef];
            } else {
                continue;
            }

            $status = 'scheduled';
            $oldStatus = strtolower($row[11] ?? '');
            if (strpos($oldStatus, 'andamento') !== false)
                $status = 'live'; // Changed to 'live' to match enum
            if (strpos($oldStatus, 'finalizada') !== false)
                $status = 'finished';

            $startTime = $row[6];
            if (!$startTime || strpos($startTime, '0000') !== false)
                $startTime = now(); // Default to now instead of old date

            GameMatch::updateOrCreate(['id' => $id], [
                'championship_id' => $champId,
                'category_id' => $catId,
                'home_team_id' => $row[2],
                'away_team_id' => $row[3],
                'home_score' => (int) $row[4],
                'away_score' => (int) $row[5],
                'start_time' => $startTime,
                'location' => $row[7] ?: 'Local não informado',
                'status' => $status,
                'round_name' => $row[14] ?? '',
                'awards' => null
            ]);
        }
        fclose($handle);
        GameMatch::reguard();
    }

    private function importSets()
    {
        MatchSet::unguard();
        $file = base_path('database/data/sumulas_pontos_sets.csv');
        if (!file_exists($file))
            return;

        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            // 0:id, 1:match_id, 2:set_name(1º Set), 3:score_home, 4:score_away
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;

            $setNum = (int) filter_var($row[2], FILTER_SANITIZE_NUMBER_INT);
            if ($setNum <= 0)
                $setNum = 1;

            MatchSet::updateOrCreate(['id' => $row[0]], [
                'game_match_id' => $row[1],
                'set_number' => $setNum,
                'home_score' => (int) $row[3],
                'away_score' => (int) $row[4]
            ]);
        }
        fclose($handle);
        MatchSet::reguard();
    }

    private function importEvents()
    {
        MatchEvent::unguard();
        $file = base_path('database/data/sumulas_eventos.csv');
        if (!file_exists($file))
            return;

        $handle = fopen($file, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            // 0:id, 1:match_id, 2:player_id, 3:team_id, 4:type_str, 5:value/minute
            if (!isset($row[0]) || !is_numeric($row[0]))
                continue;

            $type = $this->mapEventType($row[4]);
            if (!$type)
                continue;

            MatchEvent::updateOrCreate(['id' => $row[0]], [
                'game_match_id' => $row[1],
                'player_id' => ($row[2] && $row[2] != 'NULL') ? $row[2] : null,
                'team_id' => ($row[3] && $row[3] != 'NULL') ? $row[3] : null,
                'event_type' => $type,
                'game_time' => (string) ($row[5] ?? '0'),
                'period' => $row[7] ?? null,
                'value' => 1 // Default value 1 for occurrences
            ]);
        }
        fclose($handle);
        MatchEvent::reguard();
    }

    private function mapEventType($oldType)
    {
        $oldType = strtolower($oldType);
        if (strpos($oldType, 'gol') !== false)
            return 'goal';
        if (strpos($oldType, 'amarelo') !== false)
            return 'yellow_card';
        if (strpos($oldType, 'vermelho') !== false)
            return 'red_card';
        if (strpos($oldType, 'azul') !== false)
            return 'blue_card'; // Futsal thing maybe
        if (strpos($oldType, 'bloqueio') !== false || strpos($oldType, 'block') !== false)
            return 'block';
        if (strpos($oldType, 'saque') !== false || strpos($oldType, 'ace') !== false)
            return 'ace';
        if (strpos($oldType, 'ponto') !== false)
            return 'point';
        return null;
    }

    private function extractAwards($row)
    {
        $categories = [
            // Football / General
            'craque' => 'melhor_jogador',
            'goleiro' => 'melhor_goleiro',
            'lateral' => 'melhor_lateral',
            'meia' => 'melhor_meia',
            'atacante' => 'melhor_atacante',
            'artilheiro' => 'melhor_artilheiro',
            'assistencia' => 'melhor_assistencia',
            'volante' => 'melhor_volante',
            'estreante' => 'melhor_estreante',
            'zagueiro' => 'melhor_zagueiro',

            // Volleyball
            'levantadora' => 'melhor_levantadora',
            'libero' => 'melhor_libero',
            'oposta' => 'melhor_oposta',
            'ponteira' => 'melhor_ponteira',
            'central' => 'melhor_central',
            'pontuador' => 'maior_pontuador',
            'saque' => 'melhor_saque',
            'bloqueio' => 'melhor_bloqueio'
        ];

        $awards = [];
        foreach ($categories as $key => $colSuffix) {
            if (!empty($row["id_{$colSuffix}"]) && $row["id_{$colSuffix}"] != 'NULL') {
                $awards[$key] = [
                    'player_id' => $this->val($row["id_{$colSuffix}"]),
                    'photo_id' => isset($row["id_foto_selecionada_{$colSuffix}"]) ? $this->val($row["id_foto_selecionada_{$colSuffix}"]) : null
                ];
                // Also check specifically for photo column naming variations if needed
                if (!$awards[$key]['photo_id']) {
                    // Some might use id_foto_{suffix} instead of id_foto_selecionada_{suffix}
                    // e.g. line 41 in source: c.id_foto_melhor_libero AS id_foto_selecionada_melhor_libero
                    // The CSV likely has the ALIAS or the original.
                    // Assuming CSV export used the alias or consistent naming.
                    // If CSV has 'id_foto_melhor_libero', we might need to check that too.
                    if (isset($row["id_foto_{$colSuffix}"])) {
                        $awards[$key]['photo_id'] = $this->val($row["id_foto_{$colSuffix}"]);
                    }
                }
            }
        }
        return count($awards) > 0 ? $awards : null;
    }

    private function val($v)
    {
        return (is_numeric($v) && $v > 0) ? $v : null;
    }
}
