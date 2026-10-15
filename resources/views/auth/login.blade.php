@extends('layouts.app')
@section('title','Login CSMS')
@section('content')
<div class="card" style="max-width:480px;margin:45px auto">
<h1>Login CSMS</h1><p class="muted">Masuk menggunakan akun terdaftar.</p>
<form method="post" action="{{ route('login.store') }}">@csrf
<label>Email</label><input type="email" name="email" required value="{{ old('email') }}" autocomplete="username">
<label>Password</label><input type="password" name="password" required autocomplete="current-password">
<label><input style="width:auto" type="checkbox" name="remember" value="1"> Ingat saya</label>
<button style="width:100%;margin-top:15px">Login</button></form>
<p>Vendor baru? <a href="{{ route('vendor.register') }}">Daftar sebagai Vendor</a></p>
</div>
@endsection
