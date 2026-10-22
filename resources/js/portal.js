// Master pertanyaan dan konstanta status berasal dari server (GET /api/state), bukan disalin di sini.
let groups = [], // [[nama grup, [[teks, bobot], ...]], ...]
  questions = [], // [{ id, group, text, max }, ...] berurutan
  STATUS = {}; // { awaitingFill, needsRevision, awaitingVerification, awaitingValidation, validated } => teks status

function setQuestions(list) {
  questions = list.map(q => ({ id: q.id, group: q.group, text: q.text, max: Number(q.max) }));
  groups = [];
  for (const q of questions) {
    let g = groups.find(x => x[0] === q.group);
    if (!g) groups.push((g = [q.group, []]));
    g[1].push([q.text, q.max]);
  }
  // Terjemahan English teks pertanyaan dan nama grup (juga nama pendek tanpa "Proses N.") ikut dari server.
  const shortName = name => name.replace(/^(Proses|Process) \d+\.\s*/, '');
  const en = {};
  for (const q of list) {
    if (q.text_en) en[q.text] = q.text_en;
    if (q.group_en) {
      en[q.group] = q.group_en;
      en[shortName(q.group)] = shortName(q.group_en);
    }
  }
  if (window.I18N) I18N.extend(en);
}
let db = { vendors: [] },
  accounts = [],
  session = null,
  authMode = 'login',
  authSubmitting = false,
  fieldSeq = 0;
const sidebarLogo = document.querySelector('.side .logo'),
  bootLogo = document.getElementById('bootLogo');
if (sidebarLogo && bootLogo) bootLogo.src = sidebarLogo.currentSrc || sidebarLogo.src;
const AUTH_BUTTON = {
  login: ['Masuk', 'Memproses...'],
  register: ['Daftar Akun', 'Mendaftarkan...'],
  mfa: ['Verifikasi', 'Memeriksa...'],
  forgot: ['Kirim tautan', 'Mengirim...'],
  reset: ['Simpan password baru', 'Menyimpan...'],
};
function setAuthSubmitting(isSubmitting) {
  authSubmitting = isSubmitting;
  const button = document.getElementById('authSubmit'),
    text = document.getElementById('authSubmitText');
  button.disabled = isSubmitting;
  const [idle, busy] = AUTH_BUTTON[authMode] || AUTH_BUTTON.login;
  text.textContent = isSubmitting ? busy : idle;
  button.querySelector('.button-spinner')?.remove();
  if (isSubmitting) text.insertAdjacentHTML('beforebegin', '<span class="button-spinner" aria-hidden="true"></span>');
}
function toggleAuthPassword() {
  const input = document.getElementById('authPass'),
    toggle = document.getElementById('authPasswordToggle'),
    icon = document.getElementById('authPasswordIcon'),
    isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(isHidden));
  toggle.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Tampilkan password');
  icon.textContent = isHidden ? 'visibility_off' : 'visibility';
}
const AUTH_TEXT = {
  login: ['Masuk ke aplikasi', 'Gunakan akun sesuai peran Anda.'],
  register: ['Pendaftaran akun', 'Pendaftaran mandiri hanya tersedia untuk Vendor.'],
  mfa: ['Verifikasi dua langkah', 'Masukkan kode dari aplikasi autentikator Anda.'],
  forgot: ['Lupa password', 'Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang password.'],
  reset: ['Atur ulang password', 'Buat password baru untuk akun Anda.'],
};
function showAuth(mode) {
  authMode = mode;
  const [title, desc] = AUTH_TEXT[mode] || AUTH_TEXT.login;
  const show = (id, on) => document.getElementById(id).classList.toggle('hide', !on);
  document.getElementById('authTitle').textContent = title;
  document.getElementById('authDesc').textContent = desc;
  show('fieldUser', ['login', 'register', 'forgot'].includes(mode));
  show('fieldPass', ['login', 'register'].includes(mode));
  show('registerFields', mode === 'register');
  show('fieldCode', mode === 'mfa');
  show('fieldNewPass', mode === 'reset');
  show('authTabs', ['login', 'register'].includes(mode));
  show('linkForgot', mode === 'login');
  show('linkBack', ['mfa', 'forgot', 'reset'].includes(mode));
  document.getElementById('tabLogin').classList.toggle('selected', mode === 'login');
  document.getElementById('tabRegister').classList.toggle('selected', mode === 'register');
  setAuthSubmitting(false);
  document.getElementById('authError').textContent = '';
  const focus = { mfa: 'authCode', reset: 'authNewPass', forgot: 'authUser' }[mode];
  if (focus) setTimeout(() => document.getElementById(focus)?.focus(), 50);
}
function hideBootScreen() {
  const boot = document.getElementById('bootScreen');
  if (boot) boot.style.display = 'none';
}
function showBootError(message) {
  const boot = document.getElementById('bootScreen');
  if (!boot) return;
  boot.innerHTML = `<div class="boot-card"><strong>Aplikasi belum dapat dimuat</strong><span>${esc(message)}</span><button class="btn btn-filled"  type="button" data-click="reloadPage">Coba lagi</button></div>`;
  boot.style.display = 'flex';
}
function rolesOf(r) {
  return Array.isArray(r) ? r : [r].filter(Boolean);
}
function normalizeRoles(r) {
  let rs = rolesOf(r);
  if (rs.includes('admin')) return ['admin'];
  if (rs.includes('vendor')) return ['vendor'];
  return [...new Set(rs)];
}
function roleLabel(r) {
  let labels = {
    vendor: 'Vendor',
    verifikator: 'Verifikator',
    validator: 'Validator',
    pengadaan: 'Bagian Pengadaan',
    admin: 'Admin',
  };
  return rolesOf(r)
    .map(x => labels[x] || x)
    .join(' + ');
}
function isAdmin() {
  return rolesOf(session?.role).includes('admin');
}
function canAccess(p) {
  let rs = rolesOf(session?.role);
  if (rs.includes('admin')) return true;
  let allowed = {
    vendor: ['dashboard', 'vendors', 'register', 'questionnaire'],
    verifikator: ['dashboard', 'vendors', 'verification'],
    validator: ['dashboard', 'vendors', 'validation', 'risk'],
    pengadaan: ['dashboard', 'vendors', 'risk'],
    admin: ['dashboard', 'vendors', 'register', 'questionnaire', 'verification', 'validation', 'risk', 'accounts'],
  };
  return rs.some(r => (allowed[r] || []).includes(p));
}
function defaultPage() {
  let rs = rolesOf(session?.role);
  return rs.includes('admin')
    ? 'dashboard'
    : rs.includes('verifikator')
      ? 'verification'
      : rs.includes('validator')
        ? 'validation'
        : rs.includes('pengadaan')
          ? 'risk'
          : 'dashboard';
}
function applyRoleAccess() {
  document.querySelectorAll('#nav button[data-page]').forEach(b => {
    b.classList.toggle('is-hidden', !canAccess(b.dataset.page));
  });
  let b = document.querySelector('#nav button[data-page="' + page + '"]');
  if (b && b.classList.contains('is-hidden')) go(defaultPage());
  setupMobileNav();
}
const MOBILE_NAV_MAX = 4;
function setupMobileNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const more = document.getElementById('navMore');
  if (!more) return;
  const items = [...nav.querySelectorAll('button[data-page]')];
  const allowed = items.filter(b => !b.classList.contains('is-hidden'));
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  if (!isMobile || allowed.length <= MOBILE_NAV_MAX) {
    items.forEach(b => (b.style.display = ''));
    more.style.display = 'none';
    more.removeAttribute('aria-expanded');
    return;
  }
  allowed.slice(0, MOBILE_NAV_MAX).forEach(b => (b.style.display = ''));
  allowed.slice(MOBILE_NAV_MAX).forEach(b => (b.style.display = 'none'));
  more.style.display = '';
  more.setAttribute('aria-expanded', 'false');
}
function m3Sheet(title, items, headerHtml = '') {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title || 'Menu akun')}"><div class="sheet-handle"></div>${headerHtml}${title ? `<h2 class="sheet-title">${esc(title)}</h2>` : ''}<div class="sheet-list">${items.map((it, i) => `<button type="button" class="sheet-item${it.danger ? ' danger' : ''}" data-i="${i}">${it.icon || ''}<span>${esc(it.label)}</span></button>`).join('')}</div></div>`;
  function close() {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelectorAll('.sheet-item').forEach(
    b =>
      (b.onclick = () => {
        const it = items[Number(b.dataset.i)];
        close();
        if (it && typeof it.onSelect === 'function') it.onSelect();
      })
  );
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  const first = backdrop.querySelector('.sheet-item');
  if (first) first.focus();
  return { close };
}
const ICON_ADD = '<span class="msym btn-icon" aria-hidden="true">add</span>';
const ICON_SHIELD = '<span class="msym sheet-icon" aria-hidden="true">verified_user</span>';
const ICON_LOCK = '<span class="msym sheet-icon" aria-hidden="true">lock</span>';
const ICON_DOWNLOAD = '<span class="msym sheet-icon" aria-hidden="true">download</span>';
const ICON_LOGOUT = '<span class="msym sheet-icon" aria-hidden="true">logout</span>';
function accountInitials() {
  return (
    String(session?.name || session?.username || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0] || '')
      .join('')
      .toUpperCase() || '?'
  );
}
function openAccountSheet() {
  const head = `<div class="sheet-account"><span class="account-avatar">${esc(accountInitials())}</span><div class="sheet-account-meta"><b>${esc(session?.name || session?.username || '')}</b><small>${esc(session?.username || '')}</small><small>${esc(roleLabel(session?.role))}</small></div></div>`;
  m3Sheet(
    '',
    [
      { label: 'Ganti Password', icon: ICON_LOCK, onSelect: () => changePassword() },
      ...(session?.mfaAvailable
        ? [{ label: 'Autentikasi dua langkah', icon: ICON_SHIELD, onSelect: () => mfaDialog() }]
        : []),
      { label: 'Ekspor Data (Excel)', icon: ICON_DOWNLOAD, onSelect: () => exportData() },
      { label: 'Keluar', icon: ICON_LOGOUT, danger: true, onSelect: () => confirmLogout() },
    ],
    head
  );
}
function openMoreSheet() {
  const nav = document.getElementById('nav');
  const overflow = [...nav.querySelectorAll('button[data-page]')]
    .filter(b => canAccess(b.dataset.page))
    .slice(MOBILE_NAV_MAX);
  if (!overflow.length) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Menu lainnya"><div class="sheet-handle"></div><div class="sheet-list">${overflow.map(b => `<button type="button" class="sheet-item" data-page="${b.dataset.page}">${b.querySelector('.nav-icon') ? b.querySelector('.nav-icon').outerHTML : ''}<span>${esc(b.querySelector('span') ? b.querySelector('span').textContent : b.dataset.page)}</span></button>`).join('')}</div></div>`;
  function close() {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    document.getElementById('navMore').setAttribute('aria-expanded', 'false');
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelectorAll('.sheet-item').forEach(
    b =>
      (b.onclick = () => {
        close();
        go(b.dataset.page);
      })
  );
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  document.getElementById('navMore').setAttribute('aria-expanded', 'true');
  backdrop.querySelector('.sheet-item').focus();
}
function loginReady() {
  hideBootScreen();
  if (!session) {
    document.getElementById('authScreen').style.display = 'flex';
    return;
  }
  session.role = rolesOf(session.role);
  document.getElementById('authScreen').style.display = 'none';
  const who = document.getElementById('whoami');
  if (who) who.textContent = session.name || session.username;
  const role = document.getElementById('accountRole');
  if (role) role.textContent = roleLabel(session.role);
  const av = document.getElementById('accountAvatar');
  if (av)
    av.textContent =
      String(session.name || session.username || '?')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0] || '')
        .join('')
        .toUpperCase() || '?';
  applyRoleAccess();
  if (session.mfaSetupRequired) setTimeout(() => mfaDialog(true), 300);
}
let currentId = null,
  page = 'dashboard';
