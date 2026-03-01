<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    private static $hasLogged = false;

    /**
     * Log a system audit event in the database.
     *
     * @param string $action Action key (e.g. 'team.create')
     * @param string|null $description Human readable description
     * @param array $metadata Extra data
     * @return void
     */
    public static function log(string $action, ?string $description = null, array $metadata = [])
    {
        $user = Auth::user();

        AuditLog::create([
            'user_id' => $user ? $user->id : null,
            'club_id' => $user ? $user->club_id : null,
            'action' => $action,
            'description' => $description,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'metadata' => $metadata,
        ]);

        static::$hasLogged = true;
    }

    public static function hasLoggedExternally(): bool
    {
        return static::$hasLogged;
    }
}
