<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Coupon;
use App\Services\AuditLogger;

class CouponController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $coupons = Coupon::where('club_id', $user->club_id)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($coupons);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'discount_type' => 'required|in:fixed,percent',
            'discount_value' => 'required|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date'
        ]);

        $validated['club_id'] = $user->club_id;
        $validated['code'] = strtoupper($validated['code']);

        // Evitar duplicidade de código no mesmo clube
        if (Coupon::where('club_id', $user->club_id)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Já existe um cupom com este código.'], 422);
        }

        $coupon = Coupon::create($validated);

        AuditLogger::log('coupon.create', "Criou o cupom '{$coupon->code}'", [
            'coupon_id' => $coupon->id
        ]);

        return response()->json($coupon, 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $coupon = Coupon::where('club_id', $user->club_id)->findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:50',
            'discount_type' => 'sometimes|in:fixed,percent',
            'discount_value' => 'sometimes|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date'
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $coupon->update($validated);

        AuditLogger::log('coupon.update', "Editou o cupom '{$coupon->code}'", [
            'coupon_id' => $coupon->id
        ]);

        return response()->json($coupon);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $coupon = Coupon::where('club_id', $user->club_id)->findOrFail($id);
        $coupon->delete();

        AuditLogger::log('coupon.delete', "Excluiu o cupom '{$coupon->code}'");

        return response()->json(['message' => 'Cupom excluído com sucesso!']);
    }
}
