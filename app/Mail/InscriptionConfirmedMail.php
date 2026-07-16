<?php

namespace App\Mail;

use App\Models\RaceResult;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InscriptionConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $result;

    /**
     * Create a new message instance.
     */
    public function __construct(RaceResult $result)
    {
        $this->result = $result;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $eventName = $this->result->race->championship->name ?? 'Evento';
        return new Envelope(
            subject: "Inscrição Confirmada: {$eventName}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.inscription_confirmed',
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
