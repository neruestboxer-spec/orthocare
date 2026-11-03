/**
 * CORE — state aplikasi, helper format, logika domain (HPP, slot, status),
 * dan komponen UI bersama (toast, bottom sheet, unggah berkas).
 */

// ============================================
// STATE
// ============================================
const S = {
  pasien: [], layanan: [], layananBahan: [], stok: [], mutasi: [], tenaga: [], jadwal: [], transaksi: [],
  pengaturan: {}, aset: {}, sistem: {},
  detail: {},          // cache detail pasien: { [ID_Pasien]: {rekam, berkas, t} }
  idx: {},
  loadedAt: 0
};
const TABLE_ID = {
  pasien: 'ID_Pasien', layanan: 'ID_Layanan', stok: 'ID_Bahan', mutasi: 'ID_Mutasi', tenaga: 'ID_Tenaga',
  jadwal: 'ID_Kunjungan', transaksi: 'ID_Transaksi'
};

function rebuildIndex() {
  Object.keys(TABLE_ID).forEach(t => {
    const m = {};
    (S[t] || []).forEach(r => { m[r[TABLE_ID[t]]] = r; });
    S.idx[t] = m;
  });
}

function loadBootstrap(data) {
  Object.assign(S, data);
  S.loadedAt = Date.now();
  rebuildIndex();
  saveSnapshot();
}

function saveSnapshot() {
  try {
    const snap = {};
    ['pasien', 'layanan', 'layananBahan', 'stok', 'mutasi', 'tenaga', 'jadwal', 'transaksi', 'pengaturan', 'aset', 'sistem'].forEach(k => { snap[k] = S[k]; });
    snap.loadedAt = S.loadedAt;
    localStorage.setItem('oc_snap', JSON.stringify(snap));
  } catch (e) { /* kuota penuh — abaikan */ }
}

function loadSnapshot() {
  try {
    const s = JSON.parse(localStorage.getItem('oc_snap') || 'null');
    if (!s) return false;
    Object.assign(S, s);
    rebuildIndex();
    return true;
  } catch (e) { return false; }
}

/** Gabungkan perubahan dari server: { tabel: [baris...] } → ganti per ID */
function applyDelta(delta) {
  if (!delta) return;
  const replace = delta._replace || [];
  Object.keys(delta).forEach(t => {
    if (t === '_replace' || !Array.isArray(delta[t])) return;
    if (t === 'rekam') {
      delta.rekam.forEach(r => {
        const d = S.detail[r.ID_Pasien];
        if (!d) return;
        const i = d.rekam.findIndex(x => x.ID_Rekam === r.ID_Rekam);
        if (i >= 0) d.rekam[i] = r; else d.rekam.unshift(r);
      });
      return;
    }
    if (replace.includes(t) || !TABLE_ID[t]) { S[t] = delta[t]; return; }
    const key = TABLE_ID[t];
    delta[t].forEach(row => {
      const i = S[t].findIndex(x => x[key] === row[key]);
      if (i >= 0) S[t][i] = Object.assign({}, S[t][i], row); else S[t].push(row);
    });
  });
  rebuildIndex();
  saveSnapshot();
}

// ============================================
// FORMAT & UTIL
// ============================================
const TZ = () => (S.sistem && S.sistem.timeZone) || (window.APP_CONFIG && APP_CONFIG.TIME_ZONE) || 'Asia/Jakarta';
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI3 = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

