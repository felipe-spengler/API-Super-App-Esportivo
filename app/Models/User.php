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
        'photos',
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
            'photos' => 'array',
        ];
    }

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'photo_url',
        'photo_urls',
    ];

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

        // Check if it's already a full URL
        if (str_starts_with($this->photo_path, 'http')) {
            return $this->photo_path;
        }

        // Return full URL
        return asset('storage/' . $this->photo_path);
    }

    /**
     * Accessor: Gera array de photo_urls a partir de photos JSON
     */
    public function getPhotoUrlsAttribute()
    {
        $photos = $this->photos ?? [];
        if (empty($photos)) {
            // Fallback to legacy photo_path if exists and not in array
            if ($this->photo_path) {
                return [$this->photo_url];
            }
            return [];
        }

        return array_map(function ($path) {
            if (str_starts_with($path, 'http')) {
                return $path;
            }
            return asset('storage/' . $path);
        }, $photos);
    }
}
