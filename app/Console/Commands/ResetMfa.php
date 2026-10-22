<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ResetMfa extends Command
{
    protected $signature = 'rchsems:reset-mfa {email}';

    protected $description = 'Mengatur ulang autentikasi dua langkah sebuah akun (misalnya admin terakhir yang kehilangan perangkat)';

    public function handle(): int
    {
        $user = User::where('email', strtolower($this->argument('email')))->first();
        if (! $user) {
            $this->error('Akun tidak ditemukan.');

            return 1;
        }
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_step' => null,
        ])->save();
        $this->info('Autentikasi dua langkah untuk '.$user->email.' telah diatur ulang.');

        return 0;
    }
}
