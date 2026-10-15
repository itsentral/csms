@extends('layouts.app')
@section('title','Pendaftaran Vendor')
@section('content')
<div class="card" style="max-width:760px;margin:auto"><h1>Pendaftaran Akun Vendor</h1>
<p class="muted">Pendaftaran mandiri hanya memberikan peran Vendor. Peran internal dibuat oleh Admin.</p>
<form method="post" action="{{ route('vendor.register.store') }}">@csrf
<div class="grid"><div><label>Nama penanggung jawab</label><input name="name" required value="{{old('name')}}"></div><div><label>Email</label><input type="email" name="email" required value="{{old('email')}}"></div>
<div><label>Password (minimal 10 karakter, huruf dan angka)</label><input type="password" name="password" required></div><div><label>Konfirmasi password</label><input type="password" name="password_confirmation" required></div>
<div><label>Nama perusahaan</label><input name="company_name" required value="{{old('company_name')}}"></div><div><label>Cabang</label><input name="branch_name" value="{{old('branch_name')}}"></div>
<div><label>Lingkup pekerjaan</label><input name="business_scope" required value="{{old('business_scope')}}"></div><div><label>Telepon</label><input name="phone" required value="{{old('phone')}}"></div></div>
<label>Alamat perusahaan</label><textarea name="business_address" required>{{old('business_address')}}</textarea>
<button class="btn-orange" style="margin-top:15px">Daftar Vendor</button></form></div>
@endsection
