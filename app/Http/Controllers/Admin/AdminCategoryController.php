<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;

class AdminCategoryController extends Controller
{
    public function index(Request $request)
    {
        $championshipId = $request->query('championship_id');

        if ($championshipId) {
            $categories = Category::where('championship_id', $championshipId)->get();
        } else {
            $categories = Category::with('championship')->get();
        }

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'championship_id' => 'required|exists:championships,id',
            'name' => 'required|string',
            'description' => 'nullable|string',
            'min_age' => 'nullable|integer',
            'max_age' => 'nullable|integer',
            'gender' => 'nullable|in:male,female,mixed',
            'price' => 'nullable|numeric'
        ]);

        $category = Category::create($data);
        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
            'min_age' => 'nullable|integer',
            'max_age' => 'nullable|integer',
            'gender' => 'nullable|in:male,female,mixed',
            'price' => 'nullable|numeric'
        ]);

        $category->update($data);
        return response()->json($category);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        $category->delete();
        return response()->json(['message' => 'Categoria excluída com sucesso!']);
    }
}
