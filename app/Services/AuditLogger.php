<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class AuditLogger
{
    /**
     * Log a system audit event.
     *
     * @param string $eventType
     * @param int $matchId
     * @param array $metadata
     * @return void
     */
    public static function log(string $eventType, int $matchId, array $metadata = [])
    {
        Log::channel('audit')->info($eventType, [
            'match_id' => $matchId,
            'metadata' => $metadata,
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
