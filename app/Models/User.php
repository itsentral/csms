<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    public const INTERNAL_ROLES = ['admin', 'verifikator', 'validator', 'pengadaan'];

    protected $guarded = ['id'];

    protected $attributes = ['active' => true];

    protected $hidden = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    protected function casts(): array
    {
        return [
            'roles' => 'array',
            'password' => 'hashed',
            'active' => 'boolean',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function hasRole(string ...$roles): bool
    {
        return $this->active && (in_array('admin', $this->roles ?? []) || count(array_intersect($roles, $this->roles ?? [])) > 0);
    }

    public function isInternal(): bool
    {
        return count(array_intersect(self::INTERNAL_ROLES, $this->roles ?? [])) > 0;
    }

    public function hasMfa(): bool
    {
        return $this->two_factor_confirmed_at !== null && $this->two_factor_secret !== null;
    }

    public function publicData(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->email,
            'name' => $this->name,
            'role' => $this->roles,
            'mfa' => $this->hasMfa(),
            'mfaAvailable' => $this->isInternal(),
            'mfaRequired' => (bool) config('rchsems.mfa_required'),
            'mfaSetupRequired' => $this->isInternal() && ! $this->hasMfa() && config('rchsems.mfa_required'),
        ];
    }
}
