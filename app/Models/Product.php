<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;
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
