<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    private static $hasLogged = false;
    private static $lastLogId = null;

    /**
     * Log a system audit event in the database.
     *
     * @param string $action Action key (e.g. 'team.create')
     * @param string|null $description Human readable description
     * @param array $metadata Extra data
     * @param int|null $clubId Optional club context
     * @return void
     */
    public static function log(string $action, ?string $description = null, array $metadata = [], ?int $clubId = null)
    {
        $user = Auth::user();

        // Se o metadata não tiver o referer, tenta pegar do request
        if (!isset($metadata['referer'])) {
            $metadata['referer'] = Request::header('referer');
        }

        $log = AuditLog::create([
            'user_id' => $user ? $user->id : null,
            'club_id' => $clubId ?? ($user ? $user->club_id : null),
            'action' => $action,
            'description' => $description,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'metadata' => $metadata,
        ]);

        static::$hasLogged = true;
        static::$lastLogId = $log->id;
    }

    public static function hasLoggedExternally(): bool
    {
        return static::$hasLogged;
    }

    public static function getLastLogId(): ?int
    {
        return static::$lastLogId;
    }
}
