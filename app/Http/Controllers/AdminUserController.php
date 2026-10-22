<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->whereHas('roles', fn ($q) => $q->whereIn('slug', ['admin', 'verifikator', 'validator', 'pengadaan']))->orderBy('name')->paginate(20);
        $roles = Role::whereIn('slug', ['verifikator', 'validator', 'pengadaan'])->orderBy('name')->get();

        return view('admin.users', compact('users', 'roles'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150', 'email' => 'required|email|max:190|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()],
            'roles' => 'required|array|min:1', 'roles.*' => 'in:verifikator,validator,pengadaan',
        ]);
        DB::transaction(function () use ($data) {
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password'], 'is_active' => true]);
            $ids = Role::whereIn('slug', $data['roles'])->pluck('id');
            $user->roles()->sync($ids);
        });

        return back()->with('status', 'Akun internal berhasil dibuat.');
    }

    public function toggle(User $user)
    {
        abort_if($user->hasRole('admin'), 403);
        $user->update(['is_active' => ! $user->is_active]);

        return back()->with('status', 'Status akun diperbarui.');
    }
}