function esc(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = parseFloat(String(v || '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
}
function rp(n, opt = {}) {
  const v = Math.round(num(n));
  const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-' : (opt.plus && v > 0 ? '+' : '')) + 'Rp' + s;
}
function rpShort(n) {
  const v = num(n);
  if (Math.abs(v) >= 1e9) return 'Rp' + (v / 1e9).toFixed(1).replace('.', ',') + 'M';
  if (Math.abs(v) >= 1e6) return 'Rp' + (v / 1e6).toFixed(Math.abs(v) >= 1e7 ? 1 : 2).replace('.', ',') + 'jt';
  if (Math.abs(v) >= 1e3) return 'Rp' + Math.round(v / 1e3) + 'rb';
  return rp(v);
}
function pct(a, b, d = 1) { return b ? (a / b * 100).toFixed(d).replace('.', ',') + '%' : '0%'; }
function pad(n, w = 2) { return String(n).padStart(w, '0'); }

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function nowHM() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
}
function parseYmd(s) { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return { y, m, d }; }
function addDays(s, n) {
  const { y, m, d } = parseYmd(s);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function addMonths(s, n) {
  const { y, m } = parseYmd(s);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}
function dow(s) { const { y, m, d } = parseYmd(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function daysBetween(a, b) {
  const A = parseYmd(a), B = parseYmd(b);
  return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 864e5);
}
function monthKey(s) { return String(s).slice(0, 7); }
function fmtTgl(s, style = 'short') {
  if (!s) return '-';
  const { y, m, d } = parseYmd(s);
  if (!y) return s;
  if (style === 'long') return `${HARI[dow(s)]}, ${d} ${BULAN[m - 1]} ${y}`;
  if (style === 'full') return `${d} ${BULAN[m - 1]} ${y}`;
  if (style === 'dm') return `${d} ${BLN3[m - 1]}`;
  if (style === 'month') return `${BULAN[m - 1]} ${y}`;
  return `${d} ${BLN3[m - 1]} ${y}`;
}
function hmToMin(hm) { const [h, m] = String(hm || '0:0').split(':').map(Number); return h * 60 + (m || 0); }
function minToHm(t) { return pad(Math.floor(t / 60) % 24) + ':' + pad(t % 60); }
function umur(tgl) {
  if (!tgl) return '';
  const b = parseYmd(tgl), n = parseYmd(todayStr());
  let u = n.y - b.y;
  if (n.m < b.m || (n.m === b.m && n.d < b.d)) u--;
  return u;
}
function initials(nama) {
  const w = String(nama || '?').replace(/^(dr|drg|ns|tn|ny|nn|sdr|sdri|bpk|ibu|an)\.?\s+/i, '').split(/[\s,]+/).filter(x => /^[A-Za-z]/.test(x));
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
}
function avatarTone(id) {
  const t = ['', 'teal', 'indigo', 'solid', 'solid-teal'];
  let h = 0;
  String(id).split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) % 997; });
  return t[h % t.length];
}
function normWa(v) {
  let s = String(v || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (s.startsWith('0')) s = '62' + s.slice(1); else if (s.startsWith('8')) s = '62' + s;
  return /^62\d{8,13}$/.test(s) ? s : '';
}
function fmtWa(v) {
  const s = String(v || '');
  if (!s.startsWith('62')) return s;
  const r = s.slice(2);
  return '+62 ' + r.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
}
function waLink(no, text) { return `https://wa.me/${normWa(no) || no}?text=${encodeURIComponent(text || '')}`; }
function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function qs(o) { return Object.keys(o).filter(k => o[k] !== undefined && o[k] !== '').map(k => k + '=' + encodeURIComponent(o[k])).join('&'); }
function go(hash) { location.hash = hash; }
function sum(arr, f) { return arr.reduce((a, x) => a + num(typeof f === 'function' ? f(x) : x[f]), 0); }
function setting(k, def = '') { const v = S.pengaturan[k]; return v === undefined || v === '' ? def : v; }

// ============================================
// LOGIKA DOMAIN
// ============================================
const P = id => S.idx.pasien && S.idx.pasien[id];
const L = id => S.idx.layanan && S.idx.layanan[id];
const T = id => S.idx.tenaga && S.idx.tenaga[id];
const B = id => S.idx.stok && S.idx.stok[id];
const J = id => S.idx.jadwal && S.idx.jadwal[id];
const TX = id => S.idx.transaksi && S.idx.transaksi[id];

function namaPasien(p, withSapaan = true) { return p ? ((withSapaan && p.Sapaan ? p.Sapaan + ' ' : '') + p.Nama) : '(pasien terhapus)'; }
function tarif(l, jenis) { return l ? num(jenis === 'Visit' ? l.Tarif_Visit : l.Tarif_Klinik) : 0; }
function resepLayanan(id) { return S.layananBahan.filter(r => r.ID_Layanan === id); }

/** Rincian HPP live dari harga beli rata-rata saat ini */
function hppDetail(l, jenis) {
  if (!l) return { bahan: 0, jasa: 0, overhead: 0, transport: 0, total: 0, items: [] };
  const items = resepLayanan(l.ID_Layanan).map(r => {
    const s = B(r.ID_Bahan);
    return { id: r.ID_Bahan, nama: s ? s.Nama : r.ID_Bahan, qty: num(r.Qty_Pakai), satuan: s ? s.Satuan : '', biaya: s ? num(r.Qty_Pakai) * num(s.Harga_Beli_Rata2) : 0 };
  });
  const bahan = sum(items, 'biaya');
  const jasa = num(l.Biaya_Jasa_Medis), overhead = num(l.Biaya_Overhead);
  const transport = jenis === 'Visit' ? num(l.Biaya_Transport_Visit) : 0;
  return { bahan, jasa, overhead, transport, total: bahan + jasa + overhead + transport, items };
}
function marginInfo(l, jenis) {
  const t = tarif(l, jenis), h = hppDetail(l, jenis).total;
  const laba = t - h;
  const m = t ? laba / t * 100 : 0;
  return { tarif: t, hpp: h, laba, margin: m, rendah: t > 0 && m < num(setting('MARGIN_MIN', 30)) };
}
function lokasiOk(l, jenis) {
  if (!l) return false;
  return l.Tipe_Lokasi === 'Keduanya' || l.Tipe_Lokasi === jenis || (jenis === 'Visit' && l.Tipe_Lokasi === 'Visit');
}

/** Status tampilan jadwal */
function jadwalStatus(j) {
  if (j.Status === 'Selesai') return { label: 'Selesai', cls: 'b-green' };
  if (j.Status === 'Batal') return { label: 'Batal', cls: 'b-red' };
  if (j.Status === 'Tidak Hadir') return { label: 'Tidak Hadir', cls: 'b-amber' };
  const t = todayStr(), n = nowHM();
  if (j.Tanggal === t && n >= j.Jam_Mulai && n < j.Jam_Selesai) return { label: 'Sedang Berjalan', cls: 'b-solid-blue', live: true };
  if (j.Tanggal < t || (j.Tanggal === t && n >= j.Jam_Selesai)) return { label: 'Menunggu Selesai', cls: 'b-amber' };
  if (j.Reminder_Terkirim === 'Ya') return { label: 'Terkonfirmasi', cls: 'b-blue' };
  return { label: 'Terjadwal', cls: '' };
}
const isAktifJadwal = j => !['Batal', 'Tidak Hadir'].includes(j.Status);
function jadwalPada(tgl) {
  return S.jadwal.filter(j => j.Tanggal === tgl).sort((a, b) => a.Jam_Mulai.localeCompare(b.Jam_Mulai));
}
function trxKunjungan(id) { return S.transaksi.find(t => t.ID_Kunjungan === id && t.Tipe === 'Pemasukan'); }

/** Slot jam tersedia untuk tenaga di tanggal tertentu */
function hitungSlot(tgl, idTenaga, durasi, excludeId) {
  const buka = hmToMin(setting('JAM_BUKA', '08:30')), tutup = hmToMin(setting('JAM_TUTUP', '17:30'));
  const step = num(setting('SLOT_MENIT', 30)) || 30;
  const terisi = S.jadwal.filter(j => j.Tanggal === tgl && j.ID_Tenaga === idTenaga && j.ID_Kunjungan !== excludeId && isAktifJadwal(j));
  const slots = [];
  const isToday = tgl === todayStr(), now = hmToMin(nowHM());
  for (let t = buka; t + durasi <= tutup; t += step) {
    const bentrok = terisi.some(j => t < hmToMin(j.Jam_Selesai) && t + durasi > hmToMin(j.Jam_Mulai));
    slots.push({ jam: minToHm(t), taken: bentrok || (isToday && t < now), siang: t >= 12 * 60 });
  }
  return slots;
}

function fillTpl(tpl, data) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => data[k] !== undefined ? data[k] : m).replace(/\s+\{link\}/g, '').trim();
}
function pesanReminder(j) {
  const p = P(j.ID_Pasien) || {}, l = L(j.ID_Layanan) || {};
  return fillTpl(setting('WA_TPL_REMINDER'), {
    sapaan: p.Sapaan || 'Bapak/Ibu', nama: p.Nama, layanan: l.Nama_Layanan,
    lokasi: j.Jenis === 'Visit' ? 'rumah Anda (' + j.Alamat_Visit + ')' : setting('NAMA_KLINIK'),
    tanggal: fmtTgl(j.Tanggal, 'long'), jam: j.Jam_Mulai, klinik: setting('NAMA_KLINIK')
  });
}

