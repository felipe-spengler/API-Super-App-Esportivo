<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;



class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'nickname',
        'email',
        'password',
        'phone',
        'cpf',
        'rg',
        'mother_name',
        'gender',
        'address',
        'document_number',
        'birth_date',
        'device_token',
        'is_admin',
        'club_id',
        'photo_path',  // Caminho da foto: "players/player_123.jpg"
        'document_path', // Caminho do documento: "documents/doc_123.jpg"
        'expires_at',
        'created_by',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'is_admin' => 'boolean',
            'birth_date' => 'date',
            'expires_at' => 'datetime',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_admin && is_null($this->club_id);
    }

    public function isClubAdmin(): bool
    {
        return $this->is_admin && !is_null($this->club_id);
    }

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    public function teamsAsCaptain()
    {
        return $this->hasMany(Team::class, 'captain_id');
    }

    public function teamsAsPlayer()
    {
        return $this->belongsToMany(Team::class, 'team_players')->withPivot(['position', 'number', 'is_approved']);
    }

    /**
     * Accessor: Gera photo_url a partir de photo_path
     */
    public function getPhotoUrlAttribute()
    {
        if (!$this->photo_path) {
            return null;
        }

        $url = \Storage::url($this->photo_path);

        // Se for URL relativa, converte para absoluta com /api
        if (str_starts_with($url, '/storage')) {
            return rtrim(config('app.url'), '/') . '/api' . $url;
        }

        return $url;
    }
}
