<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>@yield('title','CSMS PT KAI')</title>
<style>
:root{--navy:#112b55;--blue:#1761ad;--orange:#f36b21;--bg:#f3f6fb;--line:#d9e2ef}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#1c2b40;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
header{background:linear-gradient(105deg,var(--navy),#1b4c8d);color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.brand{font-weight:800;letter-spacing:.3px}.brand span{color:#ff9a55}nav{background:#fff;padding:12px 24px;border-bottom:1px solid var(--line);display:flex;gap:14px;flex-wrap:wrap}
a{color:var(--blue);text-decoration:none}nav a{font-weight:650}.container{max-width:1200px;margin:24px auto;padding:0 16px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 4px 16px #112b5508}
h1{font-size:26px;color:var(--navy);margin:0 0 18px}h2{font-size:19px;color:var(--navy);margin-top:0}
label{display:block;font-weight:650;margin:10px 0 5px}input,select,textarea{width:100%;padding:10px 12px;border:1px solid #cbd7e7;border-radius:8px;background:white;font:inherit}textarea{min-height:95px}
button,.btn{display:inline-block;border:0;border-radius:8px;background:var(--blue);color:white;padding:10px 15px;font-weight:700;cursor:pointer}.btn-muted{background:#eef3fa;color:var(--navy)}.btn-orange{background:var(--orange)}
table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line);vertical-align:top}th{background:#f2f6fc;color:var(--navy)}.table-wrap{overflow:auto}.alert{padding:12px 14px;border-radius:8px;background:#e9f8ef;color:#155d35;margin-bottom:15px}.error{background:#fff0f0;color:#9c2020}.muted{color:#66778e;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.metric{padding:18px;border-radius:12px;background:#eef4fc;border-left:4px solid var(--orange)}.metric b{display:block;font-size:25px;color:var(--navy)}
footer{color:#74839a;text-align:center;padding:24px;font-size:12px}
@media(max-width:700px){header{padding:14px;align-items:flex-start;flex-direction:column}nav{padding:12px;gap:10px}.container{margin:14px auto}}
@media print{nav,header,.no-print,footer{display:none!important}body{background:white}.container{margin:0;max-width:none}.card{box-shadow:none}}
</style>
</head>
<body>
<header><div class="brand">KAI <span>|</span> CSMS</div>
@if(auth()->check())<div>{{ auth()->user()->name }} · <form class="no-print" style="display:inline" method="post" action="{{ route('logout') }}">@csrf<button class="btn-muted" type="submit">Keluar</button></form></div>@endif
</header>
@if(auth()->check())
<nav class="no-print">
<a href="{{ route('dashboard') }}">Dashboard</a>
<a href="{{ route('applications.index') }}">Pengajuan Vendor</a>
@if(auth()->user()->hasAnyRole(['admin','verifikator']))<a href="{{ route('reviews.index','verification') }}">Verifikasi Dokumen</a>@endif
@if(auth()->user()->hasAnyRole(['admin','validator']))<a href="{{ route('reviews.index','validation') }}">Validasi Lapangan</a>@endif
@if(auth()->user()->hasRole('admin'))<a href="{{ route('admin.users.index') }}">Kelola Akun Internal</a>@endif
</nav>
@endif
<main class="container">
@if(session('status'))<div class="alert">{{ session('status') }}</div>@endif
@if($errors->any())<div class="alert error"><strong>Periksa kembali:</strong><ul>@foreach($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul></div>@endif
@yield('content')
</main><footer>CSMS PT KAI · Starter Laravel 13 + MySQL · Sesuaikan dengan prosedur resmi sebelum produksi</footer>
</body></html>
