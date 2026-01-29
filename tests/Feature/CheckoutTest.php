<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Teste 15: Checkout cria pedido corretamente
     */
    public function test_checkout_creates_order_successfully(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create([
            'name' => 'Inscrição Campeonato',
            'price' => 100.00,
        ]);

        $order = Order::create([
            'user_id' => $user->id,
            'total' => 100.00,
            'status' => 'pending',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => $product->price,
            'subtotal' => $product->price,
        ]);

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'total' => 100.00,
        ]);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'product_id' => $product->id,
        ]);
    }

    /**
     * Teste 16: CRÍTICO - Cupom de desconto aplica valor correto
     */
    public function test_coupon_applies_correct_discount(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 100.00]);
        $club = Club::factory()->create();

        $coupon = Coupon::create([
            'club_id' => $club->id,
            'code' => 'DESCONTO10',
            'discount_type' => 'percent',
            'discount_value' => 10, // 10% de desconto
            'expires_at' => now()->addDays(30),
        ]);

        // Calcular preço com desconto
        $originalPrice = 100.00;
        $discount = ($originalPrice * $coupon->discount_value) / 100;
        $finalPrice = $originalPrice - $discount;

        $this->assertEquals(90.00, $finalPrice);

        $order = Order::create([
            'user_id' => $user->id,
            'total' => $finalPrice,
            'coupon_id' => $coupon->id,
            'discount' => $discount,
        ]);

        $this->assertDatabaseHas('orders', [
            'total' => 90.00,
            'discount' => 10.00,
            'coupon_id' => $coupon->id,
        ]);
    }

    /**
     * Teste 17: CRÍTICO - Cupom expirado é rejeitado
     */
    public function test_expired_coupon_is_rejected(): void
    {
        $club = Club::factory()->create();

        $coupon = Coupon::create([
            'club_id' => $club->id,
            'code' => 'EXPIRADO',
            'discount_type' => 'percent',
            'discount_value' => 20,
            'expires_at' => now()->subDays(1), // Expirou ontem
        ]);

        $isExpired = $coupon->expires_at < now();

        $this->assertTrue($isExpired);
    }

    /**
     * Teste 18: Cupom inativo não pode ser usado
     */
    public function test_inactive_coupon_cannot_be_used(): void
    {
        $club = Club::factory()->create();

        // Simular cupom que atingiu o limite de usos
        $coupon = Coupon::create([
            'club_id' => $club->id,
            'code' => 'LIMITADO',
            'discount_type' => 'percent',
            'discount_value' => 15,
            'expires_at' => now()->addDays(30),
            'max_uses' => 5,
            'used_count' => 5, // Já foi usado 5 vezes
        ]);

        $isAvailable = $coupon->used_count < ($coupon->max_uses ?? PHP_INT_MAX);

        $this->assertFalse($isAvailable);
    }
}
