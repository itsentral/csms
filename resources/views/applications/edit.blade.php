@extends('layouts.app')
@section('title','Detail Pengajuan')
@section('content')
<h1>Pengajuan {{ $application->registration_number }}</h1>
<div class="card"><div class="grid"><div><b>Vendor</b><br>{{ $application->vendor->company_name }}</div><div><b>Lingkup</b><br>{{ $application->scope }}</div><div><b>Status</b><br>{{ ucfirst($application->status) }}</div></div></div>
@if(auth()->user()->hasRole('vendor') && $application->status==='draft')
@foreach($application->criteria as $ac)
<div class="card"><h2>{{ $ac->criterion->code }} · {{ $ac->criterion->title }}</h2><p class="muted">{{ $ac->criterion->group_name }} · Bobot maksimum {{ $ac->criterion->max_weight }}</p>
<form method="post" enctype="multipart/form-data" action="{{ route('applications.criteria.save',[$application,$ac]) }}">@csrf
<label>Jawaban / keterangan</label><textarea name="vendor_answer">{{ $ac->vendor_answer }}</textarea>
<label>Catatan</label><textarea name="vendor_comment">{{ $ac->vendor_comment }}</textarea>
<label>Dokumen bukti (dapat memilih beberapa file; PDF, Word, Excel, JPG, PNG; maks. 15 MB/file)</label><input type="file" name="documents[]" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">
<button style="margin-top:10px">Simpan Kriteria dan Lampiran</button></form>
@if($ac->documents->count())<p><b>Lampiran:</b> @foreach($ac->documents as $doc)<a href="{{ route('documents.download',$doc) }}">{{ $doc->original_name }}</a>@if(!$loop->last), @endif @endforeach</p>@endif
</div>
@endforeach
<form method="post" action="{{ route('applications.submit',$application) }}" onsubmit="return confirm('Kirim pengajuan untuk diverifikasi? Setelah dikirim, vendor tidak dapat mengubah jawaban.')">@csrf<button class="btn-orange">Kirim Pengajuan untuk Verifikasi</button></form>
@else
<div class="card"><h2>Kriteria dan lampiran</h2>@foreach($application->criteria as $ac)<p><b>{{ $ac->criterion->code }} — {{ $ac->criterion->title }}</b><br>{{ $ac->vendor_answer ?: 'Belum ada jawaban' }}<br>@foreach($ac->documents as $doc)<a href="{{ route('documents.download',$doc) }}">{{ $doc->original_name }}</a> · @endforeach</p>@endforeach</div>
@endif
@endsection
