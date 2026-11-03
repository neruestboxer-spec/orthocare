/**
 * APP — router SPA (hash), shell, login, bootstrap data.
 * Satu URL, navigasi via #/rute — aman untuk GitHub Pages.
 */
const ROUTES = [
  [/^beranda$/, 'beranda'],
  [/^jadwal$/, 'jadwal'],
  [/^jadwal\/baru$/, 'jadwalForm'],
  [/^jadwal\/ubah\/([\w-]+)$/, 'jadwalForm'],
  [/^kunjungan\/([\w-]+)$/, 'kunjungan'],
  [/^pasien$/, 'pasien'],
  [/^pasien\/baru$/, 'pasienForm'],
  [/^pasien\/ubah\/([\w-]+)$/, 'pasienForm'],
  [/^pasien\/([\w-]+)$/, 'pasienDetail'],
  [/^soap\/pasien\/([\w-]+)$/, 'soap'],
  [/^soap\/([\w-]+)$/, 'soap'],
  [/^tindakan\/([\w-]+)$/, 'tindakan'],
  [/^kasir\/([\w-]+)$/, 'kasir'],
  [/^kuitansi\/([\w-]+)$/, 'kuitansi'],
  [/^menu$/, 'menu'],
  [/^layanan$/, 'layanan'],
  [/^layanan\/baru$/, 'layananForm'],
  [/^layanan\/([\w-]+)$/, 'layananForm'],
  [/^stok$/, 'stok'],
  [/^stok\/baru$/, 'stokForm'],
  [/^stok\/([\w-]+)$/, 'stokForm'],
  [/^keuangan$/, 'keuangan'],
  [/^laporan$/, 'laporan'],
  [/^tenaga$/, 'tenaga'],
  [/^tenaga\/baru$/, 'tenagaForm'],
  [/^tenaga\/([\w-]+)$/, 'tenagaForm'],
  [/^pengaturan$/, 'pengaturan'],
  [/^log$/, 'log']
];

