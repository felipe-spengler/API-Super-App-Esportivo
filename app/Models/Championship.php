<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Championship extends Model
{
    use HasFactory;
    protected $fillable = [
        'club_id',
        'sport_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'registration_start_date',
        'registration_end_date',
        'registration_type', // 'individual', 'team'
        'status',
        'format', // 'league', 'knockout', 'group_knockout', 'racing', 'time_ranking', 'laps'
        'image_path',  // Caminho da imagem: "championships/championship_123.jpg"
        'logo_url',    // URL completa do logo
        'cover_image_url', // URL completa da capa
        'branding_settings',
        'art_generator_settings',
        'art_settings',
        'awards',
        'is_status_auto',
        'has_pcd_discount',
        'pcd_discount_percentage',
        'has_elderly_discount',
        'elderly_discount_percentage',
        'elderly_minimum_age',
        'allow_shopping_registration',
        'regulation_path',
        'remove_bg_on_art',
        'tiebreaker_priority',
        'include_repescagem_goals',
        'include_repescagem_assists',
        'include_repescagem_cards',
        'include_repescagem_standings',
        'include_knockout_standings',
        'include_knockout_goals',
        'include_knockout_assists',
        'include_knockout_cards',
        'bulk_discount_settings'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'registration_start_date' => 'datetime',
        'registration_end_date' => 'datetime',
        'branding_settings' => 'array',
        'art_generator_settings' => 'array',
        'art_settings' => 'array',
        'awards' => 'array',
        'include_repescagem_goals' => 'boolean',
        'include_repescagem_assists' => 'boolean',
        'include_repescagem_cards' => 'boolean',
        'include_repescagem_standings' => 'boolean',
        'include_knockout_standings' => 'boolean',
        'include_knockout_goals' => 'boolean',
        'include_knockout_assists' => 'boolean',
        'include_knockout_cards' => 'boolean',
        'is_status_auto' => 'boolean',
        'has_pcd_discount' => 'boolean',
        'pcd_discount_percentage' => 'decimal:2',
        'has_elderly_discount' => 'boolean',
        'elderly_discount_percentage' => 'decimal:2',
        'elderly_minimum_age' => 'integer',
        'allow_shopping_registration' => 'boolean',
        'remove_bg_on_art' => 'boolean',
        'tiebreaker_priority' => 'array',
        'bulk_discount_settings' => 'array',
    ];

    protected $appends = [
        'is_registration_open',
        'registration_closed_reason',
    ];

    /**
     * Verifica de forma centralizada se o campeonato/evento está com inscrições abertas no momento.
     *
     * @return array{allowed: bool, reason: string|null}
     */
    public function checkRegistrationAllowed(): array
    {
        $now = now();

        // 1. Verificar status explícito de encerramento/andamento/rascunho
        $closedStatuses = ['finished', 'ongoing', 'in_progress', 'live', 'cancelled', 'closed', 'registrations_closed', 'draft'];
        if (in_array(strtolower((string) $this->status), $closedStatuses, true)) {
            return [
                'allowed' => false,
                'reason' => 'As inscrições para este evento estão encerradas.',
            ];
        }

        // 2. Verificar data de início das inscrições (se configurada)
        if ($this->registration_start_date) {
            $startLimit = $this->registration_start_date->copy();
            if ($startLimit->format('H:i:s') === '00:00:00') {
                $startLimit = $startLimit->startOfDay();
            }
            if ($now->lt($startLimit)) {
                return [
                    'allowed' => false,
                    'reason' => 'As inscrições para este evento estarão disponíveis a partir de ' . $startLimit->format('d/m/Y') . '.',
                ];
            }
        }

        // 3. Verificar data limite de encerramento das inscrições (registration_end_date)
        if ($this->registration_end_date) {
            $endLimit = $this->registration_end_date->copy();
            // Se foi salva apenas a data (00:00:00), considera válido até 23:59:59 daquele dia
            if ($endLimit->format('H:i:s') === '00:00:00') {
                $endLimit = $endLimit->endOfDay();
            }
            if ($now->gt($endLimit)) {
                return [
                    'allowed' => false,
                    'reason' => 'O prazo de inscrições para este evento encerrou em ' . $this->registration_end_date->format('d/m/Y') . '.',
                ];
            }
        }

        // 4. Se a data final do evento já passou, bloqueia inscrições
        if ($this->end_date && $now->gt($this->end_date->copy()->endOfDay())) {
            return [
                'allowed' => false,
                'reason' => 'Este evento já foi finalizado.',
            ];
        }

        return [
            'allowed' => true,
            'reason' => null,
        ];
    }

    public function getIsRegistrationOpenAttribute(): bool
    {
        return $this->checkRegistrationAllowed()['allowed'];
    }

    public function getRegistrationClosedReasonAttribute(): ?string
    {
        return $this->checkRegistrationAllowed()['reason'];
    }

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
    public function sport()
    {
        return $this->belongsTo(Sport::class);
    }
    public function categories()
    {
        return $this->hasMany(Category::class);
    }
    public function races()
    {
        return $this->hasMany(Race::class);
    }
    public function matches()
    {
        return $this->hasMany(GameMatch::class);
    }

    public function teams()
    {
        return $this->belongsToMany(Team::class, 'championship_team')
            ->withPivot('category_id', 'group_name', 'captain_id', 'staff')
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

        // Se for URL relativa, converte para absoluta com /api
        if (str_starts_with($value, '/storage')) {
            return rtrim(config('app.url'), '/') . '/api' . $value;
        }

        return $value;
    }

    /**
     * Accessor: Garante que cover_image_url sempre retorne URL absoluta
     */
    public function getCoverImageUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Se já for uma URL completa, retorna como está
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        // Se for URL relativa, converte para absoluta com /api
        if (str_starts_with($value, '/storage')) {
            return rtrim(config('app.url'), '/') . '/api' . $value;
        }

        return $value;
    }
}
