<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Sport;
use Illuminate\Support\Str;

class StoreChampionshipRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->is_admin;
    }

    /**
     * Normaliza sport_id e campos de modalidade antes da validação
     */
    protected function prepareForValidation(): void
    {
        $rawSport = $this->input('sport_id') ?? $this->input('sport') ?? $this->input('modality');

        if ($rawSport !== null && $rawSport !== '') {
            $sportId = self::resolveSportId($rawSport);
            if ($sportId) {
                $this->merge(['sport_id' => $sportId]);
            }
        }
    }

    /**
     * Converte IDs, slugs ou nomes para o sport_id inteiro oficial da tabela sports
     */
    public static function resolveSportId($value): ?int
    {
        if (is_numeric($value)) {
            $intId = (int) $value;
            return Sport::where('id', $intId)->exists() ? $intId : null;
        }

        if (!is_string($value)) {
            return null;
        }

        $clean = trim(mb_strtolower($value));

        // Mapeamento de aliases e variações comuns para o slug padrão do banco
        $aliases = [
            'futebol 7'        => 'futebol-7',
            'futebol7'          => 'futebol-7',
            'futebol-7'         => 'futebol-7',
            'fut 7'             => 'futebol-7',
            'fut7'              => 'futebol-7',
            'society'           => 'futebol-7',
            'futebol society'   => 'futebol-7',
            'futebol-society'   => 'futebol-7',
            'f7'                => 'futebol-7',
            'futebol de 7'      => 'futebol-7',
            'futebol'           => 'futebol',
            'futebol de campo'  => 'futebol',
            'futsal'            => 'futsal',
            'volei'             => 'volei',
            'vôlei'             => 'volei',
            'voleibol'          => 'volei',
            'basquete'          => 'basquete',
            'basquetebol'       => 'basquete',
            'handebol'          => 'handebol',
            'beach tennis'      => 'beach-tennis',
            'beach-tennis'      => 'beach-tennis',
            'tenis'             => 'tenis',
            'tênis'             => 'tenis',
            'futevolei'         => 'futevolei',
            'futevôlei'         => 'futevolei',
            'volei de praia'    => 'volei-praia',
            'volei-praia'       => 'volei-praia',
            'tenis de mesa'     => 'tenis-de-mesa',
            'tenis-mesa'        => 'tenis-de-mesa',
            'tenis-de-mesa'     => 'tenis-de-mesa',
            'jiu-jitsu'         => 'jiu-jitsu',
            'jiujitsu'          => 'jiu-jitsu',
            'corrida'           => 'corrida',
            'ciclismo'          => 'ciclismo',
            'mtb'               => 'mtb',
            'natacao'           => 'natacao',
            'natação'           => 'natacao',
        ];

        $targetSlug = $aliases[$clean] ?? Str::slug($clean);

        // 1. Busca pelo slug exato
        $sport = Sport::where('slug', $targetSlug)->first();
        if ($sport) {
            return $sport->id;
        }

        // 2. Busca pelo nome exato ou aproximado
        $sport = Sport::where('name', 'like', $clean)->first();
        if ($sport) {
            return $sport->id;
        }

        return null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'sport_id' => 'required|exists:sports,id',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'registration_start_date' => 'nullable|date',
            'registration_end_date' => 'nullable|date|after_or_equal:registration_start_date',
            'registration_type' => 'required|in:individual,team',
            'image' => 'nullable|image|max:2048', // Validação de upload
            'rules' => 'nullable|string',
            'format' => 'required|in:league,knockout,group_knockout,league_playoffs,double_elimination,racing,groups,time_ranking,laps', // Expanded formats
            'has_pcd_discount' => 'nullable|boolean',
            'pcd_discount_percentage' => 'nullable|numeric|min:0|max:100',
            'has_elderly_discount' => 'nullable|boolean',
            'elderly_discount_percentage' => 'nullable|numeric|min:0|max:100',
            'elderly_minimum_age' => 'nullable|integer|min:0',
            'allow_shopping_registration' => 'nullable|boolean',
            'include_repescagem_goals' => 'nullable|boolean',
            'include_repescagem_assists' => 'nullable|boolean',
            'include_repescagem_cards' => 'nullable|boolean',
            'include_repescagem_standings' => 'nullable|boolean',
            'include_knockout_standings' => 'nullable|boolean',
            'include_knockout_goals' => 'nullable|boolean',
            'include_knockout_assists' => 'nullable|boolean',
            'include_knockout_cards' => 'nullable|boolean',
            'location_name' => 'nullable|string',
            'bulk_discount_settings' => 'nullable|array',
        ];
    }

    /**
     * Mensagens de erro personalizadas
     */
    public function messages(): array
    {
        return [
            'name.required' => 'O nome do campeonato é obrigatório.',
            'sport_id.required' => 'Selecione um esporte.',
            'start_date.required' => 'A data de início é obrigatória.',
            'end_date.after_or_equal' => 'A data de fim deve ser posterior à data de início.',
            'format.required' => 'O formato da competição é obrigatório.',
        ];
    }
}
