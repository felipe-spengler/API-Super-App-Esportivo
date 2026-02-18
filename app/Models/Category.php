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
        'max_teams',
        'price',
        'included_products'
    ];

    protected $casts = [
        'included_products' => 'array',
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
            // Check if user has gender info. If not, skip validation (assume OK or handle as strictly required?)
            // If user explicitly asked for non-mandatory fields, we should be lenient here if gender is missing.
            if (!empty($user->gender)) {
                $userGender = strtolower($user->gender);
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

                // Only fail if gender is explicitly set and different
                if ($categoryGender !== 'mixed' && $userGender !== $categoryGender) {
                    return [
                        'eligible' => false,
                        'reason' => "Gênero incompatível. A categoria requer " . ($categoryGender === 'male' ? 'Masculino' : 'Feminino') . "."
                    ];
                }
            }
        }

        // 2. Validar Idade
        if (($this->min_age || $this->max_age)) {
            // Check if user has birth_date. If not, skip validation?
            if (!empty($user->birth_date)) {
                try {
                    $birthDate = \Carbon\Carbon::parse($user->birth_date);
                    $age = $birthDate->age; // Use Carbon's age calculator for accuracy

                    if ($this->min_age && $age < $this->min_age) {
                        return [
                            'eligible' => false,
                            'reason' => "Atleta muito jovem (Idade: {$age}, Mínima: {$this->min_age})."
                        ];
                    }

                    if ($this->max_age && $age > $this->max_age) {
                        return [
                            'eligible' => false,
                            'reason' => "Atleta excede idade máxima (Idade: {$age}, Máxima: {$this->max_age})."
                        ];
                    }
                } catch (\Exception $e) {
                    // Ignore date parse errors
                }
            }
        }

        return ['eligible' => true];
    }

    /**
     * Retorna os produtos inclusos nesta categoria com detalhes completos
     */
    public function products()
    {
        if (!$this->included_products) {
            return collect([]);
        }

        $productIds = collect($this->included_products)->pluck('product_id')->toArray();
        $products = Product::whereIn('id', $productIds)->get();

        return collect($this->included_products)->map(function ($item) use ($products) {
            $product = $products->firstWhere('id', $item['product_id']);
            if (!$product)
                return null;

            return [
                'product' => $product,
                'quantity' => $item['quantity'] ?? 1,
                'required' => $item['required'] ?? true
            ];
        })->filter();
    }

    public function teams()
    {
        return $this->belongsToMany(Team::class, 'category_team')
            ->withTimestamps();
    }
}
