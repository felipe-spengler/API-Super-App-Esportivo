<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SystemSetting;
use App\Services\AuditLogger;

class AdminSystemSettingController extends Controller
{
    public function index(Request $request)
    {
        // Only super admin should access this (middleware check usually)
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $settings = SystemSetting::all()->mapWithKeys(function ($item) {
            return [$item->key => $item->value];
        });

        return response()->json($settings);
    } // End index

    public function update(Request $request)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string'
        ]);

        foreach ($data['settings'] as $key => $value) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        AuditLogger::log('system.settings_update', "Atualizou configurações globais do sistema", [
            'keys' => array_keys($data['settings'])
        ]);

        return response()->json(['message' => 'Configurações de sistema atualizadas!']);
    }
}
