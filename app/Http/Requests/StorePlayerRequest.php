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
            'email' => 'required|email|unique:users,email',
            'cpf' => 'nullable|string|unique:users,cpf', // CPF deve ser único
            'phone' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'photo' => 'nullable|image|max:2048',
            'team_id' => 'nullable|exists:teams,id', // Opcional: já vincular a time
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome do jogador é obrigatório.',
            'email.required' => 'O e-mail é obrigatório.',
            'email.unique' => 'Este e-mail já está cadastrado.',
            'cpf.unique' => 'Este CPF já está cadastrado.',
        ];
    }
}
