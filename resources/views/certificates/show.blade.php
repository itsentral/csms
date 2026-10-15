@extends('layouts.app')
@section('title','Sertifikat CSMS')
@section('content')
<div class="no-print" style="margin-bottom:14px"><button onclick="window.print()">Cetak / Simpan PDF</button> <a class="btn btn-muted" href="{{ route('applications.index') }}">Kembali</a></div>
<div style="background:white;border:3px double #173b70;border-radius:14px;padding:42px;text-align:center;min-height:560px">
<div style="font-weight:800;letter-spacing:2px;color:#173b70">KAI · PT KERETA API INDONESIA (PERSERO)</div>
<div style="height:5px;background:#f36b21;margin:22px auto;max-width:180px"></div>
<h1 style="font-size:34px">SERTIFIKAT HASIL PENILAIAN CSMS</h1><p>Diberikan kepada</p>
<h2 style="font-size:28px">{{ $application->vendor->company_name }}</h2>
<p>Lingkup: <b>{{ $application->scope }}</b></p><h2>{{ number_format($percent,2) }} / 100</h2>
<p><b>{{ $category }}</b></p><p>Nomor registrasi: {{ $application->registration_number }}</p>
<p>Tanggal validasi: {{ $application->validated_at?->format('d-m-Y') ?? 'Belum ditetapkan' }}</p>
<p>Masa berlaku mengikuti keputusan dan prosedur resmi PT KAI.</p>
<div style="display:flex;justify-content:space-around;margin-top:60px"><div>Vendor Management<br><br><br>__________________</div><div>Pejabat berwenang<br><br><br>__________________</div></div>
</div>
<p class="muted">Pratinjau awal. Sertifikat tidak boleh dianggap terbit resmi sebelum hasil disahkan oleh pihak PT KAI yang berwenang.</p>
@endsection
