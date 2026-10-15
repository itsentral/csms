@extends('layouts.app')
@section('title','Pengajuan Vendor')
@section('content')
<h1>Pengajuan Vendor</h1>
@if(auth()->user()->hasRole('vendor'))<p><a class="btn" href="{{ route('applications.create') }}">Buat Pengajuan Baru</a></p>@endif
<div class="card"><div class="table-wrap"><table><thead><tr><th>Nomor</th><th>Perusahaan</th><th>Lingkup</th><th>Status</th><th>Skor akhir</th><th></th></tr></thead><tbody>
@forelse($applications as $app)<tr><td>{{ $app->registration_number }}</td><td>{{ $app->vendor->company_name }}</td><td>{{ $app->scope }}</td><td>{{ ucfirst($app->status) }}</td><td>{{ $app->final_score ?? '—' }}</td><td><a href="{{ route('applications.edit',$app) }}">Buka</a> @if(auth()->user()->hasAnyRole(['admin','pengadaan','verifikator','validator'])) · <a href="{{ route('certificates.show',$app) }}">Sertifikat</a>@endif</td></tr>
@empty<tr><td colspan="6">Belum ada pengajuan.</td></tr>@endforelse
</tbody></table></div>{{ $applications->links() }}</div>
@endsection