/** Status stok */
function stokInfo(s) {
  const stok = num(s.Stok_Saat_Ini), min = num(s.Stok_Minimum);
  const sisaHari = s.Tgl_Kadaluarsa ? daysBetween(todayStr(), s.Tgl_Kadaluarsa) : 9999;
  const win = num(setting('EXPIRED_HARI', 30));
  return {
    stok, min, sisaHari,
    kritis: stok <= min,
    expired: sisaHari < 0,
    hampirExp: sisaHari >= 0 && sisaHari <= win,
    pctBar: Math.max(4, Math.min(100, min ? stok / (min * 2.5) * 100 : 100))
  };
}
function stokPerhatian() {
  return S.stok.filter(s => s.Aktif !== 'Tidak').map(s => ({ s, i: stokInfo(s) })).filter(x => x.i.kritis || x.i.hampirExp || x.i.expired);
}

// ============================================
// KOMPONEN UI
// ============================================
const ic = (name, cls = '') => `<span class="ms ${cls}">${name}</span>`;
const badge = (txt, cls = '', icon = '') => `<span class="badge ${cls}">${icon ? ic(icon) : ''}${esc(txt)}</span>`;
function avatar(nama, id, cls = '') { return `<div class="avatar ${avatarTone(id || nama)} ${cls}">${esc(initials(nama))}</div>`; }
function emptyState(icon, title, sub = '', action = '') {
  return `<div class="empty">${ic(icon)}<p class="strong" style="color:var(--text)">${esc(title)}</p>${sub ? `<p class="small mt-4">${esc(sub)}</p>` : ''}${action ? `<div class="mt-16">${action}</div>` : ''}</div>`;
}
function skeleton(n = 3) { return Array.from({ length: n }, () => '<div class="skel" style="height:96px;margin-bottom:12px"></div>').join(''); }

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = ic(type === 'err' ? 'error' : type === 'info' ? 'info' : 'check_circle', 'fill') + `<span>${esc(msg)}</span>`;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, type === 'err' ? 4200 : 2600);
  setTimeout(() => el.remove(), type === 'err' ? 4600 : 3000);
}

