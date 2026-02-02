<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameMatch extends Model
{
    protected static function booted()
    {
        static::creating(function ($match) {
            if (!$match->category_id && $match->home_team_id && $match->away_team_id) {
                // Tenta encontrar uma categoria comum aos dois times no campeonato
                $homeCategories = \DB::table('championship_team')
                    ->where('championship_id', $match->championship_id)
                    ->where('team_id', $match->home_team_id)
                    ->whereNotNull('category_id')
                    ->pluck('category_id')
                    ->toArray();

                $awayCategories = \DB::table('championship_team')
                    ->where('championship_id', $match->championship_id)
                    ->where('team_id', $match->away_team_id)
                    ->whereNotNull('category_id')
                    ->pluck('category_id')
                    ->toArray();

                $common = array_intersect($homeCategories, $awayCategories);

                if (count($common) > 0) {
                    $match->category_id = reset($common);
                }
            }
        });
    }
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
                $playerName = 'Desconhecido';
                if ($e->metadata) {
                    $metadata = is_string($e->metadata) ? json_decode($e->metadata, true) : $e->metadata;
                    if (is_array($metadata) && isset($metadata['original_player_name'])) {
                        $playerName = $metadata['original_player_name'];
                    }
                }

                return [
                    'type' => $e->event_type,
                    'player_name' => $playerName,
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
