<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\User;
use App\Models\RaceResult;
use App\Models\SystemSetting;
use Illuminate\Support\Str;
use App\Http\Controllers\Admin\Traits\ArtGdTrait;
use App\Http\Controllers\Admin\Traits\ArtCardTrait;

class IndividualArtController extends Controller
{
    use ArtGdTrait, ArtCardTrait;

    private $fontPath;
    private $secondaryFontPath;
    private $templatesPath;

    public function __construct()
    {
        $this->fontPath = public_path('assets/fonts/Roboto-Bold.ttf');
        $this->secondaryFontPath = $this->fontPath;
        $this->templatesPath = public_path('assets/templates/');
    }

    /**
     * Salva ou atualiza um template de arte individual.
     */
    public function saveTemplate(Request $request)
    {
        $name = $request->input('name');
        $elements = $request->input('elements');
        $canvas = $request->input('canvas');
        $bgUrl = $request->input('bg_url');
        $championshipId = $request->input('championship_id');

        $key = $this->getTemplateKey($name);
        $data = [
            'elements' => $elements, 
            'canvas' => $canvas, 
            'bg_url' => $bgUrl, 
            'name' => $name,
            'is_individual' => true
        ];

        if ($championshipId) {
            $championship = Championship::find($championshipId);
            if ($championship) {
                $user = auth()->user();
                // Permitir se for super admin OU se o clube bater
                if (($user && $user->role === 'super_admin') || ($user && $user->club_id == $championship->club_id)) {
                    $settings = $championship->art_settings ?? [];
                    if (!isset($settings['templates'])) {
                        $settings['templates'] = [];
                    }
                    $settings['templates'][$key] = $data;
                    $championship->art_settings = $settings;
                    $championship->save();
                    
                    return response()->json(['message' => 'Template individual salvo para o campeonato com sucesso']);
                }
            }
            return response()->json(['message' => 'Erro ao salvar template. Verifique permissões.'], 403);
        }

        // Caso base: salvar como configuração do sistema (fallback global)
        SystemSetting::updateOrCreate(
            ['key' => $key],
            ['value' => json_encode($data), 'group' => 'art_templates_individual']
        );

        return response()->json(['message' => 'Template individual salvo como padrão do sistema']);
    }

    /**
     * Recupera um template de arte individual.
     */
    public function getTemplate(Request $request)
    {
        $name = $request->query('name');
        $championshipId = $request->query('championship_id');
        $key = $this->getTemplateKey($name);

        $championship = null;
        if ($championshipId) {
            $championship = Championship::find($championshipId);
        }

        $user = auth()->user();
        $club = null;
        if ($championship) {
            $club = $championship->club;
        } elseif ($user && $user->club_id) {
            $club = \App\Models\Club::find($user->club_id);
        }

        $setting = SystemSetting::where('key', $key)->first();
        $default = $this->getDefaultTemplate($key);

        $responseTemplate = null;

        // Hierarquia: Campeonato -> Clube -> Sistema (SystemSetting) -> Default (Hardcoded no Trait)
        if ($championship && !empty($championship->art_settings['templates'][$key])) {
            $responseTemplate = $championship->art_settings['templates'][$key];
        } elseif ($club && !empty($club->art_settings['templates'][$key])) {
            $responseTemplate = $club->art_settings['templates'][$key];
        } elseif ($setting) {
            $responseTemplate = json_decode($setting->value, true);
        }

        if ($responseTemplate) {
            // Se houver novos elementos no default que não estão no salvo, mescla (evita quebrar ao adicionar features)
            if ($default && isset($default['elements'])) {
                $existingIds = array_column($responseTemplate['elements'] ?? [], 'id');
                foreach ($default['elements'] as $defEl) {
                    if (isset($defEl['id']) && !in_array($defEl['id'], $existingIds)) {
                        $responseTemplate['elements'][] = $defEl;
                    }
                }
            }
            return response()->json($responseTemplate);
        }

        return response()->json($default);
    }

    /**
     * Gera a arte individual de um atleta.
     */
    public function individualAthleteArt($championshipId, $resultId, $category, Request $request)
    {
        $championship = Championship::with(['sport', 'club'])->findOrFail($championshipId);
        
        // No contexto de campeonatos individuais (corridas), o ID passado pelo frontend 
        // na tela de Gestão de Inscritos refere-se ao ID da inscrição (RaceResult).
        $result = RaceResult::with('user')->find($resultId);
        
        if ($result && $result->user) {
            $athlete = $result->user;
            $displayName = $result->name ?: $athlete->name;
        } else {
            // Fallback para caso o ID seja realmente o do User (legado ou outros fluxos)
            $athlete = User::findOrFail($resultId);
            $displayName = $athlete->name;
        }

        $this->loadClubResources($championship->club);
        $sport = strtolower($championship->sport->name ?? 'individual');

        // Parâmetros extras passados via query (Rank, Nome da Categoria, etc)
        $rank = $request->query('rank', '');
        $catName = $request->query('category_name', '');

        // Mapeamento de categorias internas para os templates
        $cardCategory = $category;
        if ($category === 'confirmed') $cardCategory = 'atleta_confirmado';
        if ($category === 'result') $cardCategory = 'colocacao';

        return $this->createCard($athlete, $championship, $sport, $cardCategory, null, null, null, $championship->club, [
            '{COLOCACAO}' => $rank,
            '{CATEGORIA}' => mb_strtoupper($catName),
            '{ATLETA}' => mb_strtoupper($displayName),
            '{JOGADOR}' => mb_strtoupper($displayName)
        ]);
    }

    /**
     * Define a chave do template baseado no nome amigável.
     */
    private function getTemplateKey($name)
    {
        $map = [
            'Atleta Confirmado' => 'art_layout_individual_confirmed',
            'Colocação do Atleta' => 'art_layout_individual_placement',
        ];
        
        if (isset($map[$name])) {
            return $map[$name];
        }

        // Fallback para nomes customizados
        return 'art_layout_individual_' . Str::slug($name);
    }
}