/** Bottom sheet. Mengembalikan objek {el, close}. Tombol di dalam sheet memakai data-sact. */
function openSheet({ title = '', body = '', foot = '', onAction = null, onClose = null, wide = false }) {
  const root = document.getElementById('sheet-root');
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  const sh = document.createElement('div');
  sh.className = 'sheet';
  sh.setAttribute('role', 'dialog');
  sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `<div class="handle"></div>${title ? `<div class="s-head"><h3>${title}</h3><button class="icon-btn sm" data-sact="close" aria-label="Tutup">${ic('close')}</button></div>` : ''}
    <div class="s-body">${body}</div>${foot ? `<div class="s-foot">${foot}</div>` : ''}`;
  root.appendChild(bd);
  root.appendChild(sh);
  requestAnimationFrame(() => { bd.classList.add('show'); sh.classList.add('show'); });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    bd.classList.remove('show'); sh.classList.remove('show');
    setTimeout(() => { bd.remove(); sh.remove(); }, 250);
    if (onClose) onClose();
  };
  bd.addEventListener('click', close);
  sh.addEventListener('click', e => {
    const b = e.target.closest('[data-sact]');
    if (!b) return;
    if (b.dataset.sact === 'close') { close(); return; }
    if (onAction) onAction(b.dataset.sact, b, { close, el: sh, e });
  });
  const first = sh.querySelector('input:not([type=hidden]):not([type=checkbox]),textarea');
  if (first && !('ontouchstart' in window)) setTimeout(() => first.focus(), 260);
  return { el: sh, close };
}

function confirmSheet({ title, message, okText = 'Ya, lanjutkan', danger = false, input = null }) {
  return new Promise(resolve => {
    let done = false;
    const s = openSheet({
      title: '',
      body: `<div class="result-icon ${danger ? 'err' : 'warn'}">${ic(danger ? 'warning' : 'help', 'fill')}</div>
        <h3 class="h3 center">${esc(title)}</h3><p class="muted center mt-8">${esc(message || '')}</p>
        ${input ? `<label class="field mt-16"><span>${esc(input.label)}</span><input id="cf-input" placeholder="${esc(input.placeholder || '')}"></label>` : ''}`,
      foot: `<button class="btn btn-outline" data-sact="close">Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-sact="ok">${esc(okText)}</button>`,
      onAction: (a, b, ctx) => {
        if (a === 'ok') { done = true; const v = input ? ctx.el.querySelector('#cf-input').value : true; ctx.close(); resolve(v === '' && input ? ' ' : v); }
      },
      onClose: () => { if (!done) resolve(false); }
    });
    return s;
  });
}

function resultSheet({ ok = true, title, message = '', actions = '' }) {
  return openSheet({
    body: `<div class="result-icon ${ok ? 'ok' : 'err'}">${ic(ok ? 'check' : 'close', 'fill')}</div>
      <h3 class="h3 center">${esc(title)}</h3>${message ? `<p class="muted center mt-8">${message}</p>` : ''}
      <div class="stack-sm mt-24">${actions}</div>`,
    onAction: (a, b, ctx) => { if (a === 'ok') ctx.close(); }
  });
}

