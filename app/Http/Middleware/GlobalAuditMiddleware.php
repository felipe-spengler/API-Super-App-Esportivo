<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Auth;
use App\Models\Team;

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

        // We only care about data-modifying methods (POST, PUT, PATCH, DELETE)
        $methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        $path = $request->path();

        // Se for um método de modificação e estiver na área de API (prefixo api/)
        if (in_array($request->method(), $methods) && str_starts_with($path, 'api/')) {
            // Se o AuditLogger já logou manualmente neste request, pula o log automático do middleware
            if (AuditLogger::hasLoggedExternally()) {
                return $response;
            }

            $user = Auth::user();
            if (!$user)
                return $response;

            // Prepare metadata
            $payload = $request->except(['password', 'password_confirmation', 'current_password', 'token', 'access_token', 'photo_file', 'photo_file_1', 'photo_file_2', 'document_file', '_method']);

            $status = $response->getStatusCode();
            $isSuccess = $status >= 200 && $status < 300;

            // Extract response message if available
            $content = $response->getContent();
            $responseData = json_decode($content, true);
            $responseMessage = null;

            if (json_last_error() === JSON_ERROR_NONE && is_array($responseData)) {
                $responseMessage = $responseData['message'] ?? ($responseData['error'] ?? null);
            }

            // Determine Action Name - Clean up path to be a dot-separated string
            $actionPath = str_replace('api/', '', $path);
            $action = strtolower($request->method()) . '.' . str_replace('/', '.', $actionPath);

            // Limit action name length or cleanup
            $action = preg_replace('/[0-9]+/', '', $action); // Remove IDs from path to group actions
            $action = trim(str_replace('..', '.', $action), '.');

            $description = $this->generateDescription($request, $user, $isSuccess, $status);

            // Tenta determinar o CLUB_ID de contexto
            // Se a rota for de um time, pegamos o club_id do time para que o admin do clube veja a ação.
            $clubId = $user->club_id;

            if (str_contains($path, 'teams/')) {
                // Assuming the team ID is part of the route parameters, e.g., api/teams/{id}
                // We need to get the ID from the route parameters, not directly from the path string
                // The route('id') method is more robust for this.
                $teamId = $request->route('team'); // Assuming route parameter is named 'team' or 'id'
                if (!$teamId) {
                    // Fallback if 'team' parameter is not found, try 'id'
                    $teamId = $request->route('id');
                }

                if ($teamId) {
                    $team = Team::find($teamId);
                    if ($team) {
                        $clubId = $team->club_id;
                    }
                }
            }

            AuditLogger::log($action, $description, [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'referer' => $request->header('referer'), // Captura a página frontend de origem
                'payload' => $payload,
                'response_status' => $status,
                'response_message' => $responseMessage,
                'is_success' => $isSuccess
            ], $clubId);
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
