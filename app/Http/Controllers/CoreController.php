<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CoreController extends Controller
{
    // 1. Listar todas as cidades disponíveis
    public function cities()
    {
        return response()->json(\App\Models\City::all());
    }

    // 2. Listar clubes de uma cidade (Busca por Slug ou ID)
    public function clubs($citySlug)
    {
        $city = \App\Models\City::where('slug', $citySlug)->firstOrFail();
        return response()->json($city->clubs()->where('is_active', true)->get());
    }

    // 3. Detalhes de um Clube Específico (incluindo cores e modalidades)
    public function clubDetails($clubSlug)
    {
        $club = \App\Models\Club::where('slug', $clubSlug)->firstOrFail();

        // Buscar esportes que possuem campeonatos neste clube
        $sportIds = $club->championships()->select('sport_id')->distinct()->pluck('sport_id');
        $activeSports = \App\Models\Sport::whereIn('id', $sportIds)->get();

        // Adicionar atributo dinâmico
        $club->active_sports_list = $activeSports;

        return response()->json($club);
    }

    // 4. Listar catálogo de esportes Global
    public function sports()
    {
        return response()->json(\App\Models\Sport::all());
    }
}
