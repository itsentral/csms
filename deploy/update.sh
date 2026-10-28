#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Use only after backup and after placing the new release files.
php artisan down --retry=60
trap 'echo "Update gagal; aplikasi tetap maintenance. Periksa log dan pulihkan release/database sebelum artisan up."' ERR
# Record the release commit so the UI can show which version is deployed.
git rev-parse --short=7 HEAD > bootstrap/cache/revision.txt 2>/dev/null || rm -f bootstrap/cache/revision.txt
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan db:seed --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up
