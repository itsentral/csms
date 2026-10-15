@extends('layouts.app')
@section('title','Dashboard')
@section('content')
<h1>Dashboard CSMS PT KAI</h1>
<div class="grid">
<div class="metric"><span>Total Vendor</span><b>{{ $vendorCount }}</b></div>
<div class="metric"><span>Total Pengajuan</span><b>{{ $applicationCount }}</b></div>
<div class="metric"><span>Akun Internal</span><b>{{ $internalCount }}</b></div>
</div>
@if(auth()->user()->hasRole('vendor'))
<div class="card"><h2>Mulai Pengajuan</h2><p>Buat pengajuan pra-kualifikasi untuk perusahaan Anda.</p><a class="btn" href="{{ route('applications.create') }}">Buat Pengajuan</a></div>
@endif
<div class="card"><h2>Pengajuan terbaru</h2><div class="table-wrap"><table><thead><tr><th>Nomor</th><th>Vendor</th><th>Lingkup</th><th>Status</th><th></th></tr></thead><tbody>
@forelse($applications as $app)<tr><td>{{ $app->registration_number }}</td><td>{{ $app->vendor->company_name }}</td><td>{{ $app->scope }}</td><td>{{ ucfirst($app->status) }}</td><td><a href="{{ route('applications.edit',$app) }}">Buka</a></td></tr>
@empty<tr><td colspan="5">Belum ada pengajuan.</td></tr>@endforelse
</tbody></table></div></div>
@endsection
