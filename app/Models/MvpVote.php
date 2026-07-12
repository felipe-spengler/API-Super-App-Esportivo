<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MvpVote extends Model
{
    protected $fillable = [
        'game_match_id',
        'voter_user_id',
        'voted_player_id',
        'voter_type',
        'ip_address',
    ];

    public function match()
    {
        return $this->belongsTo(GameMatch::class, 'game_match_id');
    }

    public function voter()
    {
        return $this->belongsTo(User::class, 'voter_user_id');
    }

    public function votedPlayer()
    {
        return $this->belongsTo(User::class, 'voted_player_id');
    }
}
