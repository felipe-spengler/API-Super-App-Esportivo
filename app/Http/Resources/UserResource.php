<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'cpf' => $this->cpf,
            'birth_date' => $this->birth_date,
            'is_admin' => (bool) $this->is_admin,
            'club_id' => $this->club_id,
            'photo_url' => $this->photo_url,
            'photo_urls' => $this->photo_urls,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