/** Pemilih dari daftar (bottom sheet dengan pencarian) */
function pickSheet({ title, items, render, search = true, onPick }) {
  const draw = q => {
    const f = items.filter(it => !q || (it._q || '').toLowerCase().includes(q.toLowerCase())).slice(0, 80);
    return f.length ? f.map((it, i) => `<div class="pick" data-sact="pick" data-i="${items.indexOf(it)}">${render(it)}</div>`).join('') : emptyState('search_off', 'Tidak ditemukan');
  };
  const s = openSheet({
    title,
    body: `${search ? `<div class="search mb-12">${ic('search')}<input id="pk-q" placeholder="Cari..."></div>` : ''}<div class="pick-list" id="pk-list">${draw('')}</div>`,
    onAction: (a, b, ctx) => { if (a === 'pick') { ctx.close(); onPick(items[Number(b.dataset.i)]); } }
  });
  const q = s.el.querySelector('#pk-q');
  if (q) q.addEventListener('input', debounce(() => { s.el.querySelector('#pk-list').innerHTML = draw(q.value); }, 120));
  return s;
}

/** Jalankan aksi backend dengan state tombol loading + toast */
async function run(action, data, opt = {}) {
  const btn = opt.btn;
  let html;
  if (btn) { html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner sm"></span>${opt.loadingText ? esc(opt.loadingText) : ''}`; }
  const res = await API.call(action, data);
  if (btn) { btn.disabled = false; btn.innerHTML = html; }
  if (res.success) {
    if (res.delta) applyDelta(res.delta);
    if (!opt.silent && res.message) toast(res.message);
  } else if (!(opt.codes || []).includes(res.code) && res.code !== 'AUTH') {
    toast(res.message || 'Terjadi kesalahan.', 'err');
  }
  return res;
}

/** Baca berkas & kompres foto di sisi klien (maks ~1600px, JPEG 0.8) */
function readFile(file, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    if (file.size > 15 * 1024 * 1024) { reject(new Error('Berkas terlalu besar (maks 15 MB).')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.onload = () => {
      const dataUrl = reader.result;
      if (!/^image\/(jpeg|png|webp)/.test(file.type)) {
        resolve({ base64: dataUrl.split(',')[1], mime: file.type || 'application/octet-stream', dataUrl, nama: file.name });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const out = c.toDataURL('image/jpeg', 0.8);
        resolve({ base64: out.split(',')[1], mime: 'image/jpeg', dataUrl: out, nama: file.name });
      };
      img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
function pilihBerkas({ accept = 'image/*,application/pdf', capture = false } = {}) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept;
    if (capture) inp.setAttribute('capture', 'environment');
    inp.onchange = () => resolve(inp.files && inp.files[0] ? inp.files[0] : null);
    inp.click();
  });
}
function unduhBase64(b64, nama, mime = 'application/pdf') {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function unduhCsv(rows, nama) {
  const csv = rows.map(r => r.map(v => {
    const s = String(v === undefined || v === null ? '' : v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
/** Ambil nilai form: semua elemen [name] di dalam root */
function formData(root) {
  const o = {};
  root.querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox') { if (el.dataset.multi) { o[el.name] = o[el.name] || []; if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
    else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value.trim();
  });
  return o;
}
function selOpts(list, val, labelFn = x => x, valFn = x => x) {
  return list.map(x => `<option value="${esc(valFn(x))}" ${String(valFn(x)) === String(val) ? 'selected' : ''}>${esc(labelFn(x))}</option>`).join('');
}

// Draft lokal (tindakan & kasir)
const Draft = {
  get(id) { try { return JSON.parse(localStorage.getItem('oc_draft_' + id) || 'null'); } catch (e) { return null; } },
  set(id, v) { try { localStorage.setItem('oc_draft_' + id, JSON.stringify(v)); } catch (e) { /* abaikan */ } },
  del(id) { localStorage.removeItem('oc_draft_' + id); }
};

/** Muat detail pasien (rekam medis + berkas) dengan cache 2 menit */
async function muatDetailPasien(id, force = false, tanpaBerkas = false) {
  const c = S.detail[id];
  if (c && !force && Date.now() - c.t < 120000 && (tanpaBerkas || c.berkasLoaded)) return c;
  const res = await API.call('getPasienDetail', { id, tanpaBerkas });
  if (!res.success) { toast(res.message, 'err'); return c || { rekam: [], berkas: [] }; }
  S.detail[id] = { rekam: res.data.rekam, berkas: tanpaBerkas && c ? c.berkas : res.data.berkas, berkasLoaded: !tanpaBerkas || (c && c.berkasLoaded), t: Date.now() };
  return S.detail[id];
}

// Registry halaman
const Pages = {};
