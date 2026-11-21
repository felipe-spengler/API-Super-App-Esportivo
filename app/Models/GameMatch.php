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

        static::saving(function ($match) {
            if (self::isKnockoutRoundName($match->round_name)) {
                $match->is_knockout = true;
            }
        });
    }

    public static function isKnockoutRoundName(?string $roundName): bool
    {
        if (!$roundName) {
            return false;
        }
        $trimmed = trim($roundName);
        if ($trimmed === '' || stripos($trimmed, 'repescagem') !== false) {
            return false;
        }
        $exactPhases = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final', 'Grande Final'];
        if (in_array($trimmed, $exactPhases, true)) {
            return true;
        }
        return (bool) preg_match('/(final|semi|quartas|quarter|oitavas|round_of_|third_place|3º|3o|terceiro|eliminat|mata-mata|mata\s+mata|playoff)/iu', $trimmed);
    }

    public function scopeExcludeKnockout($query)
    {
        return $query->where(function ($q) {
            $q->where(function ($kq) {
                $kq->whereNull('is_knockout')
                   ->orWhere(function ($kq2) {
                       $kq2->where('is_knockout', '!=', true)
                           ->where('is_knockout', '!=', 1);
                   });
            })->where(function ($sq) {
                $sq->whereNull('round_name')
                   ->orWhere(function ($rn) {
                       $rn->where('round_name', 'not like', '%Final%')
                          ->where('round_name', 'not like', '%Semi%')
                          ->where('round_name', 'not like', '%Quartas%')
                          ->where('round_name', 'not like', '%Quarter%')
                          ->where('round_name', 'not like', '%Oitavas%')
                          ->where('round_name', 'not like', '%round_of_%')
                          ->where('round_name', 'not like', '%third_place%')
                          ->where('round_name', 'not like', '%3º%')
                          ->where('round_name', 'not like', '%Terceiro%')
                          ->where('round_name', 'not like', '%Eliminat%')
                          ->where('round_name', 'not like', '%Mata-mata%')
                          ->where('round_name', 'not like', '%Playoff%');
                   });
            });
        });
    }

    public function scopeExcludeRepescagem($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('round_name')
              ->orWhere(function ($rn) {
                  $rn->where('round_name', '!=', 'Repescagem')
                     ->where('round_name', 'not like', '%Repescagem%');
              });
        });
    }
    protected $fillable = [
        'championship_id',
        'category_id',
        'home_team_id',
        'away_team_id',
        'home_score',
        'away_score',
        'home_penalty_score',
        'away_penalty_score',
        'status',
        'start_time',
        'location',
        'round_name',
        'round_number',
        'match_details',
        'mvp_player_id',
        'perna_de_pau_player_id',
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

    protected $appends = ['match_details_structure', 'count_countDown', 'is_countdown'];

    /**
     * Determina se a partida utiliza contagem regressiva (decrescente).
     *
     * @param GameMatch|array|null $match
     * @param string|null $sportSlug
     * @return bool
     */
    public static function isMatchCountdown($match = null, ?string $sportSlug = null): bool
    {
        $details = [];
        if ($match instanceof self) {
            $details = is_array($match->match_details) ? $match->match_details : [];
            if (!$sportSlug && $match->relationLoaded('championship') && $match->championship) {
                $sportSlug = $match->championship->sport->slug ?? ($match->championship->sport->name ?? null);
            }
        } elseif (is_array($match)) {
            $details = is_array($match['match_details'] ?? null) ? $match['match_details'] : $match;
        }

        $syncTimer = is_array($details['sync_timer'] ?? null) ? $details['sync_timer'] : [];

        // 1. Checagem explícita na configuração do sync_timer ou match_details da súmula
        if (isset($syncTimer['count_countDown'])) {
            return filter_var($syncTimer['count_countDown'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($syncTimer['count_countdown'])) {
            return filter_var($syncTimer['count_countdown'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($syncTimer['isCountdown'])) {
            return filter_var($syncTimer['isCountdown'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($syncTimer['is_countdown'])) {
            return filter_var($syncTimer['is_countdown'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($details['count_countDown'])) {
            return filter_var($details['count_countDown'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($details['count_countdown'])) {
            return filter_var($details['count_countdown'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($details['is_countdown'])) {
            return filter_var($details['is_countdown'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($details['isCountdown'])) {
            return filter_var($details['isCountdown'], FILTER_VALIDATE_BOOLEAN);
        }

        // Se o campeonato tiver esporte e não estava carregado, carrega sob demanda
        if (!$sportSlug && $match instanceof self && $match->championship_id) {
            $champ = $match->championship ?: Championship::with('sport')->find($match->championship_id);
            if ($champ && $champ->sport) {
                $sportSlug = $champ->sport->slug ?? ($champ->sport->name ?? null);
            }
        }

        // 2. Modalidades esportivas que oficialmente utilizam cronômetro decrescente (regressivo)
        $slug = strtolower(trim((string) $sportSlug));
        $countdownSports = [
            'futsal',
            'basquete',
            'basquetebol',
            'basketball',
            'fiba',
            'nba',
            '3x3',
            'jiu-jitsu',
            'jiujitsu',
            'bjj',
            'judo',
            'judô',
            'mma',
            'luta',
            'lutas',
            'boxe',
            'boxing',
            'handebol',
            'handball',
            'futebol-americano',
            'flag-football',
            'american-football',
            'polo-aquatico',
            'water-polo',
        ];

        foreach ($countdownSports as $cs) {
            if ($slug === $cs || str_contains($slug, $cs)) {
                return true;
            }
        }

        return false;
    }

    public function getCountCountDownAttribute(): bool
    {
        return self::isMatchCountdown($this);
    }

    public function getIsCountdownAttribute(): bool
    {
        return self::isMatchCountdown($this);
    }

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
                    if (is_array($metadata)) {
                        if (isset($metadata['original_player_name'])) {
                            $playerName = $metadata['original_player_name'];
                        } elseif (isset($metadata['label'])) {
                            $playerName = $metadata['label'];
                        }
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

    public function pernaDePau()
    {
        return $this->belongsTo(User::class, 'perna_de_pau_player_id');
    }

    public function sets()
    {
        return $this->hasMany(MatchSet::class);
    }

    public function events()
    {
        return $this->hasMany(MatchEvent::class);
    }

    public function competitorTimes()
    {
        return $this->hasMany(CompetitorTime::class, 'game_match_id');
    }
}
