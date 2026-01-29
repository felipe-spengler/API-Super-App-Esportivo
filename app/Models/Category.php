<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Category extends Model
{
    use HasFactory;
    protected $fillable = [
        'championship_id',
        'parent_id',
        'name',
        'description',
        'gender',
        'min_age',
        'max_age',
        'price'
    ];

    public function championship()
    {
        return $this->belongsTo(Championship::class);
    }
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
}
