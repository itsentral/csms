<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** The validation message language follows the UI choice (X-Lang header: id|en); the default follows APP_LOCALE. */
class SetLocale
{
    public function handle(Request $r, Closure $next)
    {
        $lang = $r->header('X-Lang');
        if (in_array($lang, ['id', 'en'], true)) {
            app()->setLocale($lang);
        }

        return $next($r);
    }
}
