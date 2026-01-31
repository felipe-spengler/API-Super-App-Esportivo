<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Category extends Model
{
    use HasFactory;
    protected $fillable = [
        'championship_id',
        'parent_id',
        'name',
        'description',
        'gender',
        'min_age',
        'max_age',
        'price'
    ];

    public function championship()
    {
        return $this->belongsTo(Championship::class);
    }
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Verifica se um usuário é elegível para esta categoria
     */
    public function isUserEligible($user)
    {
        if (!$user)
            return true; // Se for jogador temporário (sem registro), não validamos ID aqui

        // 1. Validar Gênero
        if ($this->gender && $this->gender !== 'mixed') {
            $userGender = strtolower($user->gender ?? '');
            $categoryGender = strtolower($this->gender);

            // Map common variances
            if ($categoryGender === 'm')
                $categoryGender = 'male';
            if ($categoryGender === 'f')
                $categoryGender = 'female';
            if ($userGender === 'm')
                $userGender = 'male';
            if ($userGender === 'f')
                $userGender = 'female';

            if ($userGender !== $categoryGender) {
                return [
                    'eligible' => false,
                    'reason' => "Gênero incompatível. A categoria é {$this->gender} e o atleta é " . ($user->gender ?? 'não informado') . "."
                ];
            }
        }

        // 2. Validar Idade
        if (($this->min_age || $this->max_age) && $user->birth_date) {
            $birthDate = \Carbon\Carbon::parse($user->birth_date);
            $currentYear = now()->year;
            $age = $currentYear - $birthDate->year;

            if ($this->min_age && $age < $this->min_age) {
                return [
                    'eligible' => false,
                    'reason' => "Atleta muito jovem para esta categoria (Idade: {$age}, Mínima: {$this->min_age})."
                ];
            }

            if ($this->max_age && $age > $this->max_age) {
                return [
                    'eligible' => false,
                    'reason' => "Atleta excede a idade máxima para esta categoria (Idade: {$age}, Máxima: {$this->max_age})."
                ];
            }
        }

        return ['eligible' => true];
    }

    public function teams()
    {
        return $this->belongsToMany(Team::class, 'category_team')
            ->withTimestamps();
    }
}
