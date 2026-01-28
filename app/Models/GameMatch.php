<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameMatch extends Model
{
    protected $fillable = [
        'championship_id',
        'category_id',
        'home_team_id',
        'away_team_id',
        'home_score',
        'away_score',
        'status',
        'start_time',
        'location',
        'round_name',
        'round_number',
        'match_details',
        'mvp_player_id',
        'is_knockout',
        'group_name',
        'photos',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'match_details' => 'array',
        'awards' => 'array',
        'photos' => 'array',
    ];

    protected $with = ['sets', 'events'];

    protected $appends = ['match_details_structure'];

    public function getMatchDetailsStructureAttribute()
    {
        // If we have legacy JSON, use it (or merge it)
        $legacy = $this->match_details ?? [];
        if (!is_array($legacy))
            $legacy = [];

        // If we have relations loaded or available, append them
        // Note: To avoid N+1 queries ideally this should be loaded eagerly
        if ($this->relationLoaded('sets')) {
            $legacy['sets'] = $this->sets->map(function ($s) {
                return [
                    'label' => $s->set_number,
                    'home' => $s->home_score,
                    'away' => $s->away_score
                ];
            });
        }

        if ($this->relationLoaded('events')) {
            $legacy['events'] = $this->events->map(function ($e) {
                return [
                    'type' => $e->event_type,
                    'player_name' => json_decode($e->metadata)->original_player_name ?? 'Desconhecido',
                    'team_id' => $e->team_id,
                    'minute' => $e->game_time,
                    'period' => $e->period
                ];
            });
        }

        return $legacy;
    }

    public function championship()
    {
        return $this->belongsTo(Championship::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function homeTeam()
    {
        return $this->belongsTo(Team::class, 'home_team_id');
    }
    public function awayTeam()
    {
        return $this->belongsTo(Team::class, 'away_team_id');
    }
    public function mvp()
    {
        return $this->belongsTo(User::class, 'mvp_player_id');
    }

    public function sets()
    {
        return $this->hasMany(MatchSet::class);
    }

    public function events()
    {
        return $this->hasMany(MatchEvent::class);
    }
}
