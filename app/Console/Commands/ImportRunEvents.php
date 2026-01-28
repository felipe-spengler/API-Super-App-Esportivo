<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Championship;
use App\Models\Category;
use App\Models\Race;
use App\Models\RaceResult;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImportRunEvents extends Command
{
    protected $signature = 'import:run-events';
    protected $description = 'Import RunEvents data from CSVs';

    private $userMap = [];

    public function handle()
    {
        Schema::disableForeignKeyConstraints();

        $this->info("Importing Users...");
        $this->importUsers();

        $this->info("Importing Events (Championships)...");
        $this->importEvents();

        $this->info("Importing Categories...");
        $this->importCategories();

        $this->info("Importing Results...");
        $this->importResults();

        Schema::enableForeignKeyConstraints();
        $this->info("Done.");
    }

    private function importUsers()
    {
        $file = base_path('database/data/usuarios.csv');
        if (!file_exists($file))
            return;

        $handle = fopen($file, "r");
        while (($data = fgetcsv($handle, 2000, ",")) !== FALSE) {
            // 0:id, 1:nome, 2:email, 3:senha, 4:cpf, 5:data_nascimento, 7:telefone
            $csvId = $data[0] ?? null;
            if (!$csvId || !is_numeric($csvId))
                continue;

            $email = $data[2] ?? null;
            if (!$email)
                continue;

            $existing = DB::table('users')->where('email', $email)->first();

            if ($existing) {
                $this->userMap[$csvId] = $existing->id;
            } else {
                $existingById = DB::table('users')->find($csvId);

                $userData = [
                    'name' => $data[1] ?? 'User ' . $csvId,
                    'email' => $email,
                    'password' => $data[3] ?? bcrypt('123456'),
                    'cpf' => (!empty($data[4]) && $data[4] !== 'NULL') ? $data[4] : null,
                    'birth_date' => (!empty($data[5]) && $data[5] !== 'NULL') ? $data[5] : null,
                    'phone' => (!empty($data[7]) && $data[7] !== 'NULL') ? $data[7] : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if ($existingById) {
                    $newId = DB::table('users')->insertGetId($userData);
                    $this->userMap[$csvId] = $newId;
                } else {
                    $userData['id'] = $csvId;
                    DB::table('users')->insert($userData);
                    $this->userMap[$csvId] = $csvId;
                }
            }
        }
        fclose($handle);
    }

    private function importEvents()
    {
        $file = base_path('database/data/eventos.csv');
        if (!file_exists($file))
            return;

        Championship::unguard();
        $handle = fopen($file, "r");
        while (($data = fgetcsv($handle, 2000, ",")) !== FALSE) {
            // 0:id, 1:nome, 3:local_evento, 4:data_evento, 5:tipo_evento
            $id = $data[0] ?? null;
            if (!$id || !is_numeric($id))
                continue;

            $sportId = 3; // Default Corrida
            if (isset($data[5]) && strtolower($data[5]) == 'bike')
                $sportId = 3; // Mantemos 3 se o ID do esporte bike/corrida for o mesmo ou ajustar conforme seed

            Championship::updateOrCreate(['id' => $id], [
                'club_id' => 5, // RunEvents
                'sport_id' => $sportId,
                'name' => $data[1] ?? 'Evento sem nome',
                'start_date' => $data[4] ?? now(),
                'status' => 'finished',
                'awards' => []
            ]);

            Race::updateOrCreate(['championship_id' => $id], [
                'start_datetime' => $data[4] ?? now(),
                'location_name' => (!empty($data[3]) && $data[3] !== 'NULL') ? $data[3] : '',
            ]);
        }
        fclose($handle);
        Championship::reguard();
    }

    private function importCategories()
    {
        $file = base_path('database/data/categorias.csv');
        if (!file_exists($file))
            return;

        Category::unguard();
        $handle = fopen($file, "r");
        while (($data = fgetcsv($handle, 2000, ",")) !== FALSE) {
            // 0:id, 1:id_evento, 2:nome
            $id = $data[0] ?? null;
            if (!$id || !is_numeric($id))
                continue;

            Category::updateOrCreate(['id' => $id], [
                'championship_id' => $data[1] ?? null,
                'name' => $data[2] ?? 'Categoria ' . $id,
                'description' => isset($data[4]) ? ($data[4] == 'misto' ? 'General' : ucfirst($data[4])) : '',
            ]);
        }
        fclose($handle);
        Category::reguard();
    }

    private function importResults()
    {
        $inscFile = base_path('database/data/inscricoes.csv');
        if (!file_exists($inscFile))
            return;

        $inscriptions = [];
        $handle = fopen($inscFile, "r");
        while (($data = fgetcsv($handle, 2000, ",")) !== FALSE) {
            // 0:id, 2:id_usuario, 4:id_evento, 5:id_categoria
            $id = $data[0] ?? null;
            if (!$id || !is_numeric($id))
                continue;
            $inscriptions[$id] = [
                'user_id' => $data[2] ?? null,
                'category_id' => $data[5] ?? null
            ];
        }
        fclose($handle);

        $resFile = base_path('database/data/resultados.csv');
        if (!file_exists($resFile))
            return;

        RaceResult::unguard();
        $handle = fopen($resFile, "r");
        while (($data = fgetcsv($handle, 2000, ",")) !== FALSE) {
            // 0:id, 1:id_inscricao, 2:tempo, 3:posicao, 4:posicao_categoria, 6:id_evento
            $id = $data[0] ?? null;
            if (!$id || !is_numeric($id))
                continue;

            $inscId = $data[1] ?? null;
            if (!$inscId || !isset($inscriptions[$inscId]))
                continue;

            $csvUserId = $inscriptions[$inscId]['user_id'];
            $realUserId = $this->userMap[$csvUserId] ?? null;
            if (!$realUserId)
                continue;

            $catId = $inscriptions[$inscId]['category_id'];
            $champId = $data[6] ?? null;

            if (!$champId)
                continue;

            $race = Race::where('championship_id', $champId)->first();
            if (!$race)
                continue;

            $userName = DB::table('users')->where('id', $realUserId)->value('name');

            RaceResult::updateOrCreate(['id' => $id], [
                'race_id' => $race->id,
                'user_id' => $realUserId,
                'category_id' => $catId,
                'name' => $userName ?: 'Unknown',
                'net_time' => $data[2] ?? '00:00:00',
                'gross_time' => $data[2] ?? '00:00:00',
                'position_general' => $data[3] ?? 0,
                'position_category' => $data[4] ?? 0,
            ]);
        }
        fclose($handle);

        RaceResult::reguard();
    }
}
