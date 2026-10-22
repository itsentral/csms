<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('login');
        }
        if ($user->hasRole('admin')) {
            return $next($request);
        }
        if (! $user->hasAnyRole($roles)) {
            abort(403, 'Anda tidak memiliki kewenangan untuk mengakses menu ini.');
        }

        return $next($request);
    }
}
