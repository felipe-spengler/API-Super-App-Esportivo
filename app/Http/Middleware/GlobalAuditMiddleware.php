<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Auth;

class GlobalAuditMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Execute the request first to get the response
        $response = $next($request);

        // We only care about data-modifying methods in Admin area
        $methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (in_array($request->method(), $methods) && $request->is('api/admin/*')) {
            $user = Auth::user();
            if (!$user)
                return $response;

            // Prepare metadata
            $payload = $request->except(['password', 'password_confirmation', 'current_password', 'token', 'access_token']);

            $status = $response->getStatusCode();
            $isSuccess = $status >= 200 && $status < 300;

            // Extract response message if available
            $content = $response->getContent();
            $responseData = json_decode($content, true);
            $responseMessage = null;

            if (json_last_error() === JSON_ERROR_NONE && is_array($responseData)) {
                $responseMessage = $responseData['message'] ?? ($responseData['error'] ?? null);
            }

            // Determine Action Name
            $action = strtolower($request->method()) . '.' . str_replace('/', '.', str_replace('api/admin/', '', $request->path()));

            // Limit action name length or cleanup
            $action = preg_replace('/[0-9]+/', '', $action); // Remove IDs from path to group actions
            $action = trim(str_replace('..', '.', $action), '.');

            $description = $this->generateDescription($request, $user, $isSuccess, $status);

            AuditLogger::log($action, $description, [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'referer' => $request->header('referer'), // Captura a página frontend de origem
                'payload' => $payload,
                'response_status' => $status,
                'response_message' => $responseMessage,
                'is_success' => $isSuccess
            ]);
        }

        return $response;
    }

    private function generateDescription(Request $request, $user, bool $isSuccess, int $status): string
    {
        $method = $request->method();
        $path = $request->path();

        $statusText = $isSuccess ? "Sucesso" : "Falha ($status)";

        $verbs = [
            'POST' => 'Criação/Ação',
            'PUT' => 'Edição',
            'PATCH' => 'Atualização',
            'DELETE' => 'Exclusão'
        ];

        $verb = $verbs[$method] ?? $method;

        return "[$statusText] $verb em $path";
    }
}
