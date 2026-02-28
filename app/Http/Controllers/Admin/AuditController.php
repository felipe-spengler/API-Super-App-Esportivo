<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = AuditLog::with('user', 'club');

        // Se não for Super Admin (tiver club_id), filtra apenas logs do próprio clube
        if ($user->club_id) {
            $query->where('club_id', $user->club_id);
        }

        // Filtros opcionais
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        $logs = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 50));

        return response()->json($logs);
    }
}
