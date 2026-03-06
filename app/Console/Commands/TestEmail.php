<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TestEmail extends Command
{
    protected $signature = 'test:email {email}';
    protected $description = 'Test email sending';

    public function handle()
    {
        $email = $this->argument('email');
        $this->info("Sending test email to {$email}...");

        try {
            Mail::raw('Este é um e-mail de teste do sistema Esportivo.', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Teste de E-mail');
            });
            $this->info("Email sent successfully (according to Laravel)!");
        } catch (\Exception $e) {
            $this->error("Error sending email: " . $e->getMessage());
            Log::error("Test Email Error: " . $e->getMessage());
        }
    }
}
