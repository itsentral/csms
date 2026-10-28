<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Login rate limiting: strict per account, loose per IP address.
        // Many users at the Ernasi office share one IP, so a per-IP limit
        // alone could lock out legitimate users.
        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('username'));

            return [
                Limit::perMinute(10)->by('login-akun:'.$email.'|'.$request->ip()),
                Limit::perMinute(60)->by('login-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('register', function (Request $request) {
            return [
                Limit::perMinute(5)->by('daftar-akun:'.Str::lower((string) $request->input('username')).'|'.$request->ip()),
                Limit::perMinute(20)->by('daftar-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('mfa', function (Request $request) {
            return [
                Limit::perMinute(5)->by('mfa-akun:'.$request->session()->get('mfa.user_id', 'none')),
                Limit::perMinute(20)->by('mfa-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('forgot', function (Request $request) {
            return [
                Limit::perMinute(3)->by('lupa-akun:'.Str::lower((string) $request->input('username')).'|'.$request->ip()),
                Limit::perMinute(10)->by('lupa-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('reset', function (Request $request) {
            return Limit::perMinute(10)->by('reset-ip:'.$request->ip());
        });

        // The reset link opens the main page (SPA) with the token in the query; the email language follows the request locale.
        ResetPassword::createUrlUsing(fn ($user, string $token) => url('/').'?reset='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));
        ResetPassword::toMailUsing(function ($user, string $token) {
            $url = url('/').'?reset='.$token.'&email='.urlencode($user->getEmailForPasswordReset());
            $minutes = (int) config('auth.passwords.users.expire', 60);

            return (new MailMessage)
                ->subject(__('portal.reset_mail_subject'))
                ->greeting(__('portal.mail_greeting', ['name' => $user->name]))
                ->line(__('portal.reset_mail_intro'))
                ->action(__('portal.reset_mail_action'), $url)
                ->line(__('portal.reset_mail_expiry', ['minutes' => $minutes]))
                ->line(__('portal.reset_mail_ignore'));
        });

        RateLimiter::for('password', function (Request $request) {
            return [
                Limit::perMinute(10)->by('sandi-akun:'.$request->user()?->id),
                Limit::perMinute(30)->by('sandi-ip:'.$request->ip()),
            ];
        });
    }
}
