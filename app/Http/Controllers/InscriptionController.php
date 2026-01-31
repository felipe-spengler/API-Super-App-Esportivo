<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class InscriptionController extends Controller
{
    // 1. Inscrever Time (Capitão)
    public function registerTeam(Request $request)
    {
        // Validação básica (MVP)
        $validated = $request->validate([
            'championship_id' => 'required|exists:championships,id',
            'category_id' => 'required|exists:categories,id',
            'team_name' => 'required|string',
            'players' => 'required|array|min:1', // Lista de { name, rg }
        ]);

        // Validação de elegibilidade do Capitão (Usuário logado)
        $category = \App\Models\Category::findOrFail($validated['category_id']);
        $check = $category->isUserEligible($request->user());
        if (!$check['eligible']) {
            return response()->json([
                'message' => 'Você não atende aos requisitos desta categoria.',
                'reason' => $check['reason']
            ], 403);
        }

        // Mock: Simula o processamento (No futuro, salvaria em team_rosters)
        // Por enquanto, vamos criar apenas o Time na tabela teams
        $team = \App\Models\Team::create([
            'club_id' => 1, // Hardcoded MVP
            'captain_id' => $request->user()->id,
            'name' => $validated['team_name'],
            'primary_color' => '#000000' // Default
        ]);

        return response()->json([
            'message' => 'Pré-inscrição realizada com sucesso!',
            'team_id' => $team->id,
            'next_step' => 'payment'
        ], 201);
    }

    // 2. Upload de Documentos (RG/CPF)
    public function uploadDocument(Request $request)
    {
        if ($request->hasFile('document')) {
            // $path = $request->file('document')->store('documents');
            return response()->json(['message' => 'Upload realizado', 'path' => 'mock/path.jpg']);
        }
        return response()->json(['message' => 'Arquivo não enviado'], 400);
    }
}
