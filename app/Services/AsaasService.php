<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Club;

class AsaasService
{
    protected ?string $token;
    protected string $apiUrl;
    protected string $environment;

    public function __construct(Club $club)
    {
        $settings = $club->payment_settings ?? [];
        $this->token = $settings['asaas_token'] ?? null;
        $this->environment = $settings['asaas_environment'] ?? 'sandbox';

        $this->apiUrl = ($this->environment === 'production')
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';
    }

    /**
     * Faz requisição à API Asaas
     */
    public function request(string $endpoint, string $method = 'GET', array $data = []): array
    {
        if (!$this->token) {
            throw new \Exception("Configuração do Asaas (Token) não encontrada para este clube.");
        }

        $url = $this->apiUrl . $endpoint;
        $response = Http::withHeaders([
            'access_token' => $this->token,
            'User-Agent' => 'AppEsportivo/1.0'
        ]);

        $response = match (strtoupper($method)) {
            'POST'   => $response->post($url, $data),
            'PUT'    => $response->put($url, $data),
            'DELETE' => $response->delete($url, $data),
            default  => $response->get($url, $data),
        };

        if ($response->failed()) {
            $error = $response->json();
            $msg = $error['errors'][0]['description'] ?? 'Erro desconhecido no Asaas';
            Log::error("Asaas API Error: " . $response->body());
            throw new \Exception($msg);
        }

        return $response->json() ?? [];
    }

    /**
     * Busca ou cria cliente no Asaas
     */
    public function getOrCreateCustomer($user): string
    {
        $cpf = preg_replace('/[^0-9]/', '', $user->cpf);

        // Buscar por CPF
        $search = $this->request("/customers?cpfCnpj={$cpf}");

        if (!empty($search['data'])) {
            return $search['data'][0]['id'];
        }

        // Criar novo
        $payload = [
            'name' => $user->name,
            'cpfCnpj' => $cpf,
            'email' => $user->email,
            'mobilePhone' => preg_replace('/[^0-9]/', '', $user->phone),
            'externalReference' => (string) $user->id,
            'notificationDisabled' => true // Desativa notificações (Email/SMS) para evitar custos extras por envio
        ];

        $customer = $this->request('/customers', 'POST', $payload);
        return $customer['id'];
    }

    /**
     * Cria uma cobrança
     */
    public function createPayment($user, $amount, string $description, string $externalReference, ?string $dueDate = null, string $billingType = 'UNDEFINED'): array
    {
        $customerId = $this->getOrCreateCustomer($user);

        if (!$dueDate) {
            $dueDate = now()->addDays(3)->format('Y-m-d');
        }

        $payload = [
            'customer' => $customerId,
            'billingType' => $billingType, // UNDEFINED permite que o usuário escolha entre PIX, Cartão ou Boleto no checkout do Asaas
            'value' => $amount,
            'dueDate' => $dueDate,
            'description' => $description,
            'externalReference' => $externalReference,
            'postalService' => false
        ];

        return $this->request('/payments', 'POST', $payload);
    }

    /**
     * Obtém QR Code Pix
     */
    public function getPixQrCode(string $paymentId): array
    {
        return $this->request("/payments/{$paymentId}/pixQrCode");
    }

    /**
     * Cancela uma cobrança
     */
    public function deletePayment(string $paymentId): array
    {
        return $this->request("/payments/{$paymentId}", 'DELETE');
    }
}
