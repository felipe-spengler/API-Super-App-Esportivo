<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePlayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->is_admin;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'email' => 'nullable|email', // Removed unique to allow empty emails or temp emails generated in controller
            'cpf' => 'nullable|string', // Removed unique to prevent conflicts with optional CPFs
            'phone' => 'nullable|string',
            'gender' => 'nullable|string',
            'address' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'photo' => 'nullable|image|max:2048',
            'team_id' => 'nullable|exists:teams,id',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome do jogador é obrigatório.',
            'email.unique' => 'Este e-mail já está cadastrado.',
            'cpf.unique' => 'Este CPF já está cadastrado.',
        ];
    }
}