function esc(s = '') {
  return String(s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
function vendor() {
  return db.vendors.find(v => v.id === currentId);
}
function newVendor() {
  return {
    id: 'RCH-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5),
    name: '',
    nib: '',
    npwp: '',
    address: '',
    pic: '',
    email: '',
    phone: '',
    business: '',
    ossRisk: '',
    scope: '',
    branch: '',
    status: 'Draft Pendaftaran',
    answers: {},
    docs: {},
    review: {},
    validation: {},
    created: new Date().toISOString().slice(0, 10),
    docDate: '',
    fieldDate: '',
  };
}
// Kelas warna tag: status vendor dari STATUS; teks lain (jawaban "Ya"/"Tidak", dst.) dikenali dari katanya.
function statusClass(s) {
  if (s === STATUS.validated) return 'tag-success';
  if ([STATUS.awaitingFill, STATUS.needsRevision, STATUS.awaitingVerification, STATUS.awaitingValidation].includes(s))
    return 'tag-warning';
  if (/Tidak|Ditolak/.test(s)) return 'tag-error';
  if (/Lulus|Selesai|Terbit/.test(s)) return 'tag-success';
  return 'tag-neutral';
}
function statusTag(s) {
  const c = statusClass(s);
  const dot = { 'tag-success': 'bg-success', 'tag-error': 'bg-error', 'tag-warning': 'bg-tertiary' }[c] || 'bg-outline';
  return `<span class="tag ${c}"><span class="status-dot ${dot}"></span>${esc(s)}</span>`;
}
function averageMatrix(v, stage, qid) {
  const key = stage === 'review' ? 'reviewByUser' : 'validationByUser';
  const records = Object.values(v?.[key] || {})
    .map(r => r?.scores?.[qid])
    .filter(x => x && Number.isFinite(Number(x.score)));
  if (records.length) return records.reduce((a, x) => a + Number(x.score), 0) / records.length;
  const raw = (v?.[stage] || {})[qid];
  const n = Number(raw && typeof raw === 'object' ? raw.score : raw);
  return Number.isFinite(n) ? n : 0;
}
function maxTotal() {
  return questions.reduce((s, q) => s + Number(q.max), 0);
}
function score(v, stage) {
  return questions.reduce((sum, q) => sum + averageMatrix(v, stage, q.id) * q.max, 0);
}
function reviewerSummary(v, key) {
  const records = Object.entries(v?.[key] || {});
  if (!records.length) return '<div class="empty small">Belum ada penilaian yang disimpan.</div>';
  const stageName = key === 'reviewByUser' ? 'Verifikator' : 'Validator';
  return `<div class="tablewrap"><table><thead><tr><th>${stageName}</th><th>Waktu simpan</th><th>Jumlah kriteria</th><th>Nilai total</th></tr></thead><tbody>${records
    .map(([username, r]) => {
      const vals = Object.values(r.scores || {}).filter(x => x && Number.isFinite(Number(x.score)));
      const total = questions.reduce((a, q) => a + Number(r.scores?.[q.id]?.score || 0) * q.max, 0);
      return `<tr><td><b>${esc(r.name || username)}</b><br><small>${esc(username)}</small></td><td>${r.date ? new Date(r.date).toLocaleString('id-ID') : '-'}</td><td>${vals.length} / ${questions.length}</td><td>${fmtScore(total)} / ${maxTotal()} (${fmtScore((total / maxTotal()) * 100)}%)</td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}
function reviewerCriterionDetails(v, qid, key) {
  const records = Object.entries(v?.[key] || {}).filter(
    ([u, r]) => r?.scores?.[qid] && Number.isFinite(Number(r.scores[qid].score))
  );
  if (!records.length) return 'Belum dinilai';
  return records
    .map(
      ([u, r]) =>
        `${esc(r.name || u)}: ${Number(r.scores[qid].score)}${r.scores[qid].comment ? ` — ${esc(r.scores[qid].comment)}` : ''}`
    )
    .join('<br>');
}

function risk(n) {
  if (n >= 70) return 'Risiko Tinggi';
  if (n >= 50) return 'Risiko Menengah';
  if (n >= 35) return 'Risiko Rendah';
  return 'Tidak Lulus';
}
function badgeRisk(n) {
  let r = risk(n);
  let c = n < 35 ? 'tag-error' : n >= 70 ? 'tag-warning' : 'tag-success';
  return `<span class="tag ${c}">${r}</span>`;
}
function goNow(p) {
  if (!session) {
    document.getElementById('authScreen').style.display = 'flex';
    return;
  }
  if (!canAccess(p)) {
    m3Snackbar('Akses tidak tersedia untuk peran ' + roleLabel(session.role), { type: 'error' });
    return;
  }
  if (p !== page) window.scrollTo(0, 0);
  page = p;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.page === p));
  render();
}
document.querySelectorAll('#nav button').forEach(b => (b.onclick = () => go(b.dataset.page)));
function renderSkeleton() {
  const el = document.getElementById('view');
  if (!el) return;
  el.setAttribute('aria-busy', 'true');
  el.innerHTML =
    '<div class="skeleton-page" role="status" aria-label="Memuat data"><div class="flex items-start justify-between gap-5"><div class="space-y-3"><div class="skeleton h-3 w-32"></div><div class="skeleton h-8 w-64"></div><div class="skeleton h-4 w-96 max-w-full"></div></div><div class="skeleton h-10 w-36"></div></div><div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">' +
    Array.from(
      { length: 4 },
      () =>
        '<div class="card space-y-3"><div class="skeleton h-4 w-2/3"></div><div class="skeleton h-9 w-1/3"></div><div class="skeleton h-3 w-3/4"></div></div>'
    ).join('') +
    '</div><div class="panel space-y-4"><div class="skeleton h-5 w-48"></div><div class="skeleton h-20 w-full"></div><div class="skeleton h-20 w-full"></div></div></div>';
}
const PAGE_RENDERERS = {
  dashboard: dash,
  vendors: vendorsPage,
  register: registerPage,
  questionnaire: questionnairePage,
  verification: verificationPage,
  validation: validationPage,
  risk: riskPage,
  accounts: accountsPage,
};
function renderPage() {
  const el = document.getElementById('view');
  if (!el) return;
  el.removeAttribute('aria-busy');
  const fn = PAGE_RENDERERS[page];
  if (typeof fn === 'function') fn(el);
}
function dash(el) {
  const vs = db.vendors;
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Portal manajemen kontraktor</div><h1>Dashboard CSMS</h1><p>Pantau pendaftaran, pra-kualifikasi, verifikasi, validasi, dan klasifikasi risiko vendor.</p></div>${canAccess('register') ? `<button class="btn btn-filled" data-click="newVendorPage">${ICON_ADD}Daftarkan Vendor</button>` : ''}</div>
<div class="cards"><div class="card card-interactive" role="button" tabindex="0" data-click="openVendorsFiltered" data-args='[""]'><div class="muted">Total Vendor</div><div class="metric">${vs.length}</div><small class="muted">Terdaftar dalam portal</small></div><div class="card card-interactive" role="button" tabindex="0" data-click="openVendorsFiltered" data-args='["${STATUS.awaitingVerification}"]'><div class="muted">Menunggu Verifikasi</div><div class="metric">${vs.filter(v => v.status === STATUS.awaitingVerification).length}</div><small class="muted">Tugas Unit Keselamatan</small></div><div class="card card-interactive" role="button" tabindex="0" data-click="openVendorsFiltered" data-args='["${STATUS.awaitingValidation}"]'><div class="muted">Menunggu Validasi</div><div class="metric">${vs.filter(v => v.status === STATUS.awaitingValidation).length}</div><small class="muted">Tinjauan lapangan</small></div><div class="card card-interactive" role="button" tabindex="0" data-click="openVendorsFiltered" data-args='["${STATUS.validated}"]'><div class="muted">Tervalidasi</div><div class="metric">${vs.filter(v => v.status === STATUS.validated).length}</div><small class="muted">Nilai lapangan final</small></div></div>
<div class="panel"><div class="row between"><h2>Alur proses</h2><span class="tag tag-neutral">Sesuai prosedur RCHSEMS</span></div><div class="cards cards-3"><div><b>01 · Pendaftaran</b><p class="muted small">Data perusahaan, NIB/OSS, lingkup kerja.</p></div><div><b>02 · Pra-kualifikasi</b><p class="muted small">Isi 8 proses dan unggah bukti dokumen.</p></div><div><b>03 · Verifikasi</b><p class="muted small">Unit Keselamatan menilai dokumen.</p></div><div><b>04 · Validasi</b><p class="muted small">Validasi lapangan dan pembaruan nilai.</p></div><div><b>05 · Penetapan</b><p class="muted small">Klasifikasi risiko berdasarkan nilai lapangan.</p></div><div><b>06 · Sertifikat</b><p class="muted small">Vendor Management menerbitkan sertifikat.</p></div></div></div>
<div class="panel"><div class="row between"><h2>Aktivitas terbaru</h2><button class="btn btn-tonal" data-click="go" data-args='["vendors"]'>Lihat semua</button></div>${vs.length ? vendorTable(vs.slice(-5).reverse()) : '<div class="empty">Belum ada data vendor. Mulai dari pendaftaran vendor.</div>'}</div>
<div class="note small"><b>Catatan:</b> Data dan bukti tersimpan terpusat di server. Setiap pengguna hanya dapat menjalankan tindakan sesuai kewenangannya.</div>`;
}
function roleTargetPage() {
  let rs = rolesOf(session?.role);
  if (rs.includes('admin') || rs.includes('vendor')) return 'questionnaire';
  return defaultPage();
}
function vendorTable(vs, adminMode = false) {
  return `<div class="tablewrap"><table><thead><tr><th>ID / Perusahaan</th><th>Lingkup</th><th>Status</th><th>Nilai PK</th><th>Kategori</th><th>Aksi</th></tr></thead><tbody>${vs.map(v => `<tr><td><b>${esc(v.name || '(Nama belum diisi)')}</b><br><small class="muted code">${esc(v.id)}</small></td><td>${esc(v.scope || '-')}</td><td>${statusTag(v.status)}${adminMode && v.draft_saved_at && v.answered < v.total ? `<br><span class="tag tag-warning">Draft ${v.answered}/${v.total}</span>` : ''}</td><td class="num">${fmtScore(((v.status === STATUS.validated ? score(v, 'validation') : score(v, 'review')) / maxTotal()) * 100)}</td><td>${v.status === STATUS.validated ? badgeRisk((score(v, 'validation') / maxTotal()) * 100) : '-'}</td><td><button class="btn btn-tonal" data-click="openVendorDefault" data-args='["${v.id}"]'>Buka</button>${adminMode && isAdmin() ? ` <button class="btn btn-danger" data-click="deleteVendor" data-args='["${v.id}"]'>Hapus</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
let vendorFilter = { q: '', status: '' };
// Urutan filter status pada daftar vendor (nilainya dari STATUS, dimuat setelah /api/state).
const vendorStatuses = () => [
  STATUS.awaitingFill,
  STATUS.awaitingVerification,
  STATUS.needsRevision,
  STATUS.awaitingValidation,
  STATUS.validated,
];
function openVendorsFiltered(status) {
  vendorFilter = { q: '', status: status || '' };
  go('vendors');
}
function vendorsFiltered() {
  const q = vendorFilter.q.trim().toLowerCase();
  return [...db.vendors].reverse().filter(
    v =>
      (!vendorFilter.status || v.status === vendorFilter.status) &&
      (!q ||
        [v.name, v.id, v.scope, v.pic].some(x =>
          String(x || '')
            .toLowerCase()
            .includes(q)
        ))
  );
}
function setVendorStatus(s) {
  vendorFilter.status = vendorFilter.status === s ? '' : s;
  paintVendorList();
}
function paintVendorList() {
  const list = document.getElementById('vendorList'),
    chips = document.getElementById('vendorChips');
  if (!list || !chips) return;
  const count = s => db.vendors.filter(v => v.status === s).length;
  chips.innerHTML =
    `<button type="button" class="chip chip-filter${vendorFilter.status ? '' : ' selected'}" data-click="setVendorStatus" data-args='[""]'>Semua <b>${db.vendors.length}</b></button>` +
    vendorStatuses()
      .filter(st => count(st) || vendorFilter.status === st)
      .map(
        st =>
          `<button type="button" class="chip chip-filter${vendorFilter.status === st ? ' selected' : ''}" data-click="setVendorStatus" data-args='["${st}"]'>${st} <b>${count(st)}</b></button>`
      )
      .join('');
  const vs = vendorsFiltered();
  list.innerHTML = !db.vendors.length
    ? '<div class="empty">Belum ada vendor.</div>'
    : vs.length
      ? vendorTable(vs, true)
      : '<div class="empty">Tidak ada vendor yang cocok dengan pencarian atau filter.<br><button type="button" class="btn btn-text" style="margin-top:8px" data-click="clearVendorFilter">Hapus filter</button></div>';
}
function vendorsPage(el) {
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Database vendor</div><h1>Data Vendor</h1><p>Daftar dan status setiap perusahaan/lingkup yang didaftarkan.</p></div>${canAccess('register') ? `<button class="btn btn-filled" data-click="newVendorPage">${ICON_ADD}Vendor Baru</button>` : ''}</div><div class="panel"><div class="toolbar"><label class="search"><span class="msym" aria-hidden="true">search</span><input id="vendorSearch" type="search" placeholder="Cari nama, ID, atau lingkup" aria-label="Cari vendor" autocomplete="off" value="${esc(vendorFilter.q)}"></label><div class="chips" id="vendorChips"></div></div><div id="vendorList"></div></div>`;
  document.getElementById('vendorSearch').addEventListener('input', e => {
    vendorFilter.q = e.target.value;
    paintVendorList();
  });
  paintVendorList();
}
function registerPage(el) {
  let v = vendor() || newVendor();
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Langkah 1 dari 5</div><h1>Pendaftaran Vendor</h1><p>Isi data perusahaan dan lingkup yang akan dikualifikasi.</p></div></div><div class="stepbar"><span class="step on">1 Pendaftaran</span><span class="step">2 Pra-Kualifikasi</span><span class="step">3 Verifikasi</span><span class="step">4 Validasi</span><span class="step">5 Penetapan</span></div><form id="regForm" class="panel" novalidate><div class="formgrid">${field('Nama Perusahaan', 'name', v.name, true)}${field('NIB', 'nib', v.nib, true)}${field('NPWP', 'npwp', v.npwp)}${field('Tingkat Risiko OSS', 'ossRisk', v.ossRisk, false, 'select', ['Rendah', 'Menengah Rendah', 'Menengah Tinggi', 'Tinggi'])}${field('Alamat Perusahaan', 'address', v.address, true)}${field('Cabang/Unit yang didaftarkan', 'branch', v.branch)}${field('Penanggung Jawab HSE', 'pic', v.pic, true)}${field('Email Resmi', 'email', v.email, true, 'email')}${field('Nomor Telepon', 'phone', v.phone)}${field('Bidang Usaha', 'business', v.business, true)}${field('Lingkup pekerjaan yang dimohonkan', 'scope', v.scope, true)}<div class="field field-area wide"><label for="f_notes">Catatan / informasi tambahan</label><textarea id="f_notes" name="notes" placeholder=" ">${esc(v.notes || '')}</textarea></div></div><div class="row between" style="margin-top:18px"><span class="muted small">Kolom bertanda * wajib diisi.</span><button class="btn btn-filled"  type="submit">Simpan & Lanjut Pra-Kualifikasi →</button></div></form>`;
  document.getElementById('regForm').onsubmit = saveProfile;
}

function field(label, name, value, req = false, type = 'text', opts = []) {
  const id = 'f_' + name + '_' + fieldSeq++;
  const control =
    type === 'select'
      ? `<select id="${id}" name="${name}" ${req ? 'required' : ''}><option value="">Pilih...</option>${opts.map(o => `<option ${value === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`
      : `<input id="${id}" name="${name}" type="${type}" value="${esc(value || '')}" placeholder=" " ${req ? 'required' : ''} autocomplete="off">`;
  return `<div class="field">${control}<label for="${id}">${label}${req ? ' *' : ''}</label></div>`;
}
async function openVendor(id, p) {
  await pqFlush();
  currentId = id;
  go(p);
}
// ===== Material 3: dialog & snackbar =====
let m3DialogHost = null;
function m3Snackbar(message, opts = {}) {
  const el = document.createElement('div');
  el.className = 'snackbar' + (opts.type === 'error' ? ' error' : '');
  el.setAttribute('role', opts.type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span>${esc(message)}</span>${opts.action ? `<button class="btn btn-text" type="button">${esc(opts.action)}</button>` : ''}`;
  document.body.appendChild(el);
  const timer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms';
    setTimeout(() => el.remove(), 220);
  }, opts.duration || 4500);
  if (opts.action && opts.onAction)
    el.querySelector('button').onclick = () => {
      clearTimeout(timer);
      el.remove();
      opts.onAction();
    };
  return el;
}
function m3Dialog(opts) {
  return new Promise(resolve => {
    const actions = opts.actions || [{ label: 'Tutup', value: 'ok', variant: 'text' }];
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="m3dlgTitle">
      ${opts.icon ? '<div class="dialog-icon">' + opts.icon + '</div>' : ''}
      <h2 id="m3dlgTitle">${esc(opts.title || '')}</h2>
      ${opts.bodyHtml ? opts.bodyHtml : opts.body ? '<p>' + esc(opts.body).replace(/\n/g, '<br>') + '</p>' : ''}
      ${opts.field ? `<div class="field mt-4"><input class="dialog-text" id="m3dlgInput" placeholder=" " value="${esc(opts.field.value || '')}" ${opts.field.required ? 'required' : ''}><label for="m3dlgInput">${esc(opts.field.label)}</label></div>${opts.field.hint ? `<p class="field-hint">${esc(opts.field.hint)}</p>` : ''}` : ''}
      <div class="dialog-actions">${actions.map((a, i) => `<button type="button" class="btn btn-${a.variant || 'text'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>
    </div>`;
    const previousFocus = document.activeElement;
    const close = value => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve(value);
    };
    const onKey = e => {
      if (e.key === 'Escape' && opts.dismissible !== false) {
        e.preventDefault();
        close(null);
      }
      if (e.key === 'Tab') {
        const f = [...backdrop.querySelectorAll('button,input,select,textarea,[href]')].filter(
          x => !x.disabled && x.offsetParent !== null
        );
        if (!f.length) return;
        const first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop && opts.dismissible !== false) close(null);
    });
    backdrop.querySelectorAll('.dialog-actions button').forEach(
      b =>
        (b.onclick = () => {
          const a = actions[Number(b.dataset.i)];
          const input = backdrop.querySelector('#m3dlgInput');
          if (a.requiresInput && input && !input.value.trim()) {
            input.focus();
            m3Snackbar(a.requiresInput, { type: 'error' });
            return;
          }
          // Nilai medan isian harus diambil sebelum dialog ditutup.
          close(a.captureInput ? { value: a.value, input: input ? input.value.trim() : '' } : a.value);
        })
    );
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('#m3dlgInput');
    if (input) {
      input.focus();
      input.select();
    } else {
      const f = backdrop.querySelector('.dialog-actions button');
      if (f) f.focus();
    }
  });
}
function m3Confirm(title, body, confirmLabel = 'Lanjutkan', danger = false) {
  // `body` boleh berupa objek {body, bodyHtml} untuk isi berformat.
  const opts = body && typeof body === 'object' ? body : { body };
  return m3Dialog({
    title,
    ...opts,
    actions: [
      { label: 'Batal', value: false, variant: 'text' },
      { label: confirmLabel, value: true, variant: danger ? 'danger' : 'filled' },
    ],
  }).then(v => v === true);
}

// ===== Draft pra-kualifikasi =====
let pqEls = {},
  pqTimer = null,
  pqSaving = false,
  pqSavedAt = null,
  pqDirty = false,
  pqRev = 0;
const pendingFiles = {};
const DOC_FORMATS = 'PDF, Word (.doc/.docx), Excel (.xls/.xlsx), JPG, dan PNG · maks. 15 MB per berkas';
function pqFormatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString(window.I18N ? I18N.locale() : 'id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function pqLocked() {
  const v = vendor();
  return !v || ![STATUS.awaitingFill, STATUS.needsRevision].includes(v.status);
}
function questionnairePage(el) {
  let v = vendor();
  if (!v) {
    const internal = rolesOf(session?.role).some(r => ['verifikator', 'validator', 'pengadaan', 'admin'].includes(r));
    el.innerHTML = internal
      ? `<div class="heading"><div><div class="eyebrow">Langkah 2 dari 5</div><h1>Pra-Kualifikasi</h1><p>Pilih vendor untuk melihat isian pra-kualifikasinya.</p></div></div><div class="panel">${picker()}${db.vendors.length ? '' : '<div class="empty">Belum ada data vendor. Daftarkan vendor terlebih dahulu.</div>'}</div>`
      : `<div class="empty panel">Pilih vendor terlebih dahulu dari <button class="btn btn-text" data-click="go" data-args='["vendors"]'>Data Vendor</button> atau daftarkan vendor baru.</div>`;
    return;
  }
  const a = v.answers || {},
    total = questions.length;
  const resume =
    v.draft_saved_at && v.answered < v.total
      ? `<div class="panel pq-resume" id="pqResume"><div><b>Draft tersimpan · ${v.answered} dari ${total} pertanyaan terisi</b><p class="muted small">Terakhir disimpan ${pqFormatTime(v.draft_saved_at)}. Draft ini tersimpan di server, jadi bisa dilanjutkan dari perangkat lain.</p></div><button type="button" class="btn btn-tonal" data-click="pqFocusMissing">Lanjutkan pengisian</button></div>`
      : '';
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Langkah 2 dari 5 · ${esc(v.id)}</div><h1>Pra-Kualifikasi</h1><p>${esc(v.name)} · Isi ketersediaan dokumen dan unggah bukti untuk tiap proses.</p></div><button class="btn btn-tonal" data-click="go" data-args='["vendors"]'>Kembali ke daftar</button></div>
 ${resume}
 <div class="pq-bar"><div class="pq-bar-row"><div><b>Kelengkapan jawaban</b> <span class="muted small" id="pqCount">0 / ${total} pertanyaan terisi</span></div><div class="pq-pct" id="pqPct">0%</div></div>
 <div class="progress"><div id="pqFill" style="width:0%"></div></div>
 <div class="pq-chips" id="pqChips"></div>
 <p class="muted small pq-hint">Jawaban dan keterangan tersimpan otomatis. Berkas lampiran baru diunggah ke server setelah tombol simpan ditekan. Format: ${DOC_FORMATS}.</p></div>
 <form id="qForm">${groups.map((g, gi) => pqGroupHtml(g, gi, a, false)).join('')}
 <div class="pq-actions"><div class="pq-actions-info"><span class="pq-save-state" id="pqSaveState">Belum ada perubahan</span><span class="pq-pending" id="pqPending"></span></div>
 <div class="pq-actions-btns"><button type="button" class="btn btn-tonal" data-click="saveDraft">Simpan Draft</button><button class="btn btn-filled"  type="button" data-click="submitQuestionnaire">Kirim untuk Verifikasi →</button></div></div></form>`;
  pqSavedAt = v.draft_saved_at || null;
  pqDirty = false;
  pqBind();
}
function pqGroupHtml(g, gi, a, open) {
  const qs = questions.filter(q => q.group === g[0]);
  const done = qs.filter(q => a[q.id] && (a[q.id].answer === 'Ya' || a[q.id].answer === 'Tidak')).length;
  return `<section class="pq-group"><button type="button" class="pq-group-head${open ? ' open' : ''}" data-click="pqToggleGroup" data-args='[${gi}]' aria-expanded="${open}"><span class="pq-group-caret" aria-hidden="true">▸</span><span class="pq-group-name">${esc(g[0])}</span><span class="pq-group-count${done === qs.length ? ' complete' : ''}" id="pqGroupCount_${gi}">${done}/${qs.length}</span></button>
 <div class="pq-group-body" id="pqGroupBody_${gi}"${open ? '' : ' hidden'}>${qs.map(q => pqQuestionHtml(q, a)).join('')}</div></section>`;
}
function pqQuestionHtml(q, a) {
  const cur = a[q.id] || {},
    hasNote = !!(cur.note && cur.note.trim());
  return `<div class="question" data-qid="${q.id}"><div class="qmeta">Pertanyaan ${q.id} · Bobot maksimum ${q.max}</div><div class="qtitle">${esc(q.text)}</div>
 <div class="choices"><label><input type="radio" name="a_${q.id}" value="Ya" ${cur.answer === 'Ya' ? 'checked' : ''}> Ya, tersedia</label><label><input type="radio" name="a_${q.id}" value="Tidak" ${cur.answer === 'Tidak' ? 'checked' : ''}> Tidak tersedia</label></div>
 <div class="pq-files"><input type="file" class="pq-fileinput" id="pqFile_${q.id}" data-doc="${q.id}" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"><button type="button" class="pq-filebtn" data-click="pqPickFile" data-args='["${q.id}"]'>${ICON_ADD}Pilih berkas</button><span class="pq-filelist" id="pqFiles_${q.id}"></span></div>
 <div class="pq-note"><button type="button" class="pq-notetoggle" data-notebtn="${q.id}" data-click="pqToggleNote" data-args='["${q.id}"]'>${hasNote ? 'Keterangan tersimpan' : 'Tambah keterangan'}</button><input name="note_${q.id}" value="${esc(cur.note || '')}" placeholder="Nomor dokumen, masa berlaku, atau catatan" class="pq-noteinput" id="pqNote_${q.id}" ${hasNote ? '' : 'hidden'}></div></div>`;
}
function pqBind() {
  pqEls = {};
  document.querySelectorAll('#qForm .question').forEach(box => {
    const qid = box.dataset.qid;
    pqEls[qid] = { radios: [...box.querySelectorAll('input[type=radio]')], note: box.querySelector('.pq-noteinput') };
  });
  document.querySelectorAll('#qForm input[type=radio]').forEach(r => r.addEventListener('change', () => pqTouch()));
  document.querySelectorAll('#qForm .pq-noteinput').forEach(n => n.addEventListener('input', () => pqTouch()));
  document
    .querySelectorAll('#qForm input[type=file]')
    .forEach(inp => inp.addEventListener('change', () => stageEvidence(inp)));
  pqRenderFiles();
  pqUpdateProgress();
  pqSetSaveState(pqSavedAt ? 'saved' : 'idle');
}
function pqTouch() {
  pqDirty = true;
  pqRev++;
  pqUpdateProgress();
  clearTimeout(pqTimer);
  pqTimer = setTimeout(() => pqAutosave(), 2000);
}
function pqUpdateProgress() {
  const total = questions.length;
  let done = 0;
  const per = {};
  for (const q of questions) {
    const els = pqEls[q.id];
    const ok = !!(els && els.radios.find(r => r.checked));
    if (ok) done++;
    per[q.group] ??= { done: 0, total: 0 };
    per[q.group].total++;
    if (ok) per[q.group].done++;
  }
  const pct = Math.round((done / total) * 100);
  const c = document.getElementById('pqCount');
  if (c) c.textContent = done + ' / ' + total + ' pertanyaan terisi';
  const p = document.getElementById('pqPct');
  if (p) p.textContent = pct + '%';
  const f = document.getElementById('pqFill');
  if (f) f.style.width = pct + '%';
  groups.forEach((g, gi) => {
    const el = document.getElementById('pqGroupCount_' + gi);
    if (!el) return;
    const s = per[g[0]] || { done: 0, total: 0 };
    el.textContent = s.done + '/' + s.total;
    el.classList.toggle('complete', s.done === s.total);
  });
  const chips = document.getElementById('pqChips');
  if (chips)
    chips.innerHTML = groups
      .map((g, gi) => {
        const s = per[g[0]] || { done: 0, total: 0 };
        return `<button type="button" class="pq-chip${s.done === s.total ? ' complete' : ''}" data-click="pqGoGroup" data-args='[${gi}]'>${esc(g[0].replace(/^Proses \d+\.\s*/, ''))} <b>${s.done}/${s.total}</b></button>`;
      })
      .join('');
}
// Hanya satu akordeon yang boleh terbuka pada satu waktu.
function pqCloseOthers(gi) {
  groups.forEach((g, i) => {
    if (i === gi) return;
    const b = document.getElementById('pqGroupBody_' + i);
    if (!b || b.hidden) return;
    b.hidden = true;
    const h = b.previousElementSibling;
    if (h) {
      h.setAttribute('aria-expanded', 'false');
      h.classList.remove('open');
    }
  });
}
function pqGoGroup(gi) {
  const body = document.getElementById('pqGroupBody_' + gi);
  if (!body) return;
  pqCloseOthers(gi);
  body.hidden = false;
  const head = body.previousElementSibling;
  if (head) {
    head.setAttribute('aria-expanded', 'true');
    head.classList.add('open');
  }
  body.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function pqToggleGroup(gi) {
  const body = document.getElementById('pqGroupBody_' + gi);
  if (!body) return;
  if (body.hidden) pqCloseOthers(gi);
  body.hidden = !body.hidden;
  const head = body.previousElementSibling;
  if (head) {
    head.setAttribute('aria-expanded', String(!body.hidden));
    head.classList.toggle('open', !body.hidden);
  }
}
function pqToggleNote(qid) {
  const input = document.getElementById('pqNote_' + qid);
  if (!input) return;
  const btn = document.querySelector(`[data-notebtn="${qid}"]`);
  if (!btn) return;
  if (input.value.trim()) {
    input.hidden = false;
    btn.textContent = 'Keterangan tersimpan';
    return;
  }
  input.hidden = !input.hidden;
  btn.textContent = input.hidden ? 'Tambah keterangan' : 'Keterangan';
  if (!input.hidden) input.focus();
}
function pqFocusMissing() {
  const q = questions.find(q => {
    const els = pqEls[q.id];
    return !(els && els.radios.find(r => r.checked));
  });
  if (!q) return;
  const gi = groups.findIndex(g => g[0] === q.group);
  if (gi >= 0) pqGoGroup(gi);
  const els = pqEls[q.id];
  if (els && els.radios[0]) els.radios[0].focus();
}
function pqMissingIds() {
  return questions
    .filter(q => {
      const els = pqEls[q.id];
      return !(els && els.radios.find(r => r.checked));
    })
    .map(q => q.id);
}
function pqShowMissing(ids) {
  const byGroup = {};
  for (const id of ids) {
    const q = questions.find(x => x.id === id);
    if (!q) continue;
    (byGroup[q.group] ??= []).push(id);
  }
  const rows = Object.entries(byGroup)
    .map(([g, l]) => `<li class="pq-missing-item"><b>${esc(g)}</b><span>${esc(l.join(', '))}</span></li>`)
    .join('');
  m3Dialog({
    title: 'Pengisian belum lengkap',
    bodyHtml: `<p>Masih ada <b>${ids.length}</b> pertanyaan yang belum dijawab.</p><ul class="pq-missing">${rows}</ul>`,
    actions: [{ label: 'Lanjut mengisi', value: 'ok', variant: 'filled' }],
  });
  for (const g of Object.keys(byGroup)) {
    const gi = groups.findIndex(x => x[0] === g);
    if (gi < 0) continue;
    const body = document.getElementById('pqGroupBody_' + gi);
    if (!body) continue;
    body.hidden = false;
    const head = body.previousElementSibling;
    if (head) {
      head.setAttribute('aria-expanded', 'true');
      head.classList.add('open');
    }
  }
  pqFocusMissing();
}
function pqDiff() {
  const base = (vendor() && vendor().answers) || {},
    out = [];
  for (const q of questions) {
    const els = pqEls[q.id];
    if (!els) continue;
    const radio = els.radios.find(r => r.checked);
    const ans = radio ? radio.value : '';
    const note = els.note ? els.note.value : '';
    const old = base[q.id] || {};
    if (ans !== (old.answer || '') || note !== (old.note || ''))
      out.push({ question_id: q.id, answer: ans, note: note });
  }
  return out;
}
function pqApplySaved(rows) {
  const v = vendor();
  if (!v) return;
  v.answers ??= {};
  for (const r of rows) {
    v.answers[r.question_id] = { ...(v.answers[r.question_id] || {}), answer: r.answer, note: r.note };
  }
}
async function pqSaveNow() {
  if (pqLocked()) return null;
  const changed = pqDiff();
  if (!changed.length) return null;
  const rev = pqRev;
  const res = await api('/vendors/' + currentId + '/answers', 'POST', { answers: changed });
  // Edits made while the request was in flight stay dirty so the next autosave sends them.
  pqApplySaved(changed);
  if (pqRev === rev) pqDirty = false;
  pqSavedAt = res.draft_saved_at;
  return res;
}
async function pqFlush() {
  try {
    if (pqDirty) await pqSaveNow();
  } catch (e) {
    pqSetSaveState('error', e.message);
  }
}
async function pqAutosave() {
  clearTimeout(pqTimer);
  if (pqSaving || !pqDirty) return;
  pqSaving = true;
  pqSetSaveState('saving');
  let ok = false;
  try {
    await pqSaveNow();
    ok = true;
    pqSetSaveState('saved');
  } catch (e) {
    pqSetSaveState('error', e.message);
  } finally {
    pqSaving = false;
    if (ok && pqDirty && !pqLocked()) {
      clearTimeout(pqTimer);
      pqTimer = setTimeout(() => pqAutosave(), 500);
    }
  }
}
// Simpan terakhir saat tab ditutup atau halaman disembunyikan.
function pqFlushOnExit() {
  if (!pqDirty || !currentId || pqLocked()) return;
  const changed = pqDiff();
  if (!changed.length) return;
  const token = document.querySelector('meta[name="csrf-token"]')?.content;
  try {
    fetch('/api/vendors/' + currentId + '/answers', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Lang': window.I18N ? I18N.lang : 'id',
        'X-CSRF-TOKEN': token || '',
      },
      body: JSON.stringify({ answers: changed }),
    }).catch(() => {});
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') pqFlushOnExit();
});
window.addEventListener('pagehide', () => pqFlushOnExit());
function pqSetSaveState(state, msg) {
  const el = document.getElementById('pqSaveState');
  if (!el) return;
  if (state === 'saving') el.textContent = 'Menyimpan…';
  else if (state === 'saved') el.textContent = 'Tersimpan ' + pqFormatTime(pqSavedAt || new Date().toISOString());
  else if (state === 'error') el.textContent = 'Gagal menyimpan: ' + (msg || 'periksa koneksi');
  else el.textContent = pqSavedAt ? 'Tersimpan ' + pqFormatTime(pqSavedAt) : 'Belum ada perubahan';
  el.className = 'pq-save-state' + (state === 'error' ? ' error' : state === 'saving' ? ' saving' : '');
}
function canRemoveEvidence(v) {
  if (!v) return false;
  if (isAdmin()) return true;
  if (!rolesOf(session?.role).includes('vendor')) return false;
  return [STATUS.awaitingFill, STATUS.needsRevision].includes(v.status);
}
function pqRenderFiles() {
  const v = vendor(),
    removable = canRemoveEvidence(v);
  for (const q of questions) {
    const el = document.getElementById('pqFiles_' + q.id);
    if (!el) continue;
    const saved = (v && v.answers && v.answers[q.id] && v.answers[q.id].files) || [],
      pend = stagedFiles(q.id),
      parts = [];
    saved.forEach((f, i) =>
      parts.push(
        `<span class="pq-file"><a href="#" data-click="downloadEvidence" data-args='["${v.id}","${q.id}","${f.id}"]' title="Unduh ${esc(f.name)}">📄 ${esc(f.name)}</a>${removable ? `<button type="button" class="pq-file-x" data-click="removeSavedFile" data-args='["${q.id}","${f.id}"]' aria-label="Hapus lampiran ${esc(f.name)}" title="Hapus lampiran">×</button>` : ''}</span>`
      )
    );
    pend.forEach((f, i) =>
      parts.push(
        `<span class="pq-file pending">📄 ${esc(f.name)} <em>menunggu simpan</em><button type="button" class="pq-file-x" data-click="removeStagedFile" data-args='["${q.id}",${i}]' aria-label="Batalkan pilihan ${esc(f.name)}" title="Batalkan pilihan berkas">×</button></span>`
      )
    );
    el.innerHTML = parts.length ? parts.join('') : '<span class="muted small">Belum ada lampiran</span>';
  }
  pqUpdatePending();
}
async function removeStagedFile(qid, index) {
  const v = vendor();
  if (!v) return;
  if (
    !(await m3Confirm(
      'Keluarkan berkas dari daftar?',
      'Berkas ini belum diunggah ke server dan akan dikeluarkan dari daftar lampiran.',
      'Keluarkan',
      true
    ))
  )
    return;
  const list = (pendingFiles[v.id] && pendingFiles[v.id][qid]) || [];
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  pqRenderFiles();
}
async function removeSavedFile(qid, fileId) {
  const v = vendor();
  if (!v) return;
  const ok = await m3Confirm(
    'Hapus lampiran?',
    'Berkas yang dihapus akan dihapus permanen dari server dan tidak dapat dikembalikan.',
    'Hapus lampiran',
    true
  );
  if (!ok) return;
  await action(async () => {
    await api('/evidence/' + encodeURIComponent(fileId), 'DELETE');
    const entry = v.answers && v.answers[qid];
    if (entry && entry.files) entry.files = entry.files.filter(f => f.id !== fileId);
    pqRenderFiles();
    m3Snackbar('Lampiran dihapus dari server.');
  });
}
function pqUpdatePending() {
  let n = 0;
  for (const q of questions) n += stagedFiles(q.id).length;
  const el = document.getElementById('pqPending');
  if (!el) return;
  el.textContent = n ? `${n} berkas belum diunggah · tekan Simpan Draft` : '';
}
async function saveDraft() {
  if (
    !(await m3Confirm(
      'Simpan draft?',
      'Jawaban dan lampiran yang dipilih akan disimpan ke server. Anda dapat melanjutkan kapan saja sebelum mengirim.',
      'Simpan'
    ))
  )
    return;
  clearTimeout(pqTimer);
  pqSetSaveState('saving');
  try {
    await pqSaveNow();
    await uploadStagedEvidence();
    pqRenderFiles();
    pqSetSaveState('saved');
    m3Snackbar('Draft tersimpan di server.');
  } catch (e) {
    pqSetSaveState('error', e.message);
    m3Snackbar(e.message, { type: 'error' });
  }
}

function autoPick(status) {
  let v = vendor();
  if (!v) {
    const c = db.vendors.find(x => x.status === status);
    if (c) {
      currentId = c.id;
      v = c;
    }
  }
  return v;
}
function selectVendorOptions(status) {
  const opt = v =>
    `<option value="${v.id}" ${currentId === v.id ? 'selected' : ''}>${esc(v.name || v.id)} — ${esc(v.id)}</option>`;
  if (!status) return db.vendors.map(opt).join('');
  const todo = db.vendors.filter(v => v.status === status),
    rest = db.vendors.filter(v => v.status !== status);
  return (
    (todo.length
      ? `<optgroup label="Menunggu tindakan Anda (${todo.length})">${todo.map(opt).join('')}</optgroup>`
      : '') + (rest.length ? `<optgroup label="Vendor lain">${rest.map(opt).join('')}</optgroup>` : '')
  );
}
function picker(status) {
  return `<div class="field" style="max-width:560px;margin-bottom:16px"><select id="vendorPicker" data-change="pqSwitchVendor"><option value="">Pilih...</option>${selectVendorOptions(status)}</select><label for="vendorPicker">Pilih vendor</label></div>`;
}
function verificationPage(el) {
  let v = autoPick(STATUS.awaitingVerification);
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Langkah 3 dari 5</div><h1>Verifikasi Dokumen</h1><p>Unit Keselamatan menilai dokumen dan memberi catatan per pertanyaan.</p></div></div>${picker(STATUS.awaitingVerification)}${
    !v
      ? '<div class="panel empty">Pilih vendor untuk mulai verifikasi.</div>'
      : `<div class="panel"><div class="row between"><div><h2>${esc(v.name)}</h2><p class="muted small">${esc(v.id)} · ${esc(v.scope)}</p></div>${statusTag(v.status)}</div><div class="formgrid">${field('Tanggal verifikasi dokumen', 'docDate', v.docDate, false, 'date')}${field('Nama evaluator', 'evaluator', v.evaluator || '')}</div><div class="role-note">Setiap akun verifikator menyimpan rekam penilaiannya sendiri. Lebih dari satu verifikator dapat menilai pengajuan yang sama.</div><div class="panel" style="margin-top:14px"><h2>Rekap penilaian seluruh verifikator</h2><p class="muted small">Data dapat dilihat bersama. Nilai per kriteria dan total dihitung dari rata-rata skor verifikator yang telah menyimpan penilaian.</p>${reviewerSummary(v, 'reviewByUser')}</div><div class="note small">Skala matriks sesuai formulir: 0; 0,25; 0,5; 0,75; 1. Nilai dicapai = matriks × nilai maksimum. Nilai total dokumen bersifat sementara; nilai akhir mengikuti hasil validasi lapangan.</div>${groups
          .map(
            g =>
              `<div style="margin-top:20px"><h2>${esc(g[0])}</h2><div class="tablewrap"><table><thead><tr><th>Pertanyaan</th><th>Bobot</th><th>Jawaban vendor</th><th>Matriks dokumen</th><th>Nilai</th><th>Keterangan verifikasi</th></tr></thead><tbody>${questions
                .filter(q => q.group === g[0])
                .map(
                  q =>
                    `<tr><td>${esc(q.id)}. ${esc(q.text)}</td><td>${q.max}</td><td>${statusTag(v.answers[q.id]?.answer || 'Belum diisi')}<br><small>${v.answers[q.id]?.files?.length || v.answers[q.id]?.fileId ? (v.answers[q.id]?.files?.length ? v.answers[q.id].files.map((f, i) => `<a href="#" data-click="downloadEvidence" data-args='["${v.id}","${q.id}","${f.id}"]'>Unduh ${i + 1}: ${esc(f.name)}</a>`).join('<br>') : `<a href="#" data-click="downloadEvidence" data-args='["${v.id}","${q.id}"]'>Unduh: ${esc(v.answers[q.id].fileName || 'File bukti')}</a>`) : 'Tanpa bukti'}</small></td><td><select data-review="${q.id}">${[0, 0.25, 0.5, 0.75, 1].map(n => `<option value="${n}" ${Number(v.reviewByUser?.[session?.username]?.scores?.[q.id]?.score ?? v.review[q.id]?.score ?? 0) === n ? 'selected' : ''}>${n.toLocaleString('id-ID')}</option>`).join('')}</select></td><td><b id="val_${q.id}">${fmtScore(averageMatrix(v, 'review', q.id) * q.max)}</b></td><td><input data-comment="${q.id}" value="${esc(v.reviewByUser?.[session?.username]?.scores?.[q.id]?.comment ?? v.review[q.id]?.comment ?? '')}" placeholder="Catatan pemeriksa"></td></tr>`
                )
                .join('')}</tbody></table></div></div>`
          )
          .join(
            ''
          )}<div class="panel" style="margin-top:18px"><div class="row between"><div><div class="muted">Nilai dokumen sementara</div><div class="risk" id="docTotal">${fmtScore(score(v, 'review'))} / ${maxTotal()}</div></div><div id="docRisk">${badgeRisk((score(v, 'review') / maxTotal()) * 100)}</div></div><div class="row" style="margin-top:16px"><button class="btn btn-filled"  data-click="saveReview">Simpan Verifikasi</button><button class="btn btn-accent" data-click="submitReview">Kirim ke Validasi Lapangan →</button><button class="btn btn-tonal" data-click="returnCorrection">Minta Perbaikan</button></div></div>`
  }`;
  if (v) {
    document.querySelectorAll('[data-review]').forEach(
      s =>
        (s.onchange = () => {
          let q = questions.find(q => q.id === s.dataset.review);
          document.getElementById('val_' + q.id).textContent = fmtScore(Number(s.value) * q.max);
          let total = [...document.querySelectorAll('[data-review]')].reduce(
            (a, x) => a + Number(x.value) * questions.find(q => q.id === x.dataset.review).max,
            0
          );
          document.getElementById('docTotal').textContent = fmtScore(total) + ' / ' + maxTotal();
          document.getElementById('docRisk').innerHTML = badgeRisk((total / maxTotal()) * 100);
        })
    );
  }
}
function validationPage(el) {
  let v = autoPick(STATUS.awaitingValidation);
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Langkah 4 dari 5</div><h1>Validasi Dokumen & Lapangan</h1><p>Validasi dilakukan Unit Keselamatan atau Ahli Keselamatan Daerah sesuai penetapan Unit Keselamatan.</p></div></div>${picker(STATUS.awaitingValidation)}${
    !v
      ? '<div class="panel empty">Pilih vendor untuk validasi.</div>'
      : `<div class="panel"><div class="row between"><div><h2>${esc(v.name)}</h2><p class="muted small">${esc(v.scope)}</p></div>${statusTag(v.status)}</div><div class="formgrid">${field('Tanggal validasi lapangan', 'fieldDate', v.fieldDate, false, 'date')}${field('Validator / Ahli Keselamatan Daerah', 'validator', v.validator || '')}${field('Lokasi validasi', 'fieldLocation', v.fieldLocation || '')}${field('Hasil tinjauan', 'fieldResult', v.fieldResult || 'Belum dilakukan', false, 'select', ['Belum dilakukan', 'Sesuai', 'Sesuai dengan catatan', 'Tidak sesuai'])}</div><div class="role-note">Setiap akun validator dapat menyimpan rekam validasinya sendiri. Lebih dari satu validator dapat memvalidasi pengajuan yang sama.</div><div class="panel" style="margin-top:14px"><h2>Hasil verifikasi dokumen</h2><p class="muted small">Ringkasan seluruh verifikator. Nilai dokumen per kriteria adalah rata-rata skor yang sudah disimpan; catatan tiap verifikator ditampilkan agar dapat ditinjau validator.</p>${reviewerSummary(v, 'reviewByUser')}</div><div class="panel" style="margin-top:14px"><h2>Rekap penilaian seluruh validator</h2><p class="muted small">Nilai akhir per kriteria dihitung dari rata-rata skor semua validator yang sudah menyimpan penilaian.</p>${reviewerSummary(v, 'validationByUser')}</div><div class="note small">Masukkan nilai matriks berdasarkan bukti yang telah dikonfirmasi saat validasi lapangan. Nilai lapangan adalah nilai akhir penetapan kategori RCHSEMS.</div>${groups
          .map(
            g =>
              `<div style="margin-top:20px"><h2>${esc(g[0])}</h2><div class="tablewrap"><table><thead><tr><th>Pertanyaan</th><th>Bobot</th><th>Rata-rata verifikasi dokumen</th><th>Detail skor verifikator</th><th>Matriks lapangan</th><th>Nilai lapangan</th><th>Catatan lapangan</th></tr></thead><tbody>${questions
                .filter(q => q.group === g[0])
                .map(
                  q =>
                    `<tr><td>${esc(q.id)}. ${esc(q.text)}</td><td>${q.max}</td><td><b>${fmtScore(averageMatrix(v, 'review', q.id) * q.max)}</b><br><small>${fmtScore(averageMatrix(v, 'review', q.id))} / 1</small></td><td><small>${reviewerCriterionDetails(v, q.id, 'reviewByUser')}</small></td><td><select data-fieldscore="${q.id}">${[0, 0.25, 0.5, 0.75, 1].map(n => `<option value="${n}" ${Number(v.validationByUser?.[session?.username]?.scores?.[q.id]?.score ?? averageMatrix(v, 'validation', q.id) ?? averageMatrix(v, 'review', q.id)) === n ? 'selected' : ''}>${n.toLocaleString('id-ID')}</option>`).join('')}</select></td><td><b id="fv_${q.id}">${fmtScore(Number(v.validationByUser?.[session?.username]?.scores?.[q.id]?.score ?? v.validation[q.id]?.score ?? v.review[q.id]?.score ?? 0) * q.max)}</b></td><td><input data-fieldcomment="${q.id}" value="${esc(v.validationByUser?.[session?.username]?.scores?.[q.id]?.comment ?? v.validation[q.id]?.comment ?? '')}" placeholder="Catatan validasi"></td></tr>`
                )
                .join('')}</tbody></table></div></div>`
          )
          .join(
            ''
          )}<div class="panel" style="margin-top:18px"><div class="row between"><div><div class="muted">Rata-rata nilai lapangan</div><div class="risk" id="fieldTotal">${fmtScore(score(v, 'validation'))} / ${maxTotal()}</div></div><div id="fieldRisk">${badgeRisk((score(v, 'validation') / maxTotal()) * 100)}</div></div><div class="row" style="margin-top:16px"><button class="btn btn-filled"  data-click="saveValidation">Simpan Validasi</button><button class="btn btn-accent" data-click="finalizeValidation">Tetapkan Hasil →</button></div></div>`
  }`;
  if (v) {
    document.querySelectorAll('[data-fieldscore]').forEach(
      s =>
        (s.onchange = () => {
          let q = questions.find(q => q.id === s.dataset.fieldscore);
          document.getElementById('fv_' + q.id).textContent = fmtScore(Number(s.value) * q.max);
          let total = [...document.querySelectorAll('[data-fieldscore]')].reduce(
            (a, x) => a + Number(x.value) * questions.find(q => q.id === x.dataset.fieldscore).max,
            0
          );
          document.getElementById('fieldTotal').textContent = fmtScore(total) + ' / ' + maxTotal();
          document.getElementById('fieldRisk').innerHTML = badgeRisk((total / maxTotal()) * 100);
        })
    );
  }
}

function accountsPage(el) {
  if (!rolesOf(session?.role).includes('admin')) {
    el.innerHTML = '<div class="panel empty">Menu ini hanya untuk Admin.</div>';
    return;
  }
  const internal = accounts.filter(a =>
    rolesOf(a.role).some(r => ['verifikator', 'validator', 'pengadaan', 'admin'].includes(r))
  );
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Administrasi sistem</div><h1>Kelola Akun Internal</h1><p>Admin dapat mendaftarkan akun Verifikator, Validator, dan Bagian Pengadaan. Satu akun dapat memiliki lebih dari satu peran internal.</p></div><button class="btn btn-filled" type="button" data-click="createAccountDialog">${ICON_ADD}Buat Akun Internal</button></div>
 
 <div class="panel"><div class="row between"><h2>Daftar akun internal</h2><span class="tag tag-primary">${internal.length} akun</span></div>${internal.length ? `<div class="tablewrap"><table><thead><tr><th>Nama</th><th>Email / username</th><th>Peran</th><th>Aksi</th></tr></thead><tbody>${internal.map(a => `<tr><td>${esc(a.name || '')}</td><td>${esc(a.username)}</td><td>${esc(roleLabel(a.role))}${a.mfa ? ' <span class="tag tag-success">2FA</span>' : ''}</td><td><button class="btn btn-tonal" type="button" data-click="resetInternalPassword" data-args='["${encodeURIComponent(a.username).replaceAll("'", '%27')}"]'>Atur ulang password</button>${a.mfa ? ` <button class="btn btn-tonal" type="button" data-click="resetAccountMfa" data-args='[${a.id}]'>Reset 2FA</button>` : ''} ${!rolesOf(a.role).includes('admin') && a.username !== session.username ? `<button class="btn btn-tonal" type="button" data-click="deleteInternalAccount" data-args='["${encodeURIComponent(a.username).replaceAll("'", '%27')}"]'>Hapus</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Belum ada akun internal tambahan.</div>'}</div>
 <p class="note note-info mt-4"><span>Akses diperiksa oleh server. Penghapusan menonaktifkan akun dan mempertahankan riwayat penilaian.</span></p>`;
}

function riskPage(el) {
  let vs = db.vendors;
  el.innerHTML = `<div class="heading"><div><div class="eyebrow">Langkah 5 dari 5</div><h1>Hasil & Lingkup Risiko</h1><p>Nilai akhir memakai hasil validasi lapangan. Lingkup sertifikat dibatasi pada perusahaan/cabang dan lingkup pekerjaan yang divalidasi.</p></div><button class="btn btn-tonal" data-click="exportData">Ekspor Excel</button></div><div class="panel"><h2>Aturan kategori sesuai formulir verifikasi</h2><div class="cards" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div><span class="tag tag-warning">Risiko Tinggi</span><div class="metric">≥ 70</div><small class="muted small">Nilai PK</small></div><div><span class="tag tag-success">Risiko Menengah</span><div class="metric">50–&lt;70</div><small class="muted small">Nilai PK</small></div><div><span class="tag tag-success">Risiko Rendah</span><div class="metric">35–&lt;50</div><small class="muted small">Nilai PK</small></div><div><span class="tag tag-error">Tidak Lulus</span><div class="metric">&lt; 35</div><small class="muted small">Tidak memenuhi ambang</small></div></div><p class="muted small">Nilai persentase = jumlah (matriks lapangan × nilai maksimum) ÷ ${maxTotal()} × 100. Ambang di atas berasal dari Form Verifikasi yang diunggah; konfigurasi final perlu disahkan pemilik prosedur.</p></div><div class="panel" style="margin-top:16px"><h2>Rekap hasil penilaian</h2>${vs.length ? vendorTable(vs) : '<div class="empty">Belum ada hasil penilaian.</div>'}</div><div class="panel" style="margin-top:16px"><h2>Sertifikat rekanan — pratinjau</h2><div class="field" style="max-width:550px"><select id="certVendor"><option value="">Pilih...</option>${vs
    .filter(v => v.status === STATUS.validated)
    .map(v => `<option value="${v.id}">${esc(v.name)} — ${esc(v.id)}</option>`)
    .join(
      ''
    )}</select><label for="certVendor">Pilih vendor tervalidasi</label></div><button class="btn btn-filled"  style="margin-top:12px" data-click="previewCert">Buat Pratinjau Sertifikat</button><div id="certPreview"></div><p class="muted small">Penerbitan resmi sertifikat tetap dilakukan Vendor Management sesuai kewenangan dan persetujuan internal.</p></div>`;
}
// Skor sertifikat: bilangan bulat ditampilkan tanpa desimal; bila ada pecahan (rata-rata beberapa penilai), maksimal 2 angka di belakang koma.
// Dipotong (bukan dibulatkan) agar 69,996 tidak tampil "70" sementara kategorinya masih di bawah ambang 70.
function fmtScore(n) {
  const truncated = Math.floor(n * 100 + 1e-6) / 100;
  return truncated.toLocaleString(window.I18N ? I18N.locale() : 'id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
function fmtDate(iso) {
  const d = iso ? new Date(iso + 'T00:00:00') : null;
  if (!d || isNaN(d)) return iso || '-';
  return d.toLocaleDateString(window.I18N ? I18N.locale() : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function previewCert() {
  let v = db.vendors.find(x => x.id === document.getElementById('certVendor').value),
    out = document.getElementById('certPreview');
  if (!v) {
    out.innerHTML = '<p class="muted">Pilih vendor terlebih dahulu.</p>';
    return;
  }
  let n = (score(v, 'validation') / maxTotal()) * 100,
    status = n < 35 ? 'TIDAK LULUS' : n >= 70 ? 'RISIKO TINGGI' : n >= 50 ? 'RISIKO MENENGAH' : 'RISIKO RENDAH',
    validDate = fmtDate(v.fieldDate);
  let logo = `<img class="cert-logo" src="data:image/png;base64,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" alt="Logo KAI">`;
  out.innerHTML = `<div class="certificate" id="certificateOnly"><div class="cert-topline"></div>${logo}<p class="cert-org">PT Kereta Api Indonesia (Persero)</p><h1 class="cert-title">SERTIFIKAT HASIL PENILAIAN</h1><p class="cert-subtitle">CSMS · Railway Contractor HSE Management System (RCHSEMS)</p><div class="cert-rule"></div><p class="cert-award">Dengan ini menyatakan bahwa rekanan berikut telah mengikuti proses penilaian CSMS (RCHSEMS)</p><h2 class="cert-vendor">${esc(v.name)}</h2><p class="cert-scope">Lingkup pekerjaan: <strong>${esc(v.scope)}</strong></p><div class="cert-score">${fmtScore(n)} <span style="font-size:14px;font-weight:600">/ 100</span></div><span class="cert-status" style="background:${n < 35 ? '#ffebe9' : n >= 70 ? '#fff1df' : '#e4f7ee'};color:${n < 35 ? '#b42318' : n >= 70 ? '#a65300' : '#08764c'}">${status}</span><div class="cert-meta"><span>Nomor registrasi: <b class="code">${esc(v.id)}</b></span><span>Tanggal validasi: <b>${esc(validDate)}</b></span><span>Status: <b>${esc(v.status || STATUS.validated)}</b></span></div><p class="cert-validity">Masa berlaku indikatif 2 (dua) tahun sejak tanggal validasi lapangan, sesuai prosedur RCHSEMS dan ketentuan penerbitan sertifikat yang berlaku.</p><div class="cert-signatures"><div class="cert-sign"><strong>Unit Keselamatan</strong><span>Validasi penilaian</span></div><div class="cert-sign"><strong>Vendor Management</strong><span>Penerbitan sesuai kewenangan</span></div></div></div><div class="cert-actions"><button class="btn btn-filled"  data-click="printPage">Cetak / Simpan PDF</button><span class="muted small" style="align-self:center">Saat mencetak, hanya sertifikat yang akan dicetak.</span></div>`;
}

// Server-backed persistence. No credentials or business data are stored in localStorage.
let busy = false;
async function api(path, method = 'GET', data = null) {
  const headers = {
    Accept: 'application/json',
    'X-Lang': window.I18N ? I18N.lang : 'id',
    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
  };
  if (data && !(data instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch('/api' + path, {
    method,
    headers,
    credentials: 'same-origin',
    body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
  });
  const csrf = res.headers.get('X-CSRF-TOKEN');
  if (csrf) document.querySelector('meta[name="csrf-token"]').content = csrf;
  let result;
  try {
    result = await res.json();
  } catch {
    result = { message: 'Respons server tidak valid.' };
  }
  if (!res.ok) {
    if (res.status === 401) {
      session = null;
      loginReady();
    }
    if (res.status === 403 && result.code === 'mfa_setup_required' && session) mfaDialog(true);
    if (res.status === 419) result.message = 'Sesi kedaluwarsa. Muat ulang halaman dan login kembali.';
    const error = new Error(
      Object.values(result.errors || {})
        .flat()
        .join('\n') ||
        result.message ||
        'Permintaan gagal.'
    );
    error.status = res.status;
    error.data = result;
    throw error;
  }
  return result;
}
function setBusy(on) {
  let bar = document.getElementById('topProgress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'topProgress';
    bar.className = 'top-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Memproses');
    bar.innerHTML = '<div></div>';
    document.body.appendChild(bar);
  }
  document.body.classList.toggle('is-busy', on);
}
async function action(fn) {
  if (busy) return;
  busy = true;
  setBusy(true);
  try {
    await fn();
  } catch (e) {
    m3Snackbar(e.message, { type: 'error' });
  } finally {
    busy = false;
    setBusy(false);
  }
}
async function refresh() {
  const state = await api('/state');
  STATUS = state.statuses;
  setQuestions(state.questions);
  session = state.session;
  db = { vendors: state.vendors };
  accounts = state.accounts;
}
function replaceVendor(v) {
  const i = db.vendors.findIndex(x => x.id === v.id);
  if (i < 0) db.vendors.push(v);
  else db.vendors[i] = v;
  currentId = v.id;
}
async function confirmLogout() {
  if (
    !(await m3Confirm(
      'Keluar dari aplikasi?',
      'Anda perlu masuk kembali untuk melanjutkan. Jawaban pra-kualifikasi yang sudah diubah akan disimpan lebih dulu.',
      'Keluar'
    ))
  )
    return;
  return logout();
}
async function logout() {
  await pqFlush();
  await action(async () => {
    await api('/logout', 'POST');
    location.reload();
  });
}
let resetToken = '',
  resetEmail = '';
async function enterApp() {
  await refresh();
  for (const id of ['authPass', 'authCode', 'authNewPass']) document.getElementById(id).value = '';
  page = defaultPage();
  loginReady();
  render();
}
async function submitAuth() {
  if (authSubmitting) return;
  setAuthSubmitting(true);
  const val = id => document.getElementById(id).value;
  try {
    if (authMode === 'mfa') {
      await api('/login/mfa', 'POST', { code: val('authCode').trim() });
      await enterApp();
    } else if (authMode === 'forgot') {
      await api('/password/forgot', 'POST', { username: val('authUser').trim().toLowerCase() });
      m3Snackbar('Jika email terdaftar, tautan atur ulang password telah dikirim.');
      showAuth('login');
    } else if (authMode === 'reset') {
      await api('/password/reset', 'POST', { username: resetEmail, token: resetToken, password: val('authNewPass') });
      resetToken = '';
      m3Snackbar('Password berhasil diatur ulang. Silakan masuk.');
      showAuth('login');
    } else {
      const res = await api(authMode === 'register' ? '/register' : '/login', 'POST', {
        username: val('authUser').trim().toLowerCase(),
        password: val('authPass'),
        name: val('authName').trim(),
      });
      if (res && res.mfa) {
        document.getElementById('authPass').value = '';
        showAuth('mfa');
      } else await enterApp();
    }
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
  } finally {
    setAuthSubmitting(false);
  }
}
// Login runs from the button click and from Enter inside the email or password field.
document.getElementById('authForm').addEventListener('submit', e => {
  e.preventDefault();
  submitAuth();
});
document.getElementById('navMore').addEventListener('click', () => openMoreSheet());
window.addEventListener('resize', () => {
  if (session) setupMobileNav();
});
function fieldError(input, message) {
  const box = input.closest('.field');
  if (!box) return;
  box.classList.toggle('field-error', !!message);
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  let hint = box.querySelector('.field-error-text');
  if (message) {
    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'field-hint field-error-text';
      hint.id = (input.id || 'f') + '_err';
      box.appendChild(hint);
    }
    hint.textContent = message;
    input.setAttribute('aria-describedby', hint.id);
  } else if (hint) {
    hint.remove();
    input.removeAttribute('aria-describedby');
  }
}
function validateForm(form, quiet = false) {
  let first = null;
  form.querySelectorAll('input,select,textarea').forEach(el => {
    const empty = el.required && !String(el.value).trim();
    const bad = !empty && el.type === 'email' && el.value && !el.checkValidity();
    const msg = empty ? 'Wajib diisi.' : bad ? 'Format email tidak valid.' : '';
    fieldError(el, msg);
    if (msg && !first) first = el;
    if (!el.dataset.v) {
      el.dataset.v = '1';
      el.addEventListener('input', () => fieldError(el, ''));
    }
  });
  if (first) {
    first.focus();
    if (!quiet) m3Snackbar('Periksa kolom yang ditandai.', { type: 'error' });
    return false;
  }
  return true;
}
async function saveProfile(e) {
  e.preventDefault();
  if (!validateForm(e.target)) return;
  if (
    !(await m3Confirm(
      'Simpan data pendaftaran?',
      'Data perusahaan disimpan ke server dan Anda lanjut ke pengisian pra-kualifikasi.',
      'Simpan'
    ))
  )
    return;
  const data = Object.fromEntries(new FormData(e.target));
  await action(async () => {
    const v = await api(currentId ? '/vendors/' + currentId : '/vendors', currentId ? 'PUT' : 'POST', data);
    replaceVendor(v);
    go('questionnaire');
  });
}
async function submitQuestionnaire() {
  clearTimeout(pqTimer);
  const missing = pqMissingIds();
  if (missing.length) {
    pqShowMissing(missing);
    return;
  }
  if (
    !(await m3Confirm(
      'Kirim pra-kualifikasi?',
      'Setelah dikirim, jawaban dan lampiran dikunci dan diproses oleh verifikator. Pastikan semuanya sudah benar.',
      'Kirim'
    ))
  )
    return;
  await action(async () => {
    try {
      await pqSaveNow();
      await uploadStagedEvidence();
      pqRenderFiles();
      const v = await api('/vendors/' + currentId + '/submit', 'POST', {});
      replaceVendor(v);
      go(canAccess('verification') ? 'verification' : 'vendors');
      m3Snackbar('Pra-kualifikasi tersimpan dan masuk antrean verifikasi.');
    } catch (e) {
      if (e.status === 422 && e.data && e.data.missing) {
        pqShowMissing(e.data.missing);
        return;
      }
      throw e;
    }
  });
}
// Evidence files are staged in the browser only. They reach the server when the
// vendor presses "Simpan Draft" or "Kirim untuk Verifikasi", never at selection time.
function stagedFiles(qid) {
  const v = vendor();
  return (v && pendingFiles[v.id] && pendingFiles[v.id][qid]) || [];
}
function stageEvidence(inp) {
  const v = vendor();
  if (!v) return;
  const qid = inp.dataset.doc;
  (pendingFiles[v.id] ??= {})[qid] = [...inp.files];
  pqRenderFiles();
}
async function uploadStagedEvidence() {
  const v = vendor();
  if (!v || !pendingFiles[v.id]) return;
  const store = pendingFiles[v.id];
  for (const qid of Object.keys(store)) {
    while (store[qid] && store[qid].length) {
      const file = store[qid][0];
      if (file.size > 15 * 1024 * 1024) throw new Error(file.name + ': maksimal 15 MB.');
      const fd = new FormData();
      fd.append('question_id', qid);
      fd.append('file', file);
      const stored = await api('/vendors/' + v.id + '/evidence', 'POST', fd);
      v.answers[qid] ??= { answer: '', note: '', files: [] };
      v.answers[qid].files ??= [];
      v.answers[qid].files.push(stored);
      store[qid].shift();
    }
    const inp = document.querySelector(`[data-doc="${qid}"]`);
    if (inp) inp.value = '';
  }
}
async function pqSwitchVendor(id) {
  await pqFlush();
  currentId = id;
  render();
}
function downloadEvidence(vendorId, qid, fileId) {
  if (fileId) window.open('/api/evidence/' + encodeURIComponent(fileId), '_blank', 'noopener');
}
async function deleteVendor(id) {
  const v = db.vendors.find(x => x.id === id);
  if (!v) return;
  const ok = await m3Confirm(
    'Hapus data vendor?',
    {
      bodyHtml: `Data vendor <b>${esc(id)}</b> (${esc(v.name || 'tanpa nama')}) beserta seluruh lampiran, jawaban, dan hasil penilaian akan dihapus permanen dari server. Akun login pemilik vendor tidak ikut terhapus.`,
    },
    'Hapus vendor',
    true
  );
  if (!ok) return;
  const typed = await m3Dialog({
    title: 'Konfirmasi penghapusan',
    body: 'Ketik ID vendor di bawah untuk melanjutkan. Tindakan ini tidak dapat dibatalkan.',
    field: { label: 'ID vendor (' + id + ')', value: '', required: true },
    actions: [
      { label: 'Batal', value: null, variant: 'text' },
      {
        label: 'Hapus permanen',
        value: 'ok',
        variant: 'danger',
        captureInput: true,
        requiresInput: 'Ketik ID vendor terlebih dahulu.',
      },
    ],
  });
  if (!typed || typed.value !== 'ok') return;
  if (typed.input !== id) {
    m3Snackbar('ID vendor tidak cocok. Penghapusan dibatalkan.', { type: 'error' });
    return;
  }
  await action(async () => {
    await api('/vendors/' + encodeURIComponent(id), 'DELETE');
    await refresh();
    if (currentId === id) currentId = null;
    render();
    m3Snackbar('Data vendor ' + id + ' beserta seluruh lampirannya telah dihapus.');
  });
}
function assessmentPayload(stage, act) {
  const review = stage === 'review',
    attr = review ? 'data-review' : 'data-fieldscore',
    comment = review ? 'data-comment' : 'data-fieldcomment';
  const data = {
    action: act,
    scores: [...document.querySelectorAll('[' + attr + ']')].map(el => ({
      question_id: el.getAttribute(attr),
      score: Number(el.value),
      comment: document.querySelector(`[${comment}="${el.getAttribute(attr)}"]`).value,
    })),
  };
  for (const f of review ? ['docDate', 'evaluator'] : ['fieldDate', 'validator', 'fieldLocation', 'fieldResult'])
    data[f] = document.querySelector(`[name="${f}"]`)?.value || null;
  return data;
}
async function saveAssessment(stage, act) {
  await action(async () => {
    const v = await api('/vendors/' + currentId + '/assessments/' + stage, 'POST', assessmentPayload(stage, act));
    replaceVendor(v);
    if (act === 'advance') go(canAccess('validation') ? 'validation' : 'vendors');
    else if (act === 'finalize') go('risk');
    else render();
    m3Snackbar('Data berhasil disimpan di server.');
  });
}
async function saveReview() {
  if (
    !(await m3Confirm(
      'Simpan penilaian verifikasi?',
      'Nilai dan catatan Anda disimpan ke server. Anda masih dapat memperbaruinya nanti.',
      'Simpan'
    ))
  )
    return;
  return saveAssessment('review', 'save');
}
async function submitReview() {
  if (
    !(await m3Confirm(
      'Teruskan ke validasi lapangan?',
      'Vendor akan dipindahkan ke tahap validasi lapangan dan tidak dapat dikembalikan ke tahap verifikasi. Pastikan seluruh verifikator sudah menyimpan nilainya.',
      'Teruskan'
    ))
  )
    return;
  return saveAssessment('review', 'advance');
}
async function returnCorrection() {
  if (
    !(await m3Confirm(
      'Kembalikan ke vendor?',
      'Vendor harus memperbaiki jawaban dan mengirim ulang. Putaran penilaian saat ini diarsipkan dan dimulai dari awal saat vendor mengirim kembali.',
      'Kembalikan',
      true
    ))
  )
    return;
  return saveAssessment('review', 'return');
}
async function saveValidation() {
  if (
    !(await m3Confirm(
      'Simpan penilaian validasi?',
      'Nilai dan hasil tinjauan lapangan Anda disimpan ke server. Anda masih dapat memperbaruinya sebelum hasil ditetapkan.',
      'Simpan'
    ))
  )
    return;
  return saveAssessment('validation', 'save');
}
function finalizeValidation() {
  m3Confirm(
    'Tetapkan hasil akhir?',
    'Penilaian lapangan akan dikunci dan tidak dapat diubah. Pastikan seluruh validator telah menyimpan nilainya.',
    'Tetapkan hasil'
  ).then(ok => {
    if (ok) saveAssessment('validation', 'finalize');
  });
}
function createAccountDialog() {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  const roles = [
    ['verifikator', 'Verifikator'],
    ['validator', 'Validator'],
    ['pengadaan', 'Bagian Pengadaan'],
    ['admin', 'Admin'],
  ];
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'accTitle');
  backdrop.innerHTML = `<form class="dialog dialog-form" novalidate><h2 id="accTitle">Buat akun internal</h2>${field('Nama lengkap', 'name', '', true, 'text')}${field('Email / username', 'username', '', true, 'email')}${field('Password sementara (min. 12 karakter)', 'password', '', true, 'password')}<div class="field field-area"><label class="field-label">Peran internal</label><div class="role-options" id="accRoles">${roles.map(([v, l]) => `<label class="role-option"><input type="checkbox" name="internalRole" value="${v}"> <span>${l}</span></label>`).join('')}</div><p class="field-hint">Jangan pilih Vendor untuk akun internal. Verifikator dan Validator boleh dipilih bersamaan.</p></div><div class="dialog-actions"><button type="button" class="btn btn-text" data-cancel>Batal</button><button type="submit" class="btn btn-filled">Buat akun</button></div></form>`;
  const form = backdrop.querySelector('form');
  function close() {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
  document.addEventListener('keydown', onKey);
  backdrop.querySelector('[data-cancel]').onclick = close;
  form
    .querySelectorAll('[name=internalRole]')
    .forEach(i => i.addEventListener('change', () => fieldError(form.querySelector('[name=internalRole]'), '')));
  form.onsubmit = async e => {
    e.preventDefault();
    let ok = validateForm(form, true);
    const pw = form.querySelector('[name=password]');
    if (pw.value && pw.value.length < 12) {
      fieldError(pw, 'Minimal 12 karakter.');
      if (ok) pw.focus();
      ok = false;
    }
    const picked = [...form.querySelectorAll('[name=internalRole]:checked')].map(i => i.value);
    const firstRole = form.querySelector('[name=internalRole]');
    if (!picked.length) {
      fieldError(firstRole, 'Pilih minimal satu peran.');
      ok = false;
    }
    if (!ok) return;
    const fd = new FormData(form);
    await action(async () => {
      await api('/accounts', 'POST', {
        username: String(fd.get('username')).trim().toLowerCase(),
        name: fd.get('name'),
        password: fd.get('password'),
        role: picked,
      });
      close();
      await refresh();
      render();
      m3Snackbar('Akun internal berhasil dibuat.');
    });
  };
  document.body.appendChild(backdrop);
  form.querySelector('[name=name]').focus();
}
async function deleteInternalAccount(encoded) {
  const email = decodeURIComponent(encoded),
    a = accounts.find(x => x.username === email);
  if (!a) return;
  const ok = await m3Confirm(
    'Nonaktifkan akun?',
    {
      bodyHtml: `Akun <b>${esc(email)}</b> tidak lagi dapat masuk. Riwayat penilaian yang sudah tersimpan tetap terjaga.`,
    },
    'Nonaktifkan'
  );
  if (!ok) return;
  await action(async () => {
    await api('/accounts/' + a.id, 'DELETE');
    await refresh();
    render();
    m3Snackbar('Akun ' + email + ' dinonaktifkan.');
  });
}
async function exportData() {
  if (
    !(await m3Confirm(
      'Ekspor data?',
      'Data vendor yang dapat Anda akses akan diunduh sebagai berkas Excel (.xlsx). Berkas berisi informasi perusahaan, simpan dengan aman.',
      'Unduh'
    ))
  )
    return;
  window.location.href = '/api/export?lang=' + (window.I18N ? I18N.lang : 'id');
}
// Refresh persisted state when navigating. Renderers remain identical to the mockup.
function go(p) {
  if (busy) return goNow(p);
  renderSkeleton();
  action(async () => {
    await pqFlush();
    await refresh();
    goNow(p);
  });
}
// Setelah halaman digambar: kunci formulir yang sudah tidak dapat diubah dan tampilkan catatan perbaikan.
function render() {
  renderPage();
  const v = vendor();
  if (v && page === 'questionnaire' && ![STATUS.awaitingFill, STATUS.needsRevision].includes(v.status)) {
    document.querySelectorAll('#qForm input,#qForm button').forEach(el => (el.disabled = true));
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent =
      'Pengajuan sedang diproses atau telah final. Formulir terkunci sampai dikembalikan untuk perbaikan.';
    document.getElementById('qForm').prepend(note);
  }
  if (v && page === 'questionnaire' && v.status === STATUS.needsRevision) {
    const box = document.createElement('div');
    box.className = 'panel';
    box.innerHTML =
      '<h2>Catatan perbaikan verifikator</h2>' +
      questions.map(q => `<p><b>${esc(q.id)}</b> ${reviewerCriterionDetails(v, q.id, 'reviewByUser')}</p>`).join('');
    document.getElementById('qForm').prepend(box);
  }
  if (
    v &&
    ((page === 'verification' && v.status !== STATUS.awaitingVerification) ||
      (page === 'validation' && v.status !== STATUS.awaitingValidation))
  ) {
    document
      .querySelectorAll(
        '#view [data-review],#view [data-comment],#view [data-fieldscore],#view [data-fieldcomment],#view input[name],#view select[name],#view button'
      )
      .forEach(el => (el.disabled = true));
  }
}
(async () => {
  renderSkeleton();
  try {
    await refresh();
    page = defaultPage();
    loginReady();
    render();
  } catch (e) {
    if (e.status !== 401) showBootError(e.message);
  }
})();
// Mask password entry rather than using a plain browser prompt.
function passwordDialog(title, withCurrent = false) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="pwdTitle"><h2 id="pwdTitle">${esc(title)}</h2>${withCurrent ? '<div class="field mt-4"><input id="pwdCurrent" type="password" placeholder=" " autocomplete="current-password"><label for="pwdCurrent">Password saat ini</label></div>' : ''}<div class="field mt-3"><input id="pwdNew" type="password" placeholder=" " autocomplete="new-password" minlength="12" maxlength="128"><label for="pwdNew">Password baru (minimal 12 karakter)</label></div><div class="dialog-actions"><button type="button" class="btn btn-text" data-cancel>Batal</button><button type="button" class="btn btn-filled" data-save>Simpan</button></div></div>`;
    function finish(v) {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      resolve(v);
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(null);
      }
    }
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) finish(null);
    });
    backdrop.querySelector('[data-cancel]').onclick = () => finish(null);
    backdrop.querySelector('[data-save]').onclick = () => {
      const pw = backdrop.querySelector('#pwdNew').value;
      const cur = backdrop.querySelector('#pwdCurrent')?.value || '';
      if (pw.length < 12) {
        m3Snackbar('Password baru minimal 12 karakter.', { type: 'error' });
        backdrop.querySelector('#pwdNew').focus();
        return;
      }
      finish({ password: pw, current_password: cur });
    };
    document.body.appendChild(backdrop);
    const first = backdrop.querySelector(withCurrent ? '#pwdCurrent' : '#pwdNew');
    if (first) first.focus();
  });
}
async function changePassword() {
  const data = await passwordDialog('Ganti password', true);
  if (!data) return;
  await action(async () => {
    await api('/password', 'PUT', data);
    m3Snackbar('Password berhasil diubah.');
  });
}
async function resetInternalPassword(encoded) {
  const email = decodeURIComponent(encoded),
    a = accounts.find(x => x.username === email);
  if (!a) return;
  const data = await passwordDialog('Atur ulang password: ' + email);
  if (!data) return;
  await action(async () => {
    await api('/accounts/' + a.id + '/password', 'PUT', data);
    m3Snackbar('Password diubah dan sesi akun tersebut dihentikan.');
    if (email === session.username) location.reload();
  });
}

