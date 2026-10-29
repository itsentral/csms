<?php

/**
 * Router for the PHP built-in server used by `composer dev` (see composer.json).
 *
 * `php artisan serve` cannot pass php.ini overrides to the server it starts, and PHP's defaults (2M upload, 8M post)
 * reject attachments above those sizes. Running the built-in server directly lets `composer dev` raise the limits to
 * match the application (15 MB per file). Static files in public/ are served as they are; everything else goes to Laravel.
 */
$public = dirname(__DIR__).'/public';
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');

if ($uri !== '/' && is_file($public.$uri)) {
    return false;
}

$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $public.'/index.php';
chdir($public);
require $public.'/index.php';
