<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'club_id',
        'name',
        'description',
        'price',
        'image_url',
        'stock_quantity',
        'variants'
    ];

    protected $casts = [
        'variants' => 'array',
    ];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
}
