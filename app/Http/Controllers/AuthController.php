<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $r)
    {
        $d = $r->validate(['username' => 'required|email', 'password' => 'required|string']);
        $user = Auth::getProvider()->retrieveByCredentials(['email' => strtolower($d['username']), 'active' => true]);
        abort_unless($user && Hash::check($d['password'], $user->password), 422, __('portal.login_failed'));

        // Accounts with two-factor authentication are not logged in yet: park them and wait for the code (see MfaController::verifyLogin).
        if ($user->hasMfa()) {
            $r->session()->put('mfa.user_id', $user->id);
            $r->session()->put('mfa.expires', time() + config('rchsems.mfa_login_ttl'));
            Portal::audit('login_mfa_challenge', null, ['user_id' => $user->id]);

            return response()->json(['mfa' => true], 202);
        }

        Auth::login($user);
        $r->session()->regenerate();
        Portal::audit('login');

        return response()->json($user->publicData());
    }

    public function register(Request $r)
    {
        $d = $r->validate([
            'username' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:12|max:128',
            'name' => 'required|string|max:255',
        ]);
        $u = User::create(['email' => strtolower($d['username']), 'password' => $d['password'], 'name' => $d['name'], 'roles' => ['vendor']]);
        Auth::login($u);
        $r->session()->regenerate();
        Portal::audit('register');

        return response()->json($u->publicData(), 201);
    }

    public function logout(Request $r)
    {
        Portal::audit('logout');
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function password(Request $r)
    {
        $d = $r->validate(['current_password' => 'required|current_password', 'password' => 'required|string|min:12|max:128']);
        $r->user()->update(['password' => $d['password']]);
        $r->session()->regenerate();
        DB::table('sessions')->where('user_id', $r->user()->id)->where('id', '!=', $r->session()->getId())->delete();
        Portal::audit('password_changed');

        return ['ok' => true];
    }

    /** Always answers the same way so it does not reveal whether an email is registered. */
    public function forgotPassword(Request $r)
    {
        $d = $r->validate(['username' => 'required|email']);
        Password::sendResetLink(['email' => strtolower($d['username']), 'active' => true]);
        Portal::audit('password_reset_requested');

        return response()->json(['ok' => true], 202);
    }

    public function resetPassword(Request $r)
    {
        $d = $r->validate([
            'username' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:12|max:128',
        ]);
        $status = Password::reset(
            ['email' => strtolower($d['username']), 'token' => $d['token'], 'password' => $d['password']],
            function (User $user, string $password) {
                $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                DB::table('sessions')->where('user_id', $user->id)->delete();
                Portal::audit('password_reset_completed', null, ['user_id' => $user->id]);
            }
        );
        abort_unless($status === Password::PASSWORD_RESET, 422, __('portal.reset_invalid'));

        return response()->json(['ok' => true]);
    }
}
