<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->is_admin;
    }

    public function rules(): array
    {
        $rules = [
            'championship_id' => 'required|exists:championships,id',
            'start_time' => 'required|date',
            'location' => 'nullable|string|max:255',
            'round_name' => 'nullable|string|max:100',
            'round_number' => 'nullable|integer|min:1',
            'category_id' => 'nullable|exists:categories,id',
            'group_name' => 'nullable|string|max:255',
        ];

        $championshipId = $this->input('championship_id');
        $championship = \App\Models\Championship::find($championshipId);
        $isTimeOrLap = $championship && in_array($championship->format, ['racing', 'time_ranking', 'laps']);

        if ($isTimeOrLap) {
            $rules['home_team_id'] = 'nullable|exists:teams,id|different:away_team_id';
            $rules['away_team_id'] = 'nullable|exists:teams,id';
        } else {
            $rules['home_team_id'] = 'required|exists:teams,id|different:away_team_id';
            $rules['away_team_id'] = 'required|exists:teams,id';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'championship_id.required' => 'O campeonato é obrigatório.',
            'home_team_id.required' => 'A equipe mandante é obrigatória.',
            'away_team_id.required' => 'A equipe visitante é obrigatória.',
            'home_team_id.different' => 'As equipes devem ser diferentes.',
            'start_time.required' => 'A data e hora da partida são obrigatórias.',
        ];
    }
}