// ===== Autentikasi dua langkah (TOTP), hanya untuk akun internal =====
function currentPasswordDialog(title, body, confirmLabel, danger = false) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'cpwdTitle');
    backdrop.innerHTML = `<form class="dialog dialog-form" novalidate><h2 id="cpwdTitle">${esc(title)}</h2><p>${esc(body)}</p><div class="field"><input id="cpwd" type="password" autocomplete="current-password" required placeholder=" "><label for="cpwd">Password saat ini</label></div><div class="dialog-actions"><button type="button" class="btn btn-text" data-cancel>Batal</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-filled'}">${esc(confirmLabel)}</button></div></form>`;
    const form = backdrop.querySelector('form');
    const finish = v => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(null);
      }
    };
    document.addEventListener('keydown', onKey);
    backdrop.querySelector('[data-cancel]').onclick = () => finish(null);
    form.onsubmit = e => {
      e.preventDefault();
      const i = form.querySelector('#cpwd');
      if (!i.value) {
        fieldError(i, 'Wajib diisi.');
        i.focus();
        return;
      }
      finish(i.value);
    };
    document.body.appendChild(backdrop);
    form.querySelector('#cpwd').focus();
  });
}
function mfaGroupKey(k) {
  return String(k)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}
function mfaDialog(forced = false) {
  if (document.querySelector('.mfa-dialog')) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  const box = document.createElement('div');
  box.className = 'dialog dialog-form mfa-dialog';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Autentikasi dua langkah');
  backdrop.appendChild(box);
  let secret = '',
    uri = '',
    codes = [];
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => {
    if (e.key === 'Escape' && !forced) {
      e.preventDefault();
      close();
    }
  };
  document.addEventListener('keydown', onKey);
  const H = {
    cancel: close,
    async start() {
      await action(async () => {
        const r = await api('/mfa/setup', 'POST', {});
        secret = r.secret;
        uri = r.uri;
        viewSetup();
      });
    },
    async confirm() {
      const i = box.querySelector('#mfaCode');
      if (!i.value.trim()) {
        fieldError(i, 'Wajib diisi.');
        i.focus();
        return;
      }
      await action(async () => {
        try {
          const r = await api('/mfa/confirm', 'POST', { code: i.value.trim() });
          codes = r.recovery_codes;
          await refresh();
          viewCodes();
        } catch (e) {
          fieldError(i, e.message);
          i.focus();
        }
      });
    },
    async copyKey() {
      await copyText(secret);
      m3Snackbar('Kunci disalin.');
    },
    async copyCodes() {
      await copyText(codes.join('\n'));
      m3Snackbar('Kode pemulihan disalin.');
    },
    download() {
      const blob = new Blob(
        ['CSMS - kode pemulihan\n' + (session?.username || '') + '\n\n' + codes.join('\n') + '\n'],
        { type: 'text/plain' }
      );
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'csms-kode-pemulihan.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    done() {
      close();
      render();
      m3Snackbar('Autentikasi dua langkah aktif.');
    },
    async regen() {
      const pw = await currentPasswordDialog(
        'Buat ulang kode pemulihan',
        'Kode pemulihan lama tidak berlaku lagi. Masukkan password Anda untuk melanjutkan.',
        'Buat ulang'
      );
      if (!pw) return;
      await action(async () => {
        const r = await api('/mfa/recovery', 'POST', { current_password: pw });
        codes = r.recovery_codes;
        viewCodes();
      });
    },
    async disable() {
      const pw = await currentPasswordDialog(
        'Nonaktifkan autentikasi dua langkah',
        'Akun Anda hanya dilindungi password setelah ini. Masukkan password Anda untuk melanjutkan.',
        'Nonaktifkan',
        true
      );
      if (!pw) return;
      await action(async () => {
        await api('/mfa/disable', 'POST', { current_password: pw });
        await refresh();
        close();
        render();
        m3Snackbar('Autentikasi dua langkah dinonaktifkan.');
      });
    },
  };
  const btn = (label, act, cls = 'btn-text') =>
    `<button type="button" class="btn ${cls}" data-act="${act}">${label}</button>`;
  function view(html) {
    box.innerHTML = html;
    box.querySelectorAll('[data-act]').forEach(b => (b.onclick = () => H[b.dataset.act] && H[b.dataset.act](b)));
    const f = box.querySelector('input,[data-act]');
    if (f) f.focus();
  }
  function viewIntro() {
    view(
      `<h2>Autentikasi dua langkah</h2><p>${forced ? 'Administrator mewajibkan autentikasi dua langkah untuk akun internal. Aktifkan sekarang untuk melanjutkan.' : 'Lindungi akun internal Anda dengan kode sekali pakai dari aplikasi autentikator (misalnya Google Authenticator atau Authy), selain password.'}</p><div class="dialog-actions">${forced ? '' : btn('Batal', 'cancel')}${btn('Mulai', 'start', 'btn-filled')}</div>`
    );
  }
  function viewSetup() {
    const qr = window.QR ? QR.svg(uri, { size: 176, label: 'Kode QR pengaturan autentikasi dua langkah' }) : null;
    view(
      `<h2>Siapkan aplikasi autentikator</h2><ol class="mfa-steps">${qr ? `<li>Buka aplikasi autentikator, pilih tambah akun, lalu pindai kode QR berikut:<div class="mfa-qr">${qr}</div></li>` : '<li>Buka aplikasi autentikator dan pilih tambah akun.</li>'}<li>${qr ? 'Atau masukkan kunci pengaturan berikut (atau' : 'Masukkan kunci pengaturan berikut (atau'} <a href="${esc(uri)}">buka langsung</a> di perangkat ini):<code class="mfa-secret">${esc(mfaGroupKey(secret))}</code>${btn('<span class="msym btn-icon" aria-hidden="true">content_copy</span>Salin kunci', 'copyKey', 'btn-text btn-sm')}</li><li>Masukkan 6 digit yang ditampilkan aplikasi:</li></ol><div class="field"><input id="mfaCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required placeholder=" "><label for="mfaCode">Kode 6 digit</label></div><div class="dialog-actions">${forced ? '' : btn('Batal', 'cancel')}${btn('Aktifkan', 'confirm', 'btn-filled')}</div>`
    );
    box.querySelector('#mfaCode').addEventListener('input', e => fieldError(e.target, ''));
  }
  function viewCodes() {
    view(
      `<h2>Simpan kode pemulihan</h2><p>Gunakan satu kode bila Anda kehilangan akses ke aplikasi autentikator. Setiap kode hanya berlaku sekali dan tidak akan ditampilkan lagi.</p><ul class="mfa-codes">${codes.map(c => `<li><code>${esc(c)}</code></li>`).join('')}</ul><div class="dialog-actions">${btn('Salin', 'copyCodes')}${btn('Unduh', 'download')}${btn('Saya sudah menyimpannya', 'done', 'btn-filled')}</div>`
    );
  }
  function viewManage() {
    view(
      `<h2>Autentikasi dua langkah</h2><p class="mfa-status"><span class="tag tag-success">Aktif</span> Login memerlukan kode dari aplikasi autentikator.</p><div class="dialog-actions">${btn('Buat ulang kode pemulihan', 'regen')}${session.mfaRequired ? '' : btn('Nonaktifkan', 'disable', 'btn-text mfa-danger')}${btn('Tutup', 'cancel', 'btn-filled')}</div>`
    );
  }
  document.body.appendChild(backdrop);
  if (session?.mfa) viewManage();
  else viewIntro();
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand('copy');
    } catch (err) {}
    t.remove();
  }
}
async function resetAccountMfa(id) {
  const a = accounts.find(x => String(x.id) === String(id));
  if (!a) return;
  if (
    !(await m3Confirm(
      'Atur ulang autentikasi dua langkah?',
      {
        bodyHtml: `Akun <b>${esc(a.username)}</b> akan masuk hanya dengan password sampai mengaktifkannya kembali. Gunakan ini bila perangkat pemilik akun hilang.`,
      },
      'Atur ulang',
      true
    ))
  )
    return;
  await action(async () => {
    await api('/accounts/' + encodeURIComponent(id) + '/mfa', 'DELETE');
    await refresh();
    render();
    m3Snackbar('Autentikasi dua langkah akun diatur ulang.');
  });
}
// Tautan atur ulang password dari email: /?reset=TOKEN&email=...
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('reset') && q.get('email')) {
    resetToken = q.get('reset');
    resetEmail = q.get('email').toLowerCase();
    history.replaceState({}, '', location.pathname);
    showAuth('reset');
  }
})();

// --- Pengikat event (CSP tanpa inline handler): data-click="namaFungsi" data-args='[...]' dan data-change="namaFungsi"
function newVendorPage() {
  currentId = null;
  go('register');
}
function reloadPage() {
  location.reload();
}
function printPage() {
  window.print();
}
function openVendorDefault(id) {
  return openVendor(id, roleTargetPage());
}
function clearVendorFilter() {
  vendorFilter = { q: '', status: '' };
  vendorsPage(document.getElementById('view'));
}
function pqPickFile(qid) {
  document.getElementById('pqFile_' + qid)?.click();
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-click]');
  if (!el) return;
  const fn = window[el.dataset.click];
  if (typeof fn !== 'function') return;
  if (el.tagName === 'A') e.preventDefault();
  let args;
  try {
    args = JSON.parse(el.dataset.args || '[]');
  } catch (err) {
    args = [];
  }
  fn.apply(el, args);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const fn = window[el.dataset.change];
  if (typeof fn === 'function') fn(el.value);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-click]')) {
    e.preventDefault();
    e.target.click();
  }
});
