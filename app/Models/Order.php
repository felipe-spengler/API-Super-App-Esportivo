<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'club_id',
        'coupon_id',
        'total_amount',
        'fee_platform',
        'net_club',
        'status',
        'payment_method',
        'payment_id'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function club()
    {
        return $this->belongsTo(Club::class);
    }
    public function coupon()
    {
        return $this->belongsTo(Coupon::class);
    }
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