const App = {
  ctx: null,
  ready: false,

  async init() {
    document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); App.login(); });
    document.getElementById('login-eye').addEventListener('click', () => {
      const i = document.getElementById('login-pw');
      i.type = i.type === 'password' ? 'text' : 'password';
    });
    window.addEventListener('hashchange', () => App.route());
    App.bindView();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && API.token && Date.now() - S.loadedAt > 180000) App.refresh(true);
    });

    if (!API.configured) {
      App.showLogin('⚠️ GAS_URL belum diisi. Buka js/config.js lalu isi URL /exec dari Apps Script.');
      document.getElementById('login-btn').disabled = true;
      return App.hideBoot();
    }
    if (API.token) {
      if (loadSnapshot()) { App.showShell(); App.route(); App.hideBoot(); App.refresh(true); }
      else { const ok = await App.refresh(); App.hideBoot(); if (ok) { App.showShell(); App.route(); } }
    } else {
      App.showLogin(); App.hideBoot();
    }
  },

  hideBoot() { const b = document.getElementById('boot'); if (b) b.classList.add('hidden'); },

  showLogin(msg) {
    document.getElementById('shell').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');
    document.getElementById('sheet-root').innerHTML = '';
    const err = document.getElementById('login-err');
    if (msg) { err.textContent = msg; err.classList.remove('hidden'); } else err.classList.add('hidden');
    App.hideBoot();
  },

  showShell() {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('shell').classList.remove('hidden');
  },

  async login() {
    const pw = document.getElementById('login-pw').value;
    const btn = document.getElementById('login-btn');
    if (!pw) return;
    btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span> Memeriksa…';
    const res = await API.call('login', { password: pw });
    if (!res.success) {
      btn.disabled = false; btn.textContent = 'Masuk';
      App.showLogin(res.message);
      return;
    }
    API.setToken(res.token);
    btn.innerHTML = '<span class="spinner sm"></span> Memuat data klinik…';
    const ok = await App.refresh();
    btn.disabled = false; btn.textContent = 'Masuk';
    document.getElementById('login-pw').value = '';
    if (ok) { App.showShell(); if (!location.hash) location.hash = '#/beranda'; else App.route(); }
  },

  async logout() {
    const ok = await confirmSheet({ title: 'Keluar dari aplikasi?', message: 'Data tersimpan di server. Cache di perangkat ini akan dihapus.', okText: 'Keluar', danger: true });
    if (!ok) return;
    API.call('logout');
    API.setToken('');
    Object.keys(localStorage).filter(k => k.startsWith('oc_')).forEach(k => localStorage.removeItem(k));
    S.detail = {};
    App.showLogin('Anda sudah keluar.');
  },

  /** Ambil ulang semua data dari server */
  async refresh(silent = false) {
    const res = await API.call('bootstrap');
    if (!res.success) {
      if (res.code !== 'AUTH' && !silent) App.showLogin(res.message);
      else if (res.code !== 'AUTH') toast(res.message, 'err');
      return false;
    }
    loadBootstrap(res.data);
    if (App.ctx && !App.ctx.dirty) App.render(true);
    return true;
  },

  parse() {
    const raw = (location.hash || '#/beranda').replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const q = {};
    (query || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
    for (const [re, name] of ROUTES) {
      const m = path.match(re);
      if (m) return { name, params: m.slice(1), q, path };
    }
    return { name: 'beranda', params: [], q, path: 'beranda' };
  },

  route() {
    if (!API.token) return;
    const r = App.parse();
    const page = Pages[r.name];
    if (!page) return;
    document.getElementById('sheet-root').innerHTML = '';
    App.ctx = {
      ...r, page, state: {},
      rerender: () => App.render(true),
      update: (sel, html) => { const el = document.querySelector('#view ' + sel); if (el) el.innerHTML = html; },
      el: document.getElementById('view')
    };
    if (page.init) page.init(App.ctx);
    App.render(false);
  },

  render(keepScroll) {
    const ctx = App.ctx;
    if (!ctx) return;
    const page = ctx.page;
    const y = window.scrollY;
    const shell = document.getElementById('shell');
    const navKey = typeof page.nav === 'function' ? page.nav(ctx) : page.nav;
    shell.classList.toggle('nonav', !navKey);
    document.querySelectorAll('#bottom-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey));

    document.getElementById('topbar').innerHTML = App.header(page.header ? page.header(ctx) : { type: 'main', title: '' });
    let html;
    try { html = page.render(ctx); } catch (err) { console.error(err); html = emptyState('error', 'Halaman gagal dimuat', err.message); }
    const view = document.getElementById('view');
    view.innerHTML = html;
    const bar = page.bar ? page.bar(ctx) : '';
    document.getElementById('bottom-bar-slot').innerHTML = bar ? `<div class="bottom-bar ${navKey ? 'with-nav' : ''}">${bar}</div>` : '';
    view.className = 'view' + (bar ? (navKey ? ' has-bar' : ' no-nav') : (!navKey ? ' no-nav' : ''));

    const fab = document.getElementById('fab');
    const f = page.fab ? page.fab(ctx) : null;
    fab.classList.toggle('hidden', !f);
    if (f) { fab.href = f.href; fab.innerHTML = ic(f.icon || 'add'); fab.setAttribute('aria-label', f.label || 'Tambah'); }

    if (page.mount) { try { page.mount(ctx, view); } catch (err) { console.error(err); } }
    window.scrollTo(0, keepScroll ? y : 0);
  },

  header(h) {
    const me = esc(initials(setting('NAMA_ADMIN', 'Admin')));
    const right = h.right !== undefined ? h.right : `<a class="avatar-me" href="#/menu" aria-label="Menu">${me}</a>`;
    if (h.type === 'sub') {
      return `<button class="icon-btn" data-act="__back" aria-label="Kembali" style="margin-left:-8px">${ic('arrow_back')}</button>
        <div class="grow"><div class="t-sub gray">${esc(h.sub || 'ORTHOCARE ADMIN')}</div><div class="t-title ellipsis">${esc(h.title)}</div></div>${right}`;
    }
    const logo = S.aset && S.aset.logo ? `<img src="${S.aset.logo}" alt="">` : ic('add', 'fill');
    const nNotif = App.notifs().length;
    return `<div class="brand-logo">${logo}</div>
      <div class="grow"><div class="t-sub">ORTHOCARE ADMIN</div><div class="t-title ellipsis">${esc(h.title)}</div></div>
      <button class="icon-btn bell" data-act="__notif" aria-label="Notifikasi">${ic('notifications')}${nNotif ? '<i class="dot"></i>' : ''}</button>${right}`;
  },

  notifs() {
    const out = [];
    const besok = addDays(todayStr(), 1);
    stokPerhatian().forEach(({ s, i }) => out.push({ icon: i.kritis ? 'inventory_2' : 'event_busy', cls: 'red', text: `${s.Nama}: ${i.kritis ? 'stok ' + i.stok + ' ' + s.Satuan + ' (min ' + i.min + ')' : i.expired ? 'sudah kedaluwarsa' : 'kedaluwarsa ' + i.sisaHari + ' hari lagi'}`, href: '#/stok?tab=kritis' }));
    const rem = S.jadwal.filter(j => j.Tanggal === besok && j.Status === 'Terjadwal' && j.Reminder_Terkirim !== 'Ya');
    if (rem.length) out.push({ icon: 'chat', cls: 'teal', text: `${rem.length} pasien perlu diingatkan untuk besok`, href: '#/beranda' });
    const menunggu = S.jadwal.filter(j => j.Status === 'Terjadwal' && (j.Tanggal < todayStr() || (j.Tanggal === todayStr() && j.Jam_Selesai <= nowHM())));
    if (menunggu.length) out.push({ icon: 'pending_actions', cls: 'amber', text: `${menunggu.length} kunjungan lewat jam selesai, belum diselesaikan/ditandai`, href: '#/jadwal?tab=mendatang' });
    const belum = S.transaksi.filter(t => t.Tipe === 'Pemasukan' && t.Status_Bayar !== 'Lunas');
    if (belum.length) out.push({ icon: 'receipt_long', cls: 'amber', text: `${belum.length} tagihan belum lunas`, href: '#/keuangan?f=belum' });
    return out;
  },

  bindView() {
    const handler = (type) => (e) => {
      const ctx = App.ctx;
      if (!ctx) return;
      if (type === 'click') {
        const g = e.target.closest('[data-act^="__"]');
        if (g) {
          e.preventDefault();
          if (g.dataset.act === '__back') { if (history.length > 1 && !ctx.page.backTo) history.back(); else go(typeof ctx.page.backTo === 'function' ? ctx.page.backTo(ctx) : (ctx.page.backTo || '#/beranda')); }
          if (g.dataset.act === '__notif') App.showNotif();
          return;
        }
      }
      const attr = type === 'click' ? 'data-act' : 'data-on';
      const el = e.target.closest(`[${attr}]`);
      if (!el) return;
      if (type !== 'click' && el.dataset.onType && el.dataset.onType !== type) return;
      const name = el.getAttribute(attr);
      const fns = type === 'click' ? ctx.page.actions : ctx.page.inputs;
      if (fns && fns[name]) {
        // Tautan eksternal (wa.me, Maps) tetap terbuka; tombol & tautan internal ditangani handler
        if (type === 'click' && !(el.tagName === 'A' && el.target === '_blank') && el.tagName !== 'INPUT' && el.tagName !== 'LABEL') e.preventDefault();
        fns[name](el, e, ctx);
      }
    };
    document.getElementById('view').addEventListener('submit', e => e.preventDefault());
    ['click', 'input', 'change'].forEach(t => {
      document.getElementById('view').addEventListener(t, handler(t));
      document.getElementById('topbar').addEventListener(t, handler(t));
      document.getElementById('bottom-bar-slot').addEventListener(t, handler(t));
    });
  },

  showNotif() {
    const n = App.notifs();
    const s = openSheet({
      title: 'Notifikasi',
      body: n.length ? n.map(x => `<a class="list-item" href="${x.href}" data-sact="close" style="color:inherit"><div class="icon-tile sm ${x.cls}">${ic(x.icon)}</div><div class="grow small">${esc(x.text)}</div>${ic('chevron_right', 'faint')}</a>`).join('')
        : emptyState('notifications_off', 'Semua beres', 'Tidak ada peringatan saat ini.'),
      onAction: (a, b, ctx) => { if (a === 'close') { ctx.close(); if (b.getAttribute('href')) go(b.getAttribute('href')); } }
    });
    return s;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
