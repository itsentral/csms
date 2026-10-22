<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateAdmin extends Command
{
    protected $signature = 'rchsems:create-admin {email?} {--name=Administrator RCHSEMS}';

    protected $description = 'Buat admin pertama dengan password interaktif; tidak mengubah akun yang sudah ada';

    public function handle(): int
    {
        $email = strtolower($this->argument('email') ?: $this->ask('Email admin'));
        $password = $this->secret('Password (minimal 12 karakter)');
        $v = Validator::make(compact('email', 'password'), ['email' => 'required|email|unique:users,email', 'password' => 'required|string|min:12']);
        if ($v->fails()) {
            $this->error($v->errors()->first());

            return 1;
        }
        User::create(['email' => $email, 'name' => $this->option('name'), 'password' => $password, 'roles' => ['admin']]);
        $this->info('Admin dibuat.');

        return 0;
    }
}
