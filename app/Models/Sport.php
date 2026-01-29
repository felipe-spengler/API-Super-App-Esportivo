<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Sport extends Model
{
    use HasFactory;
    protected $fillable = ['name', 'slug', 'category_type', 'icon_name'];

    public function championships()
    {
        return $this->hasMany(Championship::class);
    }
}
