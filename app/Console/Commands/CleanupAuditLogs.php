<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CleanupAuditLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'audit:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove logs de auditoria com mais de 7 dias';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = 7;
        $count = \App\Models\AuditLog::where('created_at', '<', now()->subDays($days))->delete();

        $this->info("Limpeza concluída: {$count} logs antigos removidos.");
    }
}
