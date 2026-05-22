<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompetitorTime extends Model
{
    use HasFactory;

    protected $fillable = [
        'championship_id',
        'game_match_id',
        'category_id',
        'team_id',
        'user_id',
        'time_ms',
        'lap',
        'status',
    ];

    public function championship()
    {
        return $this->belongsTo(Championship::class);
    }

    public function gameMatch()
    {
        return $this->belongsTo(GameMatch::class, 'game_match_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
