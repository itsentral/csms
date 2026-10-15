@extends('layouts.app')
@section('title',$type==='verification'?'Verifikasi Dokumen':'Validasi Lapangan')
@section('content')
<h1>{{ $type==='verification'?'Verifikasi Dokumen':'Validasi Lapangan' }}</h1>
<div class="card"><div class="table-wrap"><table><thead><tr><th>Nomor</th><th>Vendor</th><th>Lingkup</th><th>Status</th><th></th></tr></thead><tbody>
@forelse($applications as $app)<tr><td>{{ $app->registration_number }}</td><td>{{ $app->vendor->company_name }}</td><td>{{ $app->scope }}</td><td>{{ ucfirst($app->status) }}</td><td><a href="{{ route('reviews.show',[$app,$type]) }}">Buka penilaian</a></td></tr>@empty<tr><td colspan="5">Tidak ada pengajuan pada tahap ini.</td></tr>@endforelse
</tbody></table></div>{{ $applications->links() }}</div>
@endsection
