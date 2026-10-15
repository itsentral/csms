@extends('layouts.app')
@section('title','Penilaian '.$application->registration_number)
@section('content')
<h1>{{ $type==='verification'?'Verifikasi Dokumen':'Validasi Lapangan' }} · {{ $application->registration_number }}</h1>
<div class="card"><b>Vendor:</b> {{ $application->vendor->company_name }} · <b>Lingkup:</b> {{ $application->scope }}</div>
<div class="card"><h2>Rekap penilaian seluruh {{ $type==='verification'?'verifikator':'validator' }}</h2>
<div class="table-wrap"><table><thead><tr><th>Kriteria</th><th>Bobot</th><th>Rata-rata skor berbobot</th><th>Rincian penilai</th></tr></thead><tbody>
@foreach($application->criteria as $ac)
@php
$allScores=$ac->scores->filter(fn($s)=>$s->review->type===$type && $s->review->status==='submitted');
$avg=$allScores->count()?$allScores->avg('weighted_score'):null;
@endphp
<tr><td><b>{{ $ac->criterion->code }} — {{ $ac->criterion->title }}</b><br><span class="muted">{{ $ac->criterion->group_name }}</span>
@if($type==='validation')<br><span class="muted">Hasil verifikasi dokumen rata-rata: {{ $ac->scores->filter(fn($s)=>$s->review->type==='verification' && $s->review->status==='submitted')->count() ? number_format($ac->scores->filter(fn($s)=>$s->review->type==='verification' && $s->review->status==='submitted')->avg('weighted_score'),2) : 'Belum dinilai' }}</span>@endif
</td><td>{{ $ac->criterion->max_weight }}</td><td>{{ $avg===null?'Belum dinilai':number_format($avg,2) }}</td>
<td>@forelse($allScores as $score)<div><b>{{ $score->review->reviewer->name }}</b>: {{ $score->score_factor }} ({{ number_format($score->weighted_score,2) }})<br><span class="muted">{{ $score->comment }}</span></div>@empty<span class="muted">Belum ada penilaian</span>@endforelse</td></tr>
@endforeach
</tbody></table></div></div>
<div class="card"><h2>Penilaian akun saya</h2><p class="muted">Skala: 0 = tidak ada bukti; 0,25 = sangat kurang; 0,5 = sebagian; 0,75 = sebagian besar; 1 = memenuhi. Sesuaikan definisi resmi PT KAI.</p>
<form method="post" action="{{ route('reviews.save',[$application,$type]) }}">@csrf
@foreach($application->criteria as $ac)
@php $own=$myReview?->scores->firstWhere('application_criterion_id',$ac->id); @endphp
<div style="border-top:1px solid #d9e2ef;padding:12px 0"><b>{{ $ac->criterion->code }} — {{ $ac->criterion->title }}</b>
@if($type==='validation')<p class="muted">Rata-rata verifikasi dokumen: {{ $ac->scores->filter(fn($s)=>$s->review->type==='verification' && $s->review->status==='submitted')->count() ? number_format($ac->scores->filter(fn($s)=>$s->review->type==='verification' && $s->review->status==='submitted')->avg('weighted_score'),2) : 'Belum dinilai' }}</p>@endif
<label>Nilai saya</label><select name="scores[{{ $ac->id }}][factor]" required>
@foreach([0=>'0 — Tidak ada',0.25=>'0,25 — Sangat kurang',0.5=>'0,50 — Sebagian',0.75=>'0,75 — Sebagian besar',1=>'1,00 — Memenuhi'] as $val=>$label)
<option value="{{ $val }}" @selected((float)($own?->score_factor ?? -1)===(float)$val)>{{ $label }}</option>
@endforeach</select>
<label>Catatan</label><textarea name="scores[{{ $ac->id }}][comment]">{{ $own?->comment }}</textarea>
@if($type==='verification' && $ac->documents->count())<p>Dokumen: @foreach($ac->documents as $doc)<a href="{{ route('documents.download',$doc) }}">{{ $doc->original_name }}</a>@if(!$loop->last), @endif @endforeach</p>@endif
</div>
@endforeach
<label>Catatan keseluruhan</label><textarea name="overall_comment">{{ $myReview?->overall_comment }}</textarea>
<button class="btn-orange">Simpan Penilaian Saya</button></form></div>
@endsection
