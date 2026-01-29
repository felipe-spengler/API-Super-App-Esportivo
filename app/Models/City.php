<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class City extends Model
{
    use HasFactory;
    protected $fillable = ['name', 'slug', 'state'];

    public function clubs()
    {
        return $this->hasMany(Club::class);
    }
}
