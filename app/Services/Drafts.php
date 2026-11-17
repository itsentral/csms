<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Unsaved form input kept on the server per user and form, so a page closed by accident loses nothing. */
class Drafts
{
    /** Drafts nobody touched for this long are dropped the next time the user saves one. */
    private const KEEP_DAYS = 30;

    /** @return array<string, array{data: mixed, updated_at: string}> keyed by scope; empty object when none */
    public static function forUser(User $user): object
    {
        $out = [];
        foreach (DB::table('form_drafts')->where('user_id', $user->id)->get(['scope', 'data', 'updated_at']) as $row) {
            $out[$row->scope] = ['data' => json_decode($row->data, true), 'updated_at' => Carbon::parse($row->updated_at)->toIso8601String()];
        }

        return (object) $out;
    }

    public static function put(User $user, string $scope, array $data): void
    {
        DB::table('form_drafts')->where('user_id', $user->id)->where('updated_at', '<', now()->subDays(self::KEEP_DAYS))->delete();
        $now = now();
        DB::table('form_drafts')->upsert(
            [['user_id' => $user->id, 'scope' => $scope, 'data' => json_encode($data), 'created_at' => $now, 'updated_at' => $now]],
            ['user_id', 'scope'],
            ['data', 'updated_at'],
        );
    }

    public static function forget(User $user, string $scope): void
    {
        DB::table('form_drafts')->where(['user_id' => $user->id, 'scope' => $scope])->delete();
    }

    /** Every user's drafts for one vendor (its profile, verification and validation forms), when the vendor is deleted. */
    public static function forgetVendor(string $vendorId): void
    {
        DB::table('form_drafts')->whereIn('scope', ['profile:'.$vendorId, 'review:'.$vendorId, 'validation:'.$vendorId])->delete();
    }
}
