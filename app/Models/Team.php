<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Team extends Model
{
    use HasFactory;
    protected $fillable = [
        'club_id',
        'captain_id',
        'name',
        'city',
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
    public function players()
    {
        return $this->belongsToMany(User::class, 'team_players')
            ->withPivot(['position', 'number', 'temp_player_name', 'is_approved'])
            ->withTimestamps();
    }

    public function championships()
    {
        return $this->belongsToMany(Championship::class, 'championship_team')
            ->withPivot('category_id')
            ->withTimestamps();
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'category_team')
            ->withTimestamps();
    }

    /**
     * Accessor: Garante que logo_url sempre retorne URL absoluta
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Se já for uma URL completa, retorna como está
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        // Se for URL relativa, converte para absoluta
        if (str_starts_with($value, '/')) {
            return rtrim(config('app.url'), '/') . $value;
        }

        return $value;
    }
}
