<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DocumentOCRController extends Controller
{
    public function analyze(Request $request)
    {
        $request->validate([
            'document' => 'required|image|max:10240', // Max 10MB
        ]);

        $file = $request->file('document');
        $mimeType = $file->getMimeType();
        $base64Image = base64_encode(file_get_contents($file->path()));

        $apiKey = env('GEMINI_API_KEY');

        if (!$apiKey) {
            // MOCK PARA TESTES LOCAIS (Se não tiver chave configurada)
            return response()->json([
                'data' => [
                    'name' => 'FELIPE MOCK DA SILVA',
                    'cpf' => '123.456.789-00',
                    'birth_date' => '1995-10-20'
                ]
            ]);
        }

        $prompt = "Analise esta imagem de um documento brasileiro (CNH, RG ou CIN). Extraia EXATAMENTE os seguintes campos em formato JSON, ignorando acentos nas chaves: { \"name\": string (Nome Completo), \"cpf\": string (apenas números), \"birth_date\": string (YYYY-MM-DD), \"rg\": string (apenas números, se houver), \"mother_name\": string (Nome da Mãe, se houver), \"gender\": string (M ou F, apenas se estiver EXPLÍCITO no documento, senão null), \"document_number\": string (Número de Registro da CNH ou do Documento) }. Se não encontrar algum campo, retorne null. Não inclua markdown, apenas o JSON.";

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => $prompt],
                                    [
                                        'inline_data' => [
                                            'mime_type' => $mimeType,
                                            'data' => $base64Image
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]);

            if ($response->failed()) {
                Log::error('Gemini OCR Error', ['response' => $response->body()]);
                return response()->json(['message' => 'Falha ao processar documento.'], 500);
            }

            $data = $response->json();
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

            // Clean markdown if present
            $text = str_replace(['```json', '```'], '', $text);
            $json = json_decode(trim($text), true);

            if (!$json) {
                return response()->json(['message' => 'Não foi possível ler os dados do documento.'], 422);
            }

            return response()->json([
                'data' => $json
            ]);

        } catch (\Exception $e) {
            Log::error('OCR Exception', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro interno ao processar documento.'], 500);
        }
    }
}
