<?php

namespace App\Mail;

use App\Models\RaceResult;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InscriptionPaymentMail extends Mailable
{
    use Queueable, SerializesModels;

    public $result;
    public $paymentData;

    /**
     * Create a new message instance.
     */
    public function __construct(RaceResult $result, array $paymentData)
    {
        $this->result = $result;
        $this->paymentData = $paymentData;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pagamento da Inscrição - ' . ($this->result->race->championship->name ?? 'Evento'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.inscription_pending',
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
