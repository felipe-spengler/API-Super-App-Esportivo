<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;

class AdminProductController extends Controller
{
    /**
     * Listar todos os produtos do clube do administrador
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Se for SuperAdmin e passar club_id, filtra por ele, senão pega do usuário
        $clubId = $user->club_id;
        if ($user->isSuperAdmin() && $request->has('club_id')) {
            $clubId = $request->club_id;
        }

        if (!$clubId) {
            return response()->json(['message' => 'Clube não identificado'], 400);
        }

        $products = Product::where('club_id', $clubId)->orderBy('created_at', 'desc')->get();
        return response()->json($products);
    }

    /**
     * Criar novo produto
     */
    public function store(Request $request)
    {
        $user = $request->user();
        \Illuminate\Support\Facades\Log::info('Product store request', $request->all());

        $clubId = $user->club_id;
        if ($user->isSuperAdmin() && $request->has('club_id')) {
            $clubId = $request->club_id;
        }

        if (!$clubId) {
            return response()->json(['message' => 'Clube obrigatório'], 400);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'image_url' => 'nullable|string' // Pode vir url direta ou path do upload
        ]);

        $product = Product::create([
            'club_id' => $clubId,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'price' => $validated['price'],
            'stock_quantity' => $validated['stock_quantity'],
            'image_url' => $validated['image_url'] ?? null,
            'variants' => [] // Pode ser implementado depois
        ]);

        \Illuminate\Support\Facades\Log::info('Product created', ['id' => $product->id, 'image_url' => $product->image_url]);

        return response()->json($product, 201);
    }

    /**
     * Atualizar produto
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        \Illuminate\Support\Facades\Log::info("Product update request ID: {$id}", $request->all());

        $product = Product::findOrFail($id);

        // Security check
        if (!$user->isSuperAdmin() && $product->club_id !== $user->club_id) {
            return response()->json(['message' => 'Não autorizado'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'stock_quantity' => 'sometimes|required|integer|min:0',
            'image_url' => 'nullable|string'
        ]);

        $product->update($validated);

        \Illuminate\Support\Facades\Log::info("Product updated ID: {$id}", ['image_url' => $product->image_url]);

        return response()->json($product);
    }

    /**
     * Remover produto
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $product = Product::findOrFail($id);

        if (!$user->isSuperAdmin() && $product->club_id !== $user->club_id) {
            return response()->json(['message' => 'Não autorizado'], 403);
        }

        $product->delete();

        return response()->json(['message' => 'Produto removido com sucesso']);
    }

    /**
     * Upload de imagem do produto
     */
    public function uploadImage(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('Product image upload start');

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048'
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            \Illuminate\Support\Facades\Log::info('File received', [
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getMimeType()
            ]);

            $path = $file->store('products', 'public');
            $url = Storage::url($path);

            \Illuminate\Support\Facades\Log::info('File stored', [
                'path' => $path,
                'url' => $url
            ]);

            // Retorna URL correta usando o helper Storage::url, compatível com S3 e outros drivers
            // WORKAROUND: Forçar retorno relativo se o Storage::url estiver retornando full URL bugada
            $relativePath = '/storage/' . $path;

            \Illuminate\Support\Facades\Log::info('Returning relative path', ['path' => $relativePath]);

            return response()->json(['path' => $relativePath]);
        }

        \Illuminate\Support\Facades\Log::warning('No file found in request');
        return response()->json(['message' => 'Nenhum arquivo enviado'], 400);
    }
}
