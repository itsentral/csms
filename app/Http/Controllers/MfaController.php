<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Portal;
use App\Services\Totp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Two-factor authentication (TOTP) for internal accounts. */
class MfaController extends Controller
{
    private const RECOVERY_CODES = 8;

    /** Second login step: accepts a TOTP code or one recovery code. */
    public function verifyLogin(Request $r)
    {
        $d = $r->validate(['code' => 'required|string|max:32']);
        $id = $r->session()->get('mfa.user_id');
        abort_unless($id && time() < (int) $r->session()->get('mfa.expires', 0), 422, __('portal.mfa_expired'));
        $user = User::where('id', $id)->where('active', true)->first();
        abort_unless($user && $user->hasMfa(), 422, __('portal.mfa_expired'));
        abort_unless($this->acceptCode($user, $d['code']), 422, __('portal.mfa_invalid'));

        $r->session()->forget(['mfa.user_id', 'mfa.expires']);
        Auth::login($user);
        $r->session()->regenerate();
        Portal::audit('login');

        return response()->json($user->publicData());
    }

    /** Creates a new secret (not active until confirmed). */
    public function setup(Request $r)
    {
        $user = $this->internal($r);
        abort_if($user->hasMfa(), 409, __('portal.mfa_already'));
        $secret = Totp::secret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null, 'two_factor_last_step' => null])->save();

        return ['secret' => $secret, 'uri' => Totp::uri($user->email, $secret)];
    }

    public function confirm(Request $r)
    {
        $user = $this->internal($r);
        $d = $r->validate(['code' => 'required|string|max:16']);
        abort_if($user->hasMfa() || ! $user->two_factor_secret, 409, __('portal.mfa_already'));
        $step = Totp::verify($user->two_factor_secret, $d['code']);
        abort_if($step === null, 422, __('portal.mfa_invalid'));

        $codes = $this->newRecoveryCodes();
        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_last_step' => $step,
            'two_factor_recovery_codes' => array_map([$this, 'hashCode'], $codes),
        ])->save();
        Portal::audit('mfa_enabled');

        return ['ok' => true, 'recovery_codes' => $codes];
    }

    public function regenerateRecovery(Request $r)
    {
        $user = $this->internal($r);
        $r->validate(['current_password' => 'required|current_password']);
        abort_unless($user->hasMfa(), 409, __('portal.mfa_not_enabled'));
        $codes = $this->newRecoveryCodes();
        $user->forceFill(['two_factor_recovery_codes' => array_map([$this, 'hashCode'], $codes)])->save();
        Portal::audit('mfa_recovery_regenerated');

        return ['recovery_codes' => $codes];
    }

    public function disable(Request $r)
    {
        $user = $this->internal($r);
        $r->validate(['current_password' => 'required|current_password']);
        abort_if(config('rchsems.mfa_required'), 422, __('portal.mfa_required_cannot_disable'));
        $this->clear($user);
        Portal::audit('mfa_disabled');

        return ['ok' => true];
    }

    /** An admin resets 2FA for another internal account (lost device). */
    public function adminReset(Request $r, User $user)
    {
        Portal::role($r->user(), 'admin');
        $this->clear($user);
        Portal::audit('mfa_reset_by_admin', null, ['user_id' => $user->id]);

        return ['ok' => true];
    }

    /** Recovery codes are compared without hyphens and case-insensitively. */
    private function hashCode(string $code): string
    {
        return hash('sha256', strtoupper(preg_replace('/[\s-]+/', '', $code)));
    }

    private function internal(Request $r): User
    {
        $user = $r->user();
        abort_unless($user->isInternal(), 403);

        return $user;
    }

    private function clear(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_step' => null,
        ])->save();
    }

    private function acceptCode(User $user, string $input): bool
    {
        $step = Totp::verify($user->two_factor_secret, $input, $user->two_factor_last_step);
        if ($step !== null) {
            $user->forceFill(['two_factor_last_step' => $step])->save();

            return true;
        }
        // Recovery code: single use.
        $hash = $this->hashCode($input);
        $codes = $user->two_factor_recovery_codes ?? [];
        $index = array_search($hash, $codes, true);
        if ($index === false) {
            return false;
        }
        unset($codes[$index]);
        $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();
        Portal::audit('mfa_recovery_used', null, ['user_id' => $user->id]);

        return true;
    }

    /** @return list<string> codes like ABCDE-12345 (letters/digits without easily confused characters) */
    private function newRecoveryCodes(): array
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $codes = [];
        for ($i = 0; $i < self::RECOVERY_CODES; $i++) {
            $raw = '';
            for ($j = 0; $j < 10; $j++) {
                $raw .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $codes[] = substr($raw, 0, 5).'-'.substr($raw, 5);
        }

        return $codes;
    }
}
