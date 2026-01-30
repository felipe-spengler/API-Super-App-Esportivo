<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'format' => 'required|in:league,knockout,group_knockout,league_playoffs,double_elimination,racing,groups', // Expanded formats
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
