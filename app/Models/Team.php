<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    protected $fillable = [
        'club_id',
        'captain_id',
        'name',
        'logo_url',
        'logo_path',  // Caminho do logo: "teams/team_123.png"
        'primary_color'
    ];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
    public function captain()
    {
        return $this->belongsTo(User::class, 'captain_id');
    }

    public function homeMatches()
    {
        return $this->hasMany(GameMatch::class, 'home_team_id');
    }

    public function awayMatches()
    {
        return $this->hasMany(GameMatch::class, 'away_team_id');
    }
}
