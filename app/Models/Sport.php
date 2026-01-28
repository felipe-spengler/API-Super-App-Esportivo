<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sport extends Model
{
    protected $fillable = ['name', 'slug', 'category_type', 'icon_name'];

    public function championships()
    {
        return $this->hasMany(Championship::class);
    }
}
