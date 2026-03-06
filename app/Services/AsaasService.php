<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Club;

class AsaasService
{
    protected $token;
    protected $apiUrl;
    protected $environment;

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
    public function request($endpoint, $method = 'GET', $data = [])
    {
        if (!$this->token) {
            throw new \Exception("Configuração do Asaas (Token) não encontrada para este clube.");
        }

        $url = $this->apiUrl . $endpoint;
        $response = Http::withHeaders([
            'access_token' => $this->token,
            'User-Agent' => 'AppEsportivo/1.0'
        ]);

        if ($method === 'POST') {
            $response = $response->post($url, $data);
        } elseif ($method === 'PUT') {
            $response = $response->put($url, $data);
        } else {
            $response = $response->get($url, $data);
        }

        if ($response->failed()) {
            $error = $response->json();
            $msg = $error['errors'][0]['description'] ?? 'Erro desconhecido no Asaas';
            Log::error("Asaas API Error: " . $response->body());
            throw new \Exception($msg);
        }

        return $response->json();
    }

    /**
     * Busca ou cria cliente no Asaas
     */
    public function getOrCreateCustomer($user)
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
    public function createPayment($user, $amount, $description, $externalReference, $dueDate = null, $billingType = 'UNDEFINED')
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
    public function getPixQrCode($paymentId)
    {
        return $this->request("/payments/{$paymentId}/pixQrCode");
    }
}
