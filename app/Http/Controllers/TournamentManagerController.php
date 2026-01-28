<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Category;

class TournamentManagerController extends Controller
{
    // Listar todos (Admin)
    public function index()
    {
        return response()->json(Championship::with('club')->orderBy('created_at', 'desc')->get());
    }

    // Criar Novo
    public function store(Request $request)
    {
        $validated = $request->validate([
            'club_id' => 'required|exists:clubs,id',
            'sport_id' => 'required|exists:sports,id',
            'name' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
        ]);

        $champ = Championship::create($validated);
        return response()->json($champ, 201);
    }

    // Atualizar
    public function update(Request $request, $id)
    {
        $champ = Championship::findOrFail($id);
        $champ->update($request->all());
        return response()->json($champ);
    }

    // Adicionar Categoria
    public function addCategory(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'price' => 'numeric',
            'gender' => 'required|in:M,F,MISTO'
        ]);

        $category = Category::create([
            'championship_id' => $id,
            ...$validated
        ]);

        return response()->json($category, 201);
    }
}
