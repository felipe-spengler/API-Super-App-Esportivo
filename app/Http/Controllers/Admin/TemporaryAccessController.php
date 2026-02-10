<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TemporaryAccessController extends Controller
{
    /**
     * List only temporary admins created by this user (or belongs to same club)
     */
    public function index(Request $request)
    {
        $currentUser = $request->user();

        // Query: Users created by me OR users in my club that have expiry date
        $query = User::whereNotNull('expires_at');

        if ($currentUser->isSuperAdmin()) {
            // Super admin sees all or filters by club if needed
            if ($request->has('club_id')) {
                $query->where('club_id', $request->club_id);
            }
        } elseif ($currentUser->isClubAdmin()) {
            $query->where('club_id', $currentUser->club_id);
        } else {
            // Regular user shouldn't be here, but just in case
            return response()->json([], 403);
        }

        // Return sorted by expiration (soonest to expire first)
        return response()->json($query->with('club')->orderBy('expires_at', 'asc')->get());
    }

    /**
     * Create a new temporary admin
     */
    public function store(Request $request)
    {
        $currentUser = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'expires_at' => 'required|date|after:now',
            'club_id' => 'nullable|exists:clubs,id' // Only for SuperAdmin
        ]);

        $clubId = $currentUser->club_id;
        if ($currentUser->isSuperAdmin() && isset($validated['club_id'])) {
            $clubId = $validated['club_id'];
        }

        // Generate a random password or allow setting one? 
        // For security, maybe let them copy it once. default: 12345678 (user requested simplicity)
        // Let's generate a strong random string 
        $plainPassword = $request->input('password', Str::random(10));

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($plainPassword),
            'is_admin' => true,
            'club_id' => $clubId,
            'expires_at' => $validated['expires_at'],
            'created_by' => $currentUser->id,
            'is_active' => true
        ]);

        return response()->json([
            'message' => 'Acesso temporário criado com sucesso.',
            'user' => $user,
            'plain_password' => $plainPassword
        ], 201);
    }

    /**
     * Renew access (update expiry date)
     */
    public function update($id, Request $request)
    {
        $currentUser = $request->user();
        $userToUpdate = User::findOrFail($id);

        // Security Check
        if (!$currentUser->isSuperAdmin() && $userToUpdate->club_id !== $currentUser->club_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'expires_at' => 'required|date|after:now',
            'password' => 'nullable|string|min:6' // Optional password reset
        ]);

        $userToUpdate->expires_at = $validated['expires_at'];

        if ($request->has('password') && $request->password) {
            $userToUpdate->password = Hash::make($request->password);
        }

        $userToUpdate->save();

        return response()->json([
            'message' => 'Acesso renovado com sucesso.',
            'user' => $userToUpdate
        ]);
    }

    /**
     * Revoke access immediately
     */
    public function destroy($id, Request $request)
    {
        $currentUser = $request->user();
        $userToDelete = User::findOrFail($id);

        // Security Check
        if (!$currentUser->isSuperAdmin() && $userToDelete->club_id !== $currentUser->club_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $userToDelete->delete(); // Soft delete or hard delete? Default is hard unless trait used.
        // Or just expire immediately?
        // Let's delete to remove clutter

        return response()->json(['message' => 'Acesso revogado com sucesso.']);
    }
}
