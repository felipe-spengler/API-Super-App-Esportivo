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

        return response()->json($product, 201);
    }

    /**
     * Atualizar produto
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
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
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            // Retorna URL correta usando o helper Storage::url, compatível com S3 e outros drivers
            return response()->json(['path' => Storage::url($path)]);
        }

        return response()->json(['message' => 'Nenhum arquivo enviado'], 400);
    }
}
