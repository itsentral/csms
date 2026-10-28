<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /** Strict CSP for scripts: no inline scripts or inline handlers (see data-click in portal.js). Inline styles are still allowed. */
    public const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

    public function handle(Request $r, Closure $next)
    {
        $response = $next($r);
        if ($r->hasSession()) {
            $response->headers->set('X-CSRF-TOKEN', $r->session()->token());
        }
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'same-origin');
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('Content-Security-Policy', self::CSP);
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        if ($r->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
