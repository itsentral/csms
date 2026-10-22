<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Bahasa pesan validasi mengikuti pilihan antarmuka (header X-Lang: id|en); default mengikuti APP_LOCALE. */
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
