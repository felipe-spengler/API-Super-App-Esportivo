<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Club;
use App\Models\SystemSetting;
use App\Services\ArtGeneratorService;
use App\Services\ArtRenderer;

class ArtTemplateController extends Controller
{
    protected $renderer;
    protected $generator;

    public function __construct(ArtRenderer $renderer, ArtGeneratorService $generator)
    {
        $this->renderer = $renderer;
        $this->generator = $generator;
    }

    public function saveTemplate(Request $request)
    {
        $name = $request->input('name');
        $elements = $request->input('elements');
        $canvas = $request->input('canvas');
        $bgUrl = $request->input('bg_url');
        $championshipId = $request->input('championship_id');

        $key = $this->generator->getTemplateKey($name);

        $data = [
            'elements' => $elements,
            'canvas' => $canvas,
            'bg_url' => $bgUrl,
            'name' => $name
        ];

        if ($championshipId) {
            $championship = Championship::find($championshipId);
            if ($championship) {
                $user = auth()->user();
                if ($user && $user->club_id == $championship->club_id) {
                    $settings = $championship->art_settings ?? [];
                    $settings['templates'] = $settings['templates'] ?? [];
                    $settings['templates'][$key] = $data;
                    $championship->art_settings = $settings;
                    $championship->save();
                    return response()->json(['message' => 'Template salvo para o campeonato']);
                }
            }
        } else {
            // Global Club Template
            $user = auth()->user();
            if ($user && $user->club_id) {
                $club = Club::find($user->club_id);
                $settings = $club->art_settings ?? [];
                $settings['templates'] = $settings['templates'] ?? [];
                $settings['templates'][$key] = $data;
                $club->art_settings = $settings;
                $club->save();
                return response()->json(['message' => 'Template salvo para o clube']);
            }
        }

        SystemSetting::updateOrCreate(['key' => $key], ['value' => json_encode($data)]);
        return response()->json(['message' => 'Template global salvo']);
    }

    public function getTemplate(Request $request)
    {
        $name = $request->query('name');
        $championshipId = $request->query('championship_id');
        $key = $this->generator->getTemplateKey($name);

        $championship = $championshipId ? Championship::find($championshipId) : null;
        $user = auth()->user();
        $club = ($user && $user->club_id) ? Club::find($user->club_id) : ($championship ? $championship->club : null);

        $setting = SystemSetting::where('key', $key)->first();
        $default = $this->generator->getDefaultTemplate($key);

        $responseTemplate = null;
        if ($championship && !empty($championship->art_settings['templates'][$key])) {
            $responseTemplate = $championship->art_settings['templates'][$key];
        } elseif ($club && !empty($club->art_settings['templates'][$key])) {
            $responseTemplate = $club->art_settings['templates'][$key];
        } elseif ($setting) {
            $responseTemplate = json_decode($setting->value, true);
        }

        if ($responseTemplate) {
            if ($default && isset($default['elements'])) {
                $ids = array_column($responseTemplate['elements'] ?? [], 'id');
                foreach ($default['elements'] as $el)
                    if (!in_array($el['id'] ?? '', $ids))
                        $responseTemplate['elements'][] = $el;
            }
            $this->addPreviewBg($responseTemplate, $request, $name, $club, $championship);
            return response()->json($responseTemplate);
        }

        if ($default) {
            $this->addPreviewBg($default, $request, $name, $club, $championship);
            return response()->json($default);
        }

        return response()->json(null);
    }

    private function addPreviewBg(&$template, $request, $name, $club, $championship)
    {
        if ($sport = $request->query('sport')) {
            $cat = str_contains(strtolower($name), 'programado') ? 'jogo_programado' : (str_contains(strtolower($name), 'craque') ? 'craque' : 'confronto');
            $bg = $this->renderer->getBackgroundFile($sport, $cat, $club, $championship);
            if ($bg)
                $template['preview_bg_url'] = $this->renderer->pathToUrl($bg);
        }
    }
}
