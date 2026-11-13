<?php

namespace App\Mail;

use App\Models\User;
use App\Models\Team;
use App\Models\Championship;
use App\Models\Category;
use App\Models\Club;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AthleteTeamInscriptionMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $athlete;
    public Team $team;
    public ?Championship $championship;
    public ?Category $category;
    public ?Club $club;
    public array $playerDetails;

    /**
     * Create a new message instance.
     */
    public function __construct(
        User $athlete,
        Team $team,
        ?Championship $championship = null,
        ?Category $category = null,
        ?Club $club = null,
        array $playerDetails = []
    ) {
        $this->athlete = $athlete;
        $this->team = $team;
        $this->championship = $championship;
        $this->category = $category;
        $this->club = $club;
        $this->playerDetails = $playerDetails;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->championship
            ? "Inscrição Confirmada: {$this->team->name} - {$this->championship->name}"
            : "Inscrição Confirmada na Equipe {$this->team->name}";

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.athlete_team_inscription',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}

