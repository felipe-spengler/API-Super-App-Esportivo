<?php

namespace App\Mail;

use App\Models\Club;
use App\Models\Championship;
use App\Models\Team;
use App\Models\Category;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TeamInscriptionClubNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public Club $club;
    public Championship $championship;
    public Team $team;
    public ?Category $category;
    public ?User $captain;
    public array $paymentDetails;

    /**
     * Create a new message instance.
     */
    public function __construct(
        Club $club,
        Championship $championship,
        Team $team,
        ?Category $category,
        ?User $captain,
        array $paymentDetails = []
    ) {
        $this->club = $club;
        $this->championship = $championship;
        $this->team = $team;
        $this->category = $category;
        $this->captain = $captain;
        $this->paymentDetails = $paymentDetails;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Nova Inscrição Confirmada: Time {$this->team->name} - {$this->championship->name}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.team_inscription_club_notification',
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
