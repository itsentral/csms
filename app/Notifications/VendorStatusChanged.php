<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email saat status vendor berubah. $event: submitted | advanced | returned | finalized. */
class VendorStatusChanged extends Notification
{
    public function __construct(public string $vendorName, public string $event) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $event = __('portal.notify_'.$this->event);

        return (new MailMessage)
            ->subject(__('portal.notify_subject', ['vendor' => $this->vendorName, 'event' => $event]))
            ->greeting(__('portal.mail_greeting', ['name' => $notifiable->name]))
            ->line(__('portal.notify_'.$this->event.'_line', ['vendor' => $this->vendorName]))
            ->action(__('portal.notify_open'), url('/'));
    }
}
