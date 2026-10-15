<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class SecurityHeaders {public function handle(Request $r,Closure $next){$response=$next($r);if($r->hasSession())$response->headers->set('X-CSRF-TOKEN',$r->session()->token());$response->headers->set('X-Content-Type-Options','nosniff');$response->headers->set('X-Frame-Options','SAMEORIGIN');$response->headers->set('Referrer-Policy','same-origin');$response->headers->set('Cache-Control','no-store, private');return $response;}}
