<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChampionshipTimesUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $championshipId;

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct($championshipId)
    {
        $this->championshipId = $championshipId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        return new Channel('championship.' . $this->championshipId);
    }

    public function broadcastAs()
    {
        return 'ChampionshipTimesUpdated';
    }
}
