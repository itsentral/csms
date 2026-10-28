<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** When MFA_REQUIRED=true, internal accounts without 2FA may only open state, log out, change password, and set up 2FA. */
class RequireMfaSetup
{
    private const ALLOWED = ['api/state', 'api/logout', 'api/password', 'api/mfa/setup', 'api/mfa/confirm'];

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && config('rchsems.mfa_required') && $user->isInternal() && ! $user->hasMfa() && ! in_array($request->path(), self::ALLOWED, true)) {
            return response()->json(['message' => __('portal.mfa_setup_required'), 'code' => 'mfa_setup_required'], 403);
        }

        return $next($request);
    }
}
