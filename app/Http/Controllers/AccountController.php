<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateAccountRequest;
use App\Models\User;
use App\Services\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Internal account management by admins. */
class AccountController extends Controller
{
    public function store(CreateAccountRequest $r)
    {
        $d = $r->validated();
        $user = User::create([
            'name' => $d['name'],
            'email' => strtolower($d['username']),
            'password' => $d['password'],
            'roles' => in_array('admin', $d['role']) ? ['admin'] : array_values(array_unique($d['role'])),
        ]);
        Portal::audit('account_created', null, ['user_id' => $user->id]);

        return $user->publicData();
    }

    public function resetPassword(Request $r, User $user)
    {
        Portal::role($r->user(), 'admin');
        abort_if(in_array('vendor', $user->roles ?? []), 403);
        $d = $r->validate(['password' => 'required|string|min:12|max:128']);
        $user->update($d);
        DB::table('sessions')->where('user_id', $user->id)->delete();
        Portal::audit('account_password_reset', null, ['user_id' => $user->id]);

        return ['ok' => true];
    }

    public function deactivate(Request $r, User $user)
    {
        Portal::role($r->user(), 'admin');
        abort_if($user->id === $r->user()->id || in_array('admin', $user->roles ?? []) || in_array('vendor', $user->roles ?? []), 422, __('portal.cannot_deactivate'));
        $user->update(['active' => false]);
        DB::table('sessions')->where('user_id', $user->id)->delete();
        Portal::audit('account_deactivated', null, ['user_id' => $user->id]);

        return ['ok' => true];
    }
}
