@extends('layouts.app')
@section('title','Kelola Akun Internal')
@section('content')
<h1>Kelola Akun Internal</h1>
<div class="card"><h2>Daftarkan Verifikator / Validator / Pengadaan</h2>
<form method="post" action="{{ route('admin.users.store') }}">@csrf
<div class="grid"><div><label>Nama lengkap</label><input name="name" required></div><div><label>Email</label><input name="email" type="email" required></div>
<div><label>Password awal (min. 10 karakter, huruf dan angka)</label><input name="password" type="password" required></div><div><label>Konfirmasi password</label><input name="password_confirmation" type="password" required></div></div>
<label>Peran (boleh lebih dari satu)</label>
<div class="grid">@foreach($roles as $role)<label style="font-weight:500"><input style="width:auto" type="checkbox" name="roles[]" value="{{ $role->slug }}"> {{ $role->name }}</label>@endforeach</div>
<button style="margin-top:12px">Buat Akun Internal</button></form></div>
<div class="card"><h2>Daftar akun internal</h2><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
@foreach($users as $u)<tr><td>{{ $u->name }}</td><td>{{ $u->email }}</td><td>{{ $u->roles->pluck('name')->join(', ') }}</td><td>{{ $u->is_active?'Aktif':'Nonaktif' }}</td><td>@if(!$u->hasRole('admin'))<form method="post" action="{{ route('admin.users.toggle',$u) }}">@csrf @method('PATCH')<button class="btn-muted">{{ $u->is_active?'Nonaktifkan':'Aktifkan' }}</button></form>@endif</td></tr>@endforeach
</tbody></table></div>{{ $users->links() }}</div>
@endsection
