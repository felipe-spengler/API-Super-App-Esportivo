<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->is_admin;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'city' => 'nullable|string|max:255',
            'logo' => 'nullable|image|max:2048',
            'primary_color' => 'nullable|string|regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/',
            'secondary_color' => 'nullable|string|regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/',
            'captain_id' => 'nullable|exists:users,id',
            'championship_id' => 'nullable|exists:championships,id', // Opcional: já vincular ao criar
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome da equipe é obrigatório.',
            'primary_color.regex' => 'A cor primária deve ser um código Hex válido (ex: #FF0000).',
        ];
    }
}
