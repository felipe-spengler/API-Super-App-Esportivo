<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RaceResult extends Model
{
    protected $fillable = [
        'race_id',
        'user_id',
        'category_id',
        'bib_number',
        'name',
        'net_time',
        'gross_time',
        'position_general',
        'position_category',
        'chip_id',
        'status_payment',
        'payment_method',
        'is_pcd',
        'pcd_document_url',
        'gifts',
        'coupon_id',
        'asaas_payment_id',
        'payment_info',
        'shop_items',
        'kit_delivered',
        'kit_delivered_at'
    ];

    protected $casts = [
        'is_pcd' => 'boolean',
        'gifts' => 'array',
        'shop_items' => 'array',
        'payment_info' => 'array',
        'kit_delivered' => 'boolean',
        'kit_delivered_at' => 'datetime',
    ];

    public function race()
    {
        return $this->belongsTo(Race::class);
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
