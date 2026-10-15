@extends('layouts.app')
@section('title','Buat Pengajuan')
@section('content')
<div class="card" style="max-width:650px"><h1>Buat Pengajuan Pra-Kualifikasi</h1>
<form method="post" action="{{ route('applications.store') }}">@csrf
<label>Lingkup pekerjaan yang diajukan</label><input name="scope" required value="{{old('scope')}}" placeholder="Contoh: konsultasi / konstruksi / pemeliharaan">
<button style="margin-top:15px">Buat dan Isi Kriteria</button></form></div>
@endsection
