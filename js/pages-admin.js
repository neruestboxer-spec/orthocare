/**
 * HALAMAN ADMIN — Menu, Layanan & HPP, Stok, Keuangan, Laporan, Tenaga Medis, Pengaturan, Log
 */

// ---------- Grafik SVG ringan (garis 2px, penanda 8px, grid samar, satu sumbu) ----------
const CH = { blue: '#2F6BFF', teal: '#0D9488', grid: '#E2E8F0' };

function lineChart(pts, { h = 170, fmt = rpShort } = {}) {
  const w = 340, pl = 8, pr = 8, pt = 26, pb = 24;
  const max = Math.max(1, ...pts.map(p => p.v)) * 1.15;
  const x = i => pl + (pts.length === 1 ? (w - pl - pr) / 2 : i * (w - pl - pr) / (pts.length - 1));
  const y = v => pt + (h - pt - pb) * (1 - v / max);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = line + ` L${x(pts.length - 1).toFixed(1)},${h - pb} L${x(0).toFixed(1)},${h - pb} Z`;
  const last = pts.length - 1;
  return `<div class="chart-wrap" data-chart='${esc(JSON.stringify(pts.map((p, i) => ({ x: x(i) / w * 100, l: p.l, v: fmt(p.v) }))))}'>
    <svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik tren">
      <defs><linearGradient id="lg1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${CH.blue}" stop-opacity=".18"/><stop offset="1" stop-color="${CH.blue}" stop-opacity="0"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75].map(f => `<line class="grid" x1="${pl}" x2="${w - pr}" y1="${pt + (h - pt - pb) * f}" y2="${pt + (h - pt - pb) * f}" stroke-dasharray="3 4"/>`).join('')}
      <line class="grid" x1="${pl}" x2="${w - pr}" y1="${h - pb}" y2="${h - pb}"/>
      <path d="${area}" fill="url(#lg1)"/><path d="${line}" fill="none" stroke="${CH.blue}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="#fff" stroke="${CH.blue}" stroke-width="2"><title>${esc(p.l)}: ${esc(fmt(p.v))}</title></circle>`).join('')}
      ${pts.map((p, i) => `<text x="${x(i)}" y="${h - 6}" text-anchor="middle" ${i === last ? 'style="fill:#2F6BFF;font-weight:600"' : ''}>${esc(p.l)}</text>`).join('')}
      <text x="${Math.min(x(last), w - 40)}" y="${y(pts[last].v) - 10}" text-anchor="middle" style="fill:#0F172A;font-weight:700">${esc(fmt(pts[last].v))}</text>
    </svg><div class="chart-tip hidden"></div></div>`;
}
function barsChart(groups, series, { h = 180, fmt = rpShort } = {}) {
  const w = 340, pl = 8, pr = 8, pt = 14, pb = 24;
  const max = Math.max(1, ...groups.flatMap(g => series.map(s => g[s.k]))) * 1.1;
  const gw = (w - pl - pr) / groups.length, bw = Math.min(16, (gw - 10) / series.length - 2);
  const y = v => pt + (h - pt - pb) * (1 - Math.max(0, v) / max);
  let bars = '';
  groups.forEach((g, gi) => {
    const x0 = pl + gi * gw + (gw - series.length * (bw + 2)) / 2;
    series.forEach((s, si) => {
      const v = g[s.k], yy = y(v), hh = h - pb - yy;
      if (hh > 0) bars += `<path d="M${x0 + si * (bw + 2)},${h - pb} V${yy + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${h - pb} Z" fill="${s.c}"><title>${esc(g.l)} · ${esc(s.n)}: ${esc(fmt(v))}</title></path>`;
    });
    bars += `<text x="${pl + gi * gw + gw / 2}" y="${h - 6}" text-anchor="middle">${esc(g.l)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik batang">${[0.33, 0.66].map(f => `<line class="grid" x1="${pl}" x2="${w - pr}" y1="${pt + (h - pt - pb) * f}" y2="${pt + (h - pt - pb) * f}" stroke-dasharray="3 4"/>`).join('')}<line class="grid" x1="${pl}" x2="${w - pr}" y1="${h - pb}" y2="${h - pb}"/>${bars}</svg>
    <div class="legend mt-8">${series.map(s => `<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join('')}</div>`;
}
function donut(parts, center, sub) {
  const r = 52, c = 2 * Math.PI * r, tot = parts.reduce((a, p) => a + p.v, 0) || 1;
  let off = 0;
  const gap = parts.filter(p => p.v > 0).length > 1 ? 3 : 0;
  const segs = parts.map(p => {
    const len = Math.max(0, p.v / tot * c - gap);
    const s = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${p.c}" stroke-width="16" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(p.n)}: ${p.v}</title></circle>`;
    off += p.v / tot * c;
    return s;
  }).join('');
  return `<svg viewBox="0 0 140 140" width="132" height="132" role="img" aria-label="Diagram proporsi"><circle r="${r}" cx="70" cy="70" fill="none" stroke="#EAEDFF" stroke-width="16"/>${segs}
    <text x="70" y="70" text-anchor="middle" style="font:700 24px Inter;fill:#0F172A">${esc(center)}</text><text x="70" y="88" text-anchor="middle" style="font:500 11px Inter;fill:#64748B">${esc(sub)}</text></svg>`;
}
function pasangTooltipGrafik(root) {
  root.querySelectorAll('[data-chart]').forEach(wrap => {
    const pts = JSON.parse(wrap.dataset.chart), tip = wrap.querySelector('.chart-tip');
    const show = e => {
      const r = wrap.getBoundingClientRect(), px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * 100;
      const p = pts.reduce((a, b) => Math.abs(b.x - px) < Math.abs(a.x - px) ? b : a);
      tip.textContent = p.l + ': ' + p.v; tip.style.left = p.x + '%'; tip.style.top = '28px'; tip.classList.remove('hidden');
    };
    wrap.addEventListener('pointermove', show); wrap.addEventListener('pointerdown', show);
    wrap.addEventListener('pointerleave', () => tip.classList.add('hidden'));
  });
}

// ============================================
// MENU
// ============================================
Pages.menu = {
  nav: 'menu',
  header: () => ({ type: 'main', title: 'Menu' }),
  render() {
    const t = todayStr();
    const selesai = S.jadwal.filter(j => j.Tanggal === t && j.Status === 'Selesai').length;
    const total = S.jadwal.filter(j => j.Tanggal === t && isAktifJadwal(j)).length;
    const omzet = S.transaksi.filter(x => x.Tipe === 'Pemasukan' && x.Tanggal === t);
    const kritis = stokPerhatian().length;
    const tenagaAktif = S.tenaga.filter(x => x.Status !== 'Nonaktif').length;
    const mods = [
      ['#/layanan', 'medical_services', 'Layanan & HPP', 'Katalog tarif, resep BMHP & margin', S.layanan.some(l => l.Aktif !== 'Tidak' && (marginInfo(l, 'Klinik').rendah || marginInfo(l, 'Visit').rendah)) ? badge('Margin rendah', 'b-amber') : ''],
      ['#/stok', 'inventory_2', 'Stok & Bahan', S.stok.filter(s => s.Aktif !== 'Tidak').length + ' SKU aktif terdata', kritis ? badge(kritis + ' Kritis', 'b-red') : ''],
      ['#/keuangan', 'account_balance_wallet', 'Keuangan', 'Arus kas, transaksi & bukti bayar', ''],
      ['#/laporan', 'monitoring', 'Laporan & Tren', 'Grafik omzet, HPP & ekspor PDF', ''],
      ['#/tenaga', 'badge', 'Tenaga Medis', 'Jadwal dokter & terapis aktif', badge(tenagaAktif + ' Aktif', 'b-blue')],
      [S.sistem.driveUrl || '#/menu', 'folder_open', 'Berkas & Drive', 'Rontgen, consent & arsip PDF', '', true],
      ['#/pengaturan?s=wa', 'chat', 'Template WA', 'Pengingat, kuitansi & edukasi', badge('Auto', 'b-teal')],
      ['#/pengaturan', 'tune', 'Pengaturan', 'Profil klinik, jam buka & integrasi', '']
    ];
    return `
    <div class="card"><div class="row gap-12"><div class="avatar lg square solid">${esc(initials(setting('NAMA_ADMIN', 'Admin')))}</div>
      <div class="grow"><p class="h3 ellipsis">${esc(setting('NAMA_ADMIN', 'Admin'))}</p><p class="small muted ellipsis">${esc(setting('EMAIL_ADMIN') || setting('NAMA_KLINIK'))}</p><div class="mt-4">${badge('Admin Klinik · Akses Penuh', 'b-blue')}</div></div>
      <a class="icon-btn soft" href="#/pengaturan" aria-label="Ubah profil">${ic('edit', 'sm')}</a></div>
      <div class="inset row mt-12"><div class="icon-tile sm teal">${ic('cloud_done')}</div><div class="grow"><p class="strong small">Terhubung Google Workspace</p><p class="tiny muted">Sheets · Drive · Calendar · sinkron ${S.loadedAt ? new Date(S.loadedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</p></div>
        <button class="icon-btn sm" data-act="sync" aria-label="Sinkron">${ic('sync', 'sm c-primary')}</button></div></div>
    <div class="grid3 mt-12">
      <div class="stat"><p class="lbl">Pasien Selesai</p><p class="val c-primary" style="font-size:18px">${selesai} <small>/ ${total}</small></p><p class="tiny muted">hari ini</p></div>
      <div class="stat"><p class="lbl">Omzet Hari Ini</p><p class="val" style="font-size:18px">${rpShort(sum(omzet, 'Jumlah'))}</p><p class="tiny muted">${omzet.length} kuitansi</p></div>
      <a class="stat" href="#/stok?tab=kritis" style="color:inherit"><p class="lbl">Logistik</p><p class="val ${kritis ? 'c-danger' : 'c-success'}" style="font-size:18px">${kritis} Kritis</p><p class="tiny muted">${kritis ? 'Perlu PO' : 'Aman'}</p></a>
    </div>
    <div class="sec-head"><h2 class="eyebrow gray" style="font-size:12px">MODUL PENGELOLAAN</h2><span class="tiny muted">${mods.length} fitur</span></div>
    <div class="mod-grid">${mods.map(([h, icn, n, d, b, ext]) => `<a class="mod" href="${h}" ${ext ? 'target="_blank" rel="noopener"' : ''}>${b || ic(ext ? 'open_in_new' : 'chevron_right', 'go')}<div class="icon-tile sm">${ic(icn)}</div><h4>${n}</h4><p>${d}</p></a>`).join('')}</div>
    <p class="eyebrow gray mt-24 mb-8" style="font-size:12px">SISTEM & KEAMANAN DATA</p>
    <div class="card" style="padding:4px 16px">
      <a class="list-item" href="#/log" style="color:inherit"><div class="icon-tile sm gray">${ic('history')}</div><div class="grow"><p class="strong">Log Audit Aktivitas</p><p class="tiny muted">Riwayat perubahan rekam medis & transaksi</p></div>${ic('chevron_right', 'faint')}</a>
      <a class="list-item" href="#/menu" data-act="bantuan" style="color:inherit"><div class="icon-tile sm gray">${ic('help')}</div><div class="grow"><p class="strong">Pusat Bantuan & Panduan</p><p class="tiny muted">SOP alur harian & pemecahan masalah</p></div>${ic('chevron_right', 'faint')}</a>
      <a class="list-item" href="#/pengaturan?s=backup" style="color:inherit"><div class="icon-tile sm gray">${ic('database')}</div><div class="grow"><p class="strong">Cadangan Data Spreadsheet</p><p class="tiny muted ellipsis">Otomatis tiap Senin · ${S.sistem.jumlahBackup || 0} salinan</p></div>${S.sistem.lastBackup ? badge('Tersimpan ' + fmtTgl(S.sistem.lastBackup.slice(0, 10), 'dm'), 'b-teal') : badge('Belum ada', 'b-amber')}</a>
      ${S.sistem.sheetUrl ? `<a class="list-item" href="${S.sistem.sheetUrl}" target="_blank" rel="noopener" style="color:inherit"><div class="icon-tile sm gray">${ic('table_view')}</div><div class="grow"><p class="strong">Buka Database (Google Sheets)</p><p class="tiny muted">Hanya bisa dibuka akun Google pemilik</p></div>${ic('open_in_new', 'faint')}</a>` : ''}
    </div>
    <button class="btn btn-ghost-danger btn-block mt-24" data-act="keluar">${ic('logout')} Keluar Akun (Sign Out)</button>
    <p class="center tiny mono faint mt-16">OrthoCare Admin v${esc(APP_CONFIG.APP_VERSION)} · GitHub Pages + Apps Script API</p>`;
  },
  actions: {
    keluar: () => App.logout(),
    sync: async el => { el.innerHTML = '<span class="spinner sm" style="border-color:var(--primary-tint);border-top-color:var(--primary)"></span>'; if (await App.refresh(true)) toast('Data tersinkron.'); },
    bantuan: () => openSheet({
      title: 'Panduan Singkat',
      body: `<div class="stack small">${[
        ['1. Daftarkan pasien', 'Pasien → tombol +. Folder Drive privat dibuat otomatis.'],
        ['2. Buat jadwal', 'Jadwal → + → pilih pasien, layanan, slot. Event masuk Google Calendar.'],
        ['3. Ingatkan pasien', 'Beranda → "Perlu Diingatkan Besok" → Kirim WA (1 klik per pasien).'],
        ['4. Hari kunjungan', 'Buka kartu jadwal → Catat SOAP → unggah foto rontgen.'],
        ['5. Selesaikan', 'Tandai Selesai → periksa tindakan, BMHP & resep → Kasir → Proses Pembayaran. Stok & HPP tercatat otomatis.'],
        ['6. Kuitansi', 'Kirim via WhatsApp (tautan 24 jam) atau unduh PDF lalu lampirkan manual.'],
        ['Data tidak muncul?', 'Tekan Sinkron di Beranda/Menu. Bila masih gagal, keluar lalu masuk lagi.'],
        ['Lupa kata sandi?', 'Buka editor Apps Script → jalankan fungsi resetPassword() → lihat Execution log.']
      ].map(([h, d]) => `<div><p class="strong">${h}</p><p class="muted">${d}</p></div>`).join('')}</div>`
    })
  }
};

// ============================================
// LAYANAN & HPP
// ============================================
function barisMargin(l, jenis) {
  const m = marginInfo(l, jenis);
  const cls = m.rendah ? 'red' : 'teal';
  return `<div class="inset mt-12"><div class="grid2"><div><p class="tiny muted">Tarif ${jenis === 'Visit' ? 'Visit' : 'Klinik'}</p><p class="money">${rp(m.tarif)}</p></div><div><p class="tiny muted">Total HPP satuan</p><p class="money">${rp(m.hpp)}</p></div></div></div>
    <div class="row between mt-8 small"><span>Margin unit</span><span class="row"><span class="mono tiny ${m.rendah ? 'c-danger' : 'muted'}">(${rp(m.laba, { plus: true })})</span>${badge(m.margin.toFixed(1).replace('.', ',') + '%', m.rendah ? 'b-red' : 'b-green')}</span></div>
    <div class="progress ${cls} mt-4"><i style="width:${Math.max(3, Math.min(100, m.margin))}%"></i></div>`;
}
Pages.layanan = {
  nav: 'menu',
  backTo: '#/menu',
  header: () => ({ type: 'sub', title: 'Layanan, Tarif & HPP' }),
  fab: () => ({ href: '#/layanan/baru', label: 'Layanan baru' }),
  init(ctx) { ctx.state = { q: '', kat: 'Semua' }; },
  render(ctx) {
    const s = ctx.state;
    const kats = ['Semua', 'Terapi', 'Tindakan', 'Kontrol', 'Lainnya', 'Nonaktif'];
    const fil = l => s.kat === 'Nonaktif' ? l.Aktif === 'Tidak' : l.Aktif !== 'Tidak' && (s.kat === 'Semua' || l.Kategori === s.kat);
    const list = S.layanan.filter(fil).filter(l => !s.q || l.Nama_Layanan.toLowerCase().includes(s.q.toLowerCase()));
    const aktif = S.layanan.filter(l => l.Aktif !== 'Tidak');
    const margins = aktif.map(l => marginInfo(l, l.Tipe_Lokasi === 'Visit' ? 'Visit' : 'Klinik')).filter(m => m.tarif);
    const avg = margins.length ? margins.reduce((a, m) => a + m.margin, 0) / margins.length : 0;
    return `
    <p class="small muted">Monitoring margin unit, komponen BMHP & kelayakan tarif klinik.</p>
    <div class="search mt-12">${ic('search')}<input data-on="cari" placeholder="Cari tindakan atau layanan…" value="${esc(s.q)}"></div>
    <div class="chips mt-12">${kats.map(k => `<button class="chip ${s.kat === k ? 'active' : ''}" data-act="kat" data-k="${k}">${k}${k === 'Semua' ? ' ' + aktif.length : ''}</button>`).join('')}</div>
    <div class="card tint mt-12"><div class="row between"><div><p class="eyebrow gray">Standar margin klinik</p><p class="h3">Target min. ${esc(setting('MARGIN_MIN', 30))}%</p></div><div class="right"><p class="tiny muted">Rata-rata terkini</p><p class="h2 ${avg < num(setting('MARGIN_MIN', 30)) ? 'c-danger' : 'c-primary'}">${avg.toFixed(1).replace('.', ',')}%</p></div></div>
      <div class="inset white mt-12 tiny mono">${ic('function', 'xs')} HPP = BMHP + Jasa Medis + Overhead (+ Transport Visit)</div></div>
    <div class="stack mt-16" id="llist">${list.length ? list.map(l => {
      const h = hppDetail(l, 'Klinik');
      const rendah = (l.Tipe_Lokasi !== 'Visit' && marginInfo(l, 'Klinik').rendah) || (l.Tipe_Lokasi !== 'Klinik' && marginInfo(l, 'Visit').rendah);
      return `<div class="card"><div class="row between"><div class="row wrap">${badge(l.Kategori, 'b-blue')}${badge(l.Tipe_Lokasi === 'Keduanya' ? 'Klinik & Visit' : l.Tipe_Lokasi === 'Visit' ? 'Khusus Visit' : 'Klinik Only', l.Tipe_Lokasi === 'Visit' ? 'b-teal' : '')}${l.Aktif === 'Tidak' ? badge('Nonaktif', 'b-red') : ''}</div>
          <a class="icon-btn sm" href="#/layanan/${l.ID_Layanan}" aria-label="Ubah">${ic('more_vert')}</a></div>
        <p class="h3 mt-8">${esc(l.Nama_Layanan)}</p>
        <p class="tiny muted row mt-4">${ic('schedule', 'xs')} ${esc(l.Durasi_Menit)} menit${num(l.Biaya_Transport_Visit) && l.Tipe_Lokasi !== 'Klinik' ? ` · ${ic('directions_car', 'xs')} Transport ${rp(l.Biaya_Transport_Visit)}` : ''}</p>
        ${rendah ? `<div class="alert alert-red mt-12">${ic('warning', 'sm')}<span>Margin rendah (&lt; ${esc(setting('MARGIN_MIN', 30))}%) — evaluasi tarif atau biaya.</span></div>` : ''}
        ${l.Tipe_Lokasi !== 'Visit' ? barisMargin(l, 'Klinik') : ''}${l.Tipe_Lokasi !== 'Klinik' ? barisMargin(l, 'Visit') : ''}
        ${h.items.length ? `<p class="tiny strong muted row mt-12">${ic('inventory', 'xs')} BMHP OTOMATIS:</p><p class="small">${h.items.map(b => esc(b.nama) + ' (' + b.qty + ' ' + esc(b.satuan) + ')').join(', ')}</p>` : ''}
        <div class="row mt-12"><button class="btn btn-secondary btn-sm grow" data-act="detail" data-id="${l.ID_Layanan}">${ic('receipt_long', 'sm')} Detail HPP & Resep</button><a class="btn btn-outline btn-sm" href="#/layanan/${l.ID_Layanan}">${ic('edit', 'sm')} Ubah</a></div></div>`;
    }).join('') : `<div class="card">${emptyState('medical_services', 'Belum ada layanan', '', '<a class="btn btn-primary btn-sm" href="#/layanan/baru">Tambah Layanan</a>')}</div>`}</div>
    <div class="card tint mt-16 clickable" data-act="simulasi"><div class="row gap-12"><div class="icon-tile">${ic('calculate')}</div><div class="grow"><p class="h3">Simulasi & Kalkulator HPP</p><p class="small muted">Hitung rekomendasi harga tindakan baru</p></div>${ic('arrow_forward', 'c-primary')}</div></div>`;
  },
  inputs: { cari: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.rerender(); setTimeout(() => { const i = document.querySelector('[data-on=cari]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 250) },
  actions: {
    kat: (el, e, ctx) => { ctx.state.kat = el.dataset.k; ctx.rerender(); },
    detail: el => {
      const l = L(el.dataset.id);
      const blok = jenis => { const h = hppDetail(l, jenis), m = marginInfo(l, jenis); return `<p class="eyebrow mt-12">${jenis === 'Visit' ? 'VISIT RUMAH' : 'KLINIK'}</p>
        ${h.items.map(b => `<div class="kv-row"><span class="k">${esc(b.nama)} × ${b.qty} ${esc(b.satuan)}</span><span class="v">${rp(b.biaya)}</span></div>`).join('')}
        <div class="kv-row"><span class="k">Jasa medis</span><span class="v">${rp(h.jasa)}</span></div><div class="kv-row"><span class="k">Overhead</span><span class="v">${rp(h.overhead)}</span></div>
        ${jenis === 'Visit' ? `<div class="kv-row"><span class="k">Transport visit</span><span class="v">${rp(h.transport)}</span></div>` : ''}
        <div class="kv-row total"><span class="k">HPP</span><span class="v">${rp(h.total)}</span></div>
        <div class="kv-row"><span class="k">Tarif</span><span class="v">${rp(m.tarif)}</span></div><div class="kv-row"><span class="k">Laba kotor · Margin</span><span class="v ${m.rendah ? 'c-danger' : 'c-success'}">${rp(m.laba)} · ${m.margin.toFixed(1).replace('.', ',')}%</span></div>`; };
      openSheet({ title: esc(l.Nama_Layanan), body: (l.Tipe_Lokasi !== 'Visit' ? blok('Klinik') : '') + (l.Tipe_Lokasi !== 'Klinik' ? blok('Visit') : '') + `<p class="tiny muted mt-12">Harga bahan memakai harga beli rata-rata stok saat ini.</p>`, foot: `<a class="btn btn-primary" href="#/layanan/${l.ID_Layanan}" data-sact="close">${ic('edit', 'sm')} Ubah Layanan</a>` });
    },
    simulasi: () => {
      const s = openSheet({
        title: 'Kalkulator HPP',
        body: `<div class="grid2"><label class="field"><span>1. Biaya BMHP</span><input type="number" id="sm-b" value="25000"></label><label class="field"><span>2. Jasa medis</span><input type="number" id="sm-j" value="100000"></label>
          <label class="field"><span>Overhead</span><input type="number" id="sm-o" value="20000"></label><label class="field"><span>Transport</span><input type="number" id="sm-t" value="0"></label></div>
          <label class="field mt-12"><span>3. Target margin (%)</span><input type="number" id="sm-m" value="${esc(setting('MARGIN_MIN', 30))}"></label>
          <div class="card tint mt-16" id="sm-out"></div>`
      });
      const calc = () => {
        const g = id => num(s.el.querySelector(id).value);
        const hpp = g('#sm-b') + g('#sm-j') + g('#sm-o') + g('#sm-t'), m = Math.min(95, g('#sm-m'));
        const rek = Math.ceil(hpp / (1 - m / 100) / 5000) * 5000;
        s.el.querySelector('#sm-out').innerHTML = `<div class="kv-row"><span class="k">Total HPP</span><span class="v">${rp(hpp)}</span></div><div class="kv-row total"><span class="k">Rekomendasi tarif</span><span class="v c-primary">${rp(rek)}</span></div><p class="tiny muted">Dibulatkan ke Rp5.000 · margin aktual ${pct(rek - hpp, rek)}</p>`;
      };
      s.el.addEventListener('input', calc); calc();
    }
  }
};

Pages.layananForm = {
  nav: null,
  backTo: '#/layanan',
  header: ctx => ({ type: 'sub', title: ctx.params[0] ? 'Ubah Layanan' : 'Layanan Baru', right: '' }),
  init(ctx) {
    ctx.dirty = true;
    const l = ctx.params[0] ? L(ctx.params[0]) : null;
    ctx.state = {
      f: Object.assign({ Kategori: 'Terapi', Tipe_Lokasi: 'Keduanya', Durasi_Menit: 45, Aktif: 'Ya' }, l || {}),
      bahan: l ? resepLayanan(l.ID_Layanan).map(r => ({ ID_Bahan: r.ID_Bahan, Qty_Pakai: num(r.Qty_Pakai) })) : []
    };
  },
  live(ctx) {
    const f = ctx.state.f;
    const bahanCost = ctx.state.bahan.reduce((a, b) => a + num(b.Qty_Pakai) * num((B(b.ID_Bahan) || {}).Harga_Beli_Rata2), 0);
    const base = bahanCost + num(f.Biaya_Jasa_Medis) + num(f.Biaya_Overhead);
    const blok = (n, tarifV, hpp) => { const m = tarifV ? (tarifV - hpp) / tarifV * 100 : 0; const low = tarifV && m < num(setting('MARGIN_MIN', 30)); return `<div class="inset"><p class="tiny muted">${n}</p><p class="small">HPP <b>${rp(hpp)}</b></p><p class="small">Margin <b class="${low ? 'c-danger' : 'c-success'}">${tarifV ? m.toFixed(1).replace('.', ',') + '%' : '-'}</b></p></div>`; };
    return `<div class="grid2">${f.Tipe_Lokasi !== 'Visit' ? blok('Klinik', num(f.Tarif_Klinik), base) : ''}${f.Tipe_Lokasi !== 'Klinik' ? blok('Visit', num(f.Tarif_Visit), base + num(f.Biaya_Transport_Visit)) : ''}</div><p class="tiny muted mt-8">Biaya bahan: ${rp(bahanCost)}</p>`;
  },
  render(ctx) {
    const f = ctx.state.f;
    const n = (k, label, opt = {}) => `<label class="field"><span>${label}</span><input ${opt.t ? '' : 'type="number" inputmode="numeric" min="0"'} data-on="f" data-f="${k}" value="${esc(f[k] === undefined ? '' : f[k])}" placeholder="${opt.ph || '0'}"></label>`;
    return `
    <div class="card form-card"><h3>${ic('medical_services')} Informasi Layanan</h3>
      ${n('Nama_Layanan', 'Nama layanan', { t: 1, ph: 'Contoh: Injeksi Asam Hialuronat' })}
      <div class="grid2 mt-12"><label class="field"><span>Kategori</span><select data-on="f" data-f="Kategori">${selOpts(['Terapi', 'Tindakan', 'Kontrol', 'Lainnya'], f.Kategori)}</select></label>
        ${n('Durasi_Menit', 'Durasi (menit)')}</div>
      <p class="flabel mt-12 mb-8">Tipe lokasi</p>
      <div class="seg">${[['Klinik', 'Klinik'], ['Visit', 'Visit'], ['Keduanya', 'Keduanya']].map(([v, l]) => `<button class="${f.Tipe_Lokasi === v ? 'active' : ''}" data-act="lokasi" data-v="${v}">${l}</button>`).join('')}</div>
      <label class="check mt-16"><input type="checkbox" data-on="aktif" ${f.Aktif !== 'Tidak' ? 'checked' : ''}><span class="small">Layanan aktif (muncul di pilihan jadwal)</span></label></div>
    <div class="card form-card mt-12"><h3>${ic('sell')} Tarif & Komponen Biaya</h3>
      <div class="grid2">${f.Tipe_Lokasi !== 'Visit' ? n('Tarif_Klinik', 'Tarif klinik (Rp)') : ''}${f.Tipe_Lokasi !== 'Klinik' ? n('Tarif_Visit', 'Tarif visit (Rp)') : ''}
        ${n('Biaya_Jasa_Medis', 'Jasa medis / honor')}${n('Biaya_Overhead', 'Overhead (listrik, sewa)')}
        ${f.Tipe_Lokasi !== 'Klinik' ? n('Biaya_Transport_Visit', 'Transport visit') : ''}</div></div>
    <div class="card form-card mt-12"><div class="row between"><h3 style="margin:0">${ic('inventory')} Resep Bahan (BMHP)</h3><button class="link-btn" data-act="tambahBahan">${ic('add', 'sm')} Bahan</button></div>
      <p class="tiny muted mt-4 mb-8">Bahan ini otomatis masuk tagihan & mengurangi stok saat kunjungan selesai.</p>
      ${ctx.state.bahan.map((b, i) => { const s = B(b.ID_Bahan) || {}; return `<div class="list-item"><div class="grow"><p class="strong small">${esc(s.Nama || b.ID_Bahan)}</p><p class="tiny muted">${rp(s.Harga_Beli_Rata2)}/${esc(s.Satuan || '')}</p></div>
        <input class="input" type="number" min="0" step="any" style="width:80px;min-height:40px" data-on="qty" data-i="${i}" value="${b.Qty_Pakai}"><button class="icon-btn sm" data-act="hapusBahan" data-i="${i}">${ic('delete', 'sm c-danger')}</button></div>`; }).join('') || '<p class="small muted">Belum ada bahan.</p>'}</div>
    <div class="card mt-12"><h3 class="h3 row mb-12">${ic('analytics', 'c-primary')} Kalkulasi HPP Langsung</h3><div id="hpp-live">${this.live(ctx)}</div></div>`;
  },
  bar: () => `<button class="btn btn-secondary" data-act="batal">Batal</button><button class="btn btn-primary grow" data-act="simpan">${ic('save', 'sm')} Simpan Layanan</button>`,
  inputs: {
    f: (el, e, ctx) => { ctx.state.f[el.dataset.f] = el.value; ctx.update('#hpp-live', Pages.layananForm.live(ctx)); },
    qty: (el, e, ctx) => { ctx.state.bahan[Number(el.dataset.i)].Qty_Pakai = num(el.value); ctx.update('#hpp-live', Pages.layananForm.live(ctx)); },
    aktif: (el, e, ctx) => { ctx.state.f.Aktif = el.checked ? 'Ya' : 'Tidak'; }
  },
  actions: {
    batal: () => history.back(),
    lokasi: (el, e, ctx) => { ctx.state.f.Tipe_Lokasi = el.dataset.v; ctx.rerender(); },
    hapusBahan: (el, e, ctx) => { ctx.state.bahan.splice(Number(el.dataset.i), 1); ctx.rerender(); },
    tambahBahan: (el, e, ctx) => pickSheet({
      title: 'Pilih Bahan', items: S.stok.filter(s => s.Aktif !== 'Tidak').map(s => Object.assign({ _q: s.Nama + ' ' + s.Kode }, s)),
      render: s => `<div class="icon-tile sm">${ic(s.Kategori === 'Obat' ? 'medication' : 'medical_services')}</div><div class="grow"><p class="strong">${esc(s.Nama)}</p><p class="tiny muted">${esc(s.Kode)} · ${rp(s.Harga_Beli_Rata2)}/${esc(s.Satuan)}</p></div>`,
      onPick: s => { if (!ctx.state.bahan.find(b => b.ID_Bahan === s.ID_Bahan)) ctx.state.bahan.push({ ID_Bahan: s.ID_Bahan, Qty_Pakai: 1 }); ctx.rerender(); }
    }),
    simpan: async (el, e, ctx) => {
      const f = ctx.state.f;
      if (!String(f.Nama_Layanan || '').trim()) return toast('Nama layanan wajib diisi.', 'err');
      const res = await run('saveLayanan', Object.assign({}, f, { ID_Layanan: ctx.params[0] || '', bahan: ctx.state.bahan }), { btn: el });
      if (res.success) { ctx.dirty = false; location.replace('#/layanan'); }
    }
  }
};

// ============================================
// STOK OBAT & BAHAN
// ============================================
function mutasiSheet(s, jenis = 'Masuk', onDone) {
  if (!s) {
    return pickSheet({
      title: jenis === 'Masuk' ? 'Catat Stok Masuk — Pilih Item' : 'Mutasi Manual — Pilih Item',
      items: S.stok.filter(x => x.Aktif !== 'Tidak').map(x => Object.assign({ _q: x.Nama + ' ' + x.Kode }, x)),
      render: x => `<div class="grow"><p class="strong">${esc(x.Nama)}</p><p class="tiny muted">${esc(x.Kode)} · stok ${esc(x.Stok_Saat_Ini)} ${esc(x.Satuan)}</p></div>`,
      onPick: x => mutasiSheet(B(x.ID_Bahan), jenis, onDone)
    });
  }
  const sh = openSheet({
    title: esc(s.Nama),
    body: `<p class="tiny muted mb-12">Stok saat ini <b>${esc(s.Stok_Saat_Ini)} ${esc(s.Satuan)}</b> · harga beli rata-rata ${rp(s.Harga_Beli_Rata2)}</p>
      <div class="seg mb-12">${['Masuk', 'Keluar', 'Koreksi'].map(j => `<button class="${j === jenis ? 'active' : ''}" data-sact="jenis" data-v="${j}">${j}</button>`).join('')}</div>
      <label class="field"><span id="mq-l">${jenis === 'Koreksi' ? 'Stok fisik sebenarnya' : 'Jumlah'} (${esc(s.Satuan)})</span><input id="mq" type="number" inputmode="decimal" min="0" step="any"></label>
      <div id="m-masuk" class="${jenis === 'Masuk' ? '' : 'hidden'}"><div class="grid2 mt-12"><label class="field"><span>Harga beli / ${esc(s.Satuan)}</span><input id="mh" type="number" inputmode="numeric" min="0" value="${num(s.Harga_Beli_Rata2) || ''}"></label>
        <label class="field"><span>Kedaluwarsa batch</span><input id="me" type="date"></label></div>
        <label class="check small mt-12"><input type="checkbox" id="mk" checked><span>Catat sebagai pengeluaran (pembelian stok) di Keuangan</span></label></div>
      <label class="field mt-12"><span>Catatan / referensi</span><input id="mc" placeholder="Contoh: PO Kimia Farma / dipakai sterilisasi"></label>`,
    foot: `<button class="btn btn-primary" data-sact="ok">${ic('save', 'sm')} Simpan Mutasi</button>`,
    onAction: async (a, b, ctx) => {
      if (a === 'jenis') {
        jenis = b.dataset.v;
        ctx.el.querySelectorAll('[data-sact=jenis]').forEach(x => x.classList.toggle('active', x === b));
        ctx.el.querySelector('#m-masuk').classList.toggle('hidden', jenis !== 'Masuk');
        ctx.el.querySelector('#mq-l').textContent = (jenis === 'Koreksi' ? 'Stok fisik sebenarnya' : 'Jumlah') + ' (' + s.Satuan + ')';
        return;
      }
      if (a !== 'ok') return;
      const q = ctx.el.querySelector('#mq').value;
      if (q === '') return toast('Isi jumlah.', 'err');
      const r = await run('mutasiStok', { ID_Bahan: s.ID_Bahan, Jenis: jenis, Qty: q, Harga_Satuan: ctx.el.querySelector('#mh').value, Tgl_Kadaluarsa: ctx.el.querySelector('#me').value, catatKeuangan: ctx.el.querySelector('#mk').checked, Catatan: ctx.el.querySelector('#mc').value }, { btn: b });
      if (r.success) { ctx.close(); if (onDone) onDone(); }
    }
  });
  return sh;
}
Pages.stok = {
  nav: 'menu',
  backTo: '#/menu',
  header: () => ({ type: 'sub', title: 'Stok Obat & Bahan', sub: 'LOGISTIK & FARMASI' }),
  fab: () => ({ href: '#/stok/baru', label: 'Item baru' }),
  init(ctx) { ctx.state = { tab: ctx.q.tab || 'katalog', q: '', kat: 'Semua' }; },
  render(ctx) {
    const s = ctx.state, t = todayStr();
    const aktif = S.stok.filter(x => x.Aktif !== 'Tidak');
    const perhatian = stokPerhatian();
    const mutHari = S.mutasi.filter(m => String(m.Tanggal).slice(0, 10) === t);
    const lastAuto = [...S.mutasi].reverse().find(m => String(m.Referensi).startsWith('JDW'));
    const autoGrp = lastAuto ? S.mutasi.filter(m => m.Referensi === lastAuto.Referensi) : [];
    const ja = lastAuto ? J(lastAuto.Referensi) : null, pa = ja ? P(ja.ID_Pasien) : null;
    let body;
    if (s.tab === 'mutasi') {
      const list = [...S.mutasi].reverse().filter(m => !s.q || ((B(m.ID_Bahan) || {}).Nama + ' ' + m.Referensi + ' ' + m.Catatan).toLowerCase().includes(s.q.toLowerCase())).slice(0, 100);
      body = `<div class="row between mb-8"><p class="small muted">${S.mutasi.length} mutasi terakhir dimuat</p><button class="link-btn" data-act="csvMutasi">${ic('download', 'sm')} Ekspor CSV</button></div>
        <div class="card" style="padding:4px 16px">${list.map(m => { const b = B(m.ID_Bahan) || {}; const q = num(m.Qty); const plus = m.Jenis === 'Masuk' || (m.Jenis === 'Koreksi' && q > 0);
          return `<div class="list-item"><div class="icon-tile sm ${plus ? 'teal' : 'red'}" style="width:36px;height:36px">${ic(plus ? 'add' : 'remove', 'sm')}</div><div class="grow"><p class="strong small ellipsis">${esc(b.Nama || m.ID_Bahan)} <span class="mono ${plus ? 'c-teal' : 'c-danger'}">${plus ? '+' : '-'}${Math.abs(q)} ${esc(b.Satuan || '')}</span></p>
            <p class="tiny muted ellipsis">${esc(m.Jenis)} · ${esc(m.Catatan || m.Referensi || '-')}</p></div><span class="tiny mono muted nowrap">${fmtTgl(m.Tanggal.slice(0, 10), 'dm')} ${m.Tanggal.slice(11, 16)}</span></div>`; }).join('') || emptyState('swap_vert', 'Belum ada mutasi')}</div>`;
    } else {
      let list = s.tab === 'kritis' ? perhatian.map(x => x.s) : (s.kat === 'Nonaktif' ? S.stok.filter(x => x.Aktif === 'Tidak') : aktif.filter(x => s.kat === 'Semua' || x.Kategori === s.kat));
      if (s.q) list = list.filter(x => (x.Nama + ' ' + x.Kode).toLowerCase().includes(s.q.toLowerCase()));
      body = `${s.tab === 'katalog' ? `<div class="chips mb-12">${['Semua', 'BMHP', 'Obat', 'Nonaktif'].map(k => `<button class="chip ${s.kat === k ? 'active' : ''}" data-act="kat" data-k="${k}">${k === 'BMHP' ? 'Bahan Habis Pakai (BMHP)' : k === 'Obat' ? 'Obat Farmasi' : k}</button>`).join('')}</div>` : ''}
        ${lastAuto && s.tab === 'katalog' ? `<div class="card tint mb-16"><div class="row between"><div class="row gap-12"><div class="icon-tile sm">${ic('auto_fix_high')}</div><div><p class="eyebrow gray">Pengurangan otomatis terakhir</p><p class="tiny muted">${fmtTgl(lastAuto.Tanggal.slice(0, 10))} ${lastAuto.Tanggal.slice(11, 16)}</p></div></div>${badge('Tercatat ke HPP', 'b-green', 'check_circle')}</div>
          <div class="inset white mt-12"><div class="row between"><p class="strong small">${esc(pa ? namaPasien(pa) : lastAuto.Referensi)}</p>${pa ? `<span class="tag-mono gray">${esc(pa.No_RM)}</span>` : ''}</div><p class="tiny c-danger mt-4">${autoGrp.map(m => '● ' + esc((B(m.ID_Bahan) || {}).Nama || '') + ' (-' + m.Qty + ')').join(' ')}</p></div></div>` : ''}
        <div class="row between mb-12"><h2 class="h3">Daftar Inventaris</h2><span class="tiny muted">Menampilkan ${list.length}</span></div>
        <div class="stack">${list.map(x => {
          const i = stokInfo(x);
          return `<div class="card"><div class="row between"><span class="tiny mono muted">${esc(x.Kode)}${x.Lokasi ? ' · ' + esc(x.Lokasi) : ''}</span>${i.kritis ? badge('Kritis / Restock', 'b-red', 'warning') : i.expired ? badge('Kedaluwarsa', 'b-solid-red') : i.hampirExp ? badge('Kedaluwarsa: ' + i.sisaHari + ' hari', 'b-amber', 'schedule') : badge('Aman', 'b-green', 'check')}</div>
            <p class="h3 mt-4 ellipsis">${esc(x.Nama)}</p><p class="tiny muted">${x.Kategori === 'Obat' ? 'Obat farmasi' : 'Bahan habis pakai'} · per ${esc(x.Satuan)}</p>
            <div class="inset mt-12"><div class="row between"><span class="tiny muted">Stok tersedia</span><span><b class="h2 num ${i.kritis ? 'c-danger' : 'c-teal'}">${i.stok}</b> <span class="tiny muted">/ Min. ${i.min} ${esc(x.Satuan)}</span></span></div>
              <div class="progress ${i.kritis ? 'red' : 'teal'} mt-8"><i style="width:${i.pctBar}%"></i></div></div>
            <div class="grid2 mt-12"><div><p class="tiny muted">Harga beli rata-rata</p><p class="strong">${rp(x.Harga_Beli_Rata2)} <span class="tiny muted">/${esc(x.Satuan)}</span></p></div><div><p class="tiny muted">Kedaluwarsa</p><p class="small ${i.hampirExp || i.expired ? 'c-danger strong' : ''}">${x.Tgl_Kadaluarsa ? fmtTgl(x.Tgl_Kadaluarsa) : '-'}</p></div></div>
            <div class="row mt-12"><button class="btn btn-primary btn-sm grow" data-act="mutasi" data-id="${x.ID_Bahan}" data-j="Masuk">${ic('add', 'sm')} Masuk</button><button class="btn btn-secondary btn-sm grow" data-act="mutasi" data-id="${x.ID_Bahan}" data-j="Keluar">${ic('remove', 'sm')} Keluar</button>
              <a class="icon-btn sm outline" href="#/stok/${x.ID_Bahan}" aria-label="Ubah">${ic('more_vert', 'sm')}</a></div></div>`;
        }).join('') || `<div class="card">${emptyState(s.tab === 'kritis' ? 'verified' : 'inventory_2', s.tab === 'kritis' ? 'Tidak ada stok kritis' : 'Belum ada item', s.tab === 'kritis' ? 'Semua stok di atas batas minimum.' : '')}</div>`}</div>
        ${s.tab === 'katalog' ? `<div class="card mt-16"><div class="row between mb-8"><h3 class="h3 row">${ic('history', 'c-primary')} Audit Trail Mutasi (Hari Ini)</h3><button class="link-btn" data-act="csvMutasi">${ic('download', 'sm')} CSV</button></div>
          ${mutHari.length ? mutHari.slice(-6).reverse().map(m => { const b = B(m.ID_Bahan) || {}; const plus = m.Jenis === 'Masuk' || (m.Jenis === 'Koreksi' && num(m.Qty) > 0); return `<div class="list-item"><div class="icon-tile sm ${plus ? 'teal' : 'red'}" style="width:32px;height:32px;border-radius:50%">${ic(plus ? 'add' : 'remove', 'xs')}</div><div class="grow"><p class="small strong ellipsis">${esc(b.Nama || '')} <span class="mono ${plus ? 'c-teal' : 'c-danger'}">${Math.abs(num(m.Qty))} ${esc(b.Satuan || '')}</span></p><p class="tiny muted ellipsis">${esc(m.Catatan || m.Referensi)}</p></div><span class="tiny mono muted">${m.Tanggal.slice(11, 16)}</span></div>`; }).join('') : '<p class="small muted">Belum ada mutasi hari ini.</p>'}</div>` : ''}`;
    }
    return `
    <div class="tabs">${[['katalog', 'Katalog', aktif.length], ['mutasi', 'Riwayat Mutasi', S.mutasi.length], ['kritis', 'Kritis', perhatian.length]].map(([k, n, c]) => `<button class="tab ${s.tab === k ? 'active' : ''}" data-act="tab" data-k="${k}">${n}<span class="n" ${k === 'kritis' && c ? 'style="background:var(--danger-bg);color:var(--danger)"' : ''}>${c}</span></button>`).join('')}</div>
    <div class="grid3 mt-16"><div class="stat"><p class="lbl row between">Total Item ${ic('inventory_2', 'xs')}</p><p class="val">${aktif.length}</p><p class="tiny c-teal">Aktif terdata</p></div>
      <div class="stat ${perhatian.length ? 'danger' : ''}"><p class="lbl row between">Perlu Restock ${ic('warning', 'xs c-danger')}</p><p class="val c-danger">${perhatian.filter(x => x.i.kritis).length}</p><p class="tiny muted">Batas minimum</p></div>
      <div class="stat"><p class="lbl row between">Mutasi Hari Ini ${ic('swap_horiz', 'xs')}</p><p class="val">${mutHari.length}</p><p class="tiny muted">Transaksi log</p></div></div>
    <div class="search mt-12">${ic('search')}<input data-on="cari" placeholder="Cari nama obat, bahan medis, SKU…" value="${esc(s.q)}"></div>
    <div class="mt-16">${body}</div>`;
  },
  bar: () => `<button class="btn btn-secondary" data-act="mutasiManual">${ic('edit_note', 'sm')} Mutasi Manual</button><button class="btn btn-primary grow" data-act="stokMasuk">${ic('input', 'sm')} Catat Stok Masuk</button>`,
  inputs: { cari: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.rerender(); const i = document.querySelector('[data-on=cari]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250) },
  actions: {
    tab: (el, e, ctx) => { ctx.state.tab = el.dataset.k; ctx.rerender(); },
    kat: (el, e, ctx) => { ctx.state.kat = el.dataset.k; ctx.rerender(); },
    mutasi: (el, e, ctx) => mutasiSheet(B(el.dataset.id), el.dataset.j, () => ctx.rerender()),
    mutasiManual: (el, e, ctx) => mutasiSheet(null, 'Keluar', () => ctx.rerender()),
    stokMasuk: (el, e, ctx) => mutasiSheet(null, 'Masuk', () => ctx.rerender()),
    csvMutasi: () => unduhCsv([['ID', 'Tanggal', 'Kode', 'Item', 'Jenis', 'Qty', 'Satuan', 'Harga Satuan', 'Referensi', 'Catatan'], ...S.mutasi.map(m => { const b = B(m.ID_Bahan) || {}; return [m.ID_Mutasi, m.Tanggal, b.Kode, b.Nama, m.Jenis, m.Qty, b.Satuan, m.Harga_Satuan, m.Referensi, m.Catatan]; })], 'mutasi-stok-' + todayStr() + '.csv')
  }
};

Pages.stokForm = {
  nav: null,
  backTo: '#/stok',
  header: ctx => ({ type: 'sub', title: ctx.params[0] ? 'Ubah Item Stok' : 'Item Stok Baru', right: '' }),
  init(ctx) { ctx.dirty = true; },
  render(ctx) {
    const s = ctx.params[0] ? B(ctx.params[0]) : { Kategori: 'BMHP', Aktif: 'Ya' };
    if (!s) return emptyState('inventory_2', 'Item tidak ditemukan');
    const edit = !!ctx.params[0];
    return `<form id="sf" class="stack">
      <div class="card form-card"><h3>${ic('inventory_2')} Informasi Item</h3>
        ${edit ? `<p class="tag-mono gray mb-12" style="display:inline-block">${esc(s.Kode)}</p>` : ''}
        <label class="field"><span class="req">Nama item</span><input name="Nama" value="${esc(s.Nama || '')}" placeholder="Contoh: Kasa Steril 10cm x 10cm"></label>
        <div class="grid2 mt-12"><label class="field"><span>Kategori</span><select name="Kategori">${selOpts([['BMHP', 'Bahan Habis Pakai'], ['Obat', 'Obat Farmasi']], s.Kategori, x => x[1], x => x[0])}</select></label>
          <label class="field"><span>Satuan</span><input name="Satuan" value="${esc(s.Satuan || '')}" placeholder="pcs / tube / vial" list="satuan-l"></label></div>
        <datalist id="satuan-l">${['pcs', 'roll', 'tube', 'vial', 'kapsul', 'tablet', 'strip', 'botol', 'box', 'ampul'].map(x => `<option value="${x}">`).join('')}</datalist>
        <label class="field mt-12"><span>Lokasi penyimpanan</span><input name="Lokasi" value="${esc(s.Lokasi || '')}" placeholder="Contoh: Rak Medis A-02 / Kulkas 2-8°C"></label></div>
      <div class="card form-card"><h3>${ic('sell')} Harga, Batas & Kedaluwarsa</h3>
        <div class="grid2"><label class="field"><span>Harga beli rata-rata</span><input name="Harga_Beli_Rata2" type="number" inputmode="numeric" min="0" value="${esc(s.Harga_Beli_Rata2 || '')}"></label>
          <label class="field"><span>Harga jual ke pasien</span><input name="Harga_Jual" type="number" inputmode="numeric" min="0" value="${esc(s.Harga_Jual || '')}"></label>
          <label class="field"><span>Stok minimum</span><input name="Stok_Minimum" type="number" inputmode="numeric" min="0" value="${esc(s.Stok_Minimum || '')}"></label>
          <label class="field"><span>Tgl kedaluwarsa</span><input name="Tgl_Kadaluarsa" type="date" value="${esc(s.Tgl_Kadaluarsa || '')}"></label></div>
        ${edit ? `<p class="tiny muted mt-12">Stok saat ini: <b>${esc(s.Stok_Saat_Ini)} ${esc(s.Satuan)}</b>. Ubah jumlah stok lewat tombol Masuk/Keluar/Koreksi agar tercatat di audit trail.</p>`
          : `<label class="field mt-12"><span>Stok awal</span><input name="stokAwal" type="number" inputmode="numeric" min="0" placeholder="0"></label>`}
        <label class="check mt-12"><input type="checkbox" name="aktif" ${s.Aktif !== 'Tidak' ? 'checked' : ''}><span class="small">Item aktif</span></label></div></form>
      ${edit ? `<button class="btn btn-secondary btn-block mt-16" data-act="koreksi">${ic('tune', 'sm')} Koreksi Stok (Stock Opname)</button>` : ''}`;
  },
  bar: () => `<button class="btn btn-secondary" data-act="batal">Batal</button><button class="btn btn-primary grow" data-act="simpan">${ic('save', 'sm')} Simpan Item</button>`,
  actions: {
    batal: () => history.back(),
    koreksi: (el, e, ctx) => mutasiSheet(B(ctx.params[0]), 'Koreksi', () => ctx.rerender()),
    simpan: async (el, e, ctx) => {
      const d = formData(document.getElementById('sf'));
      if (!d.Nama) return toast('Nama item wajib diisi.', 'err');
      d.Aktif = d.aktif ? 'Ya' : 'Tidak'; delete d.aktif;
      if (ctx.params[0]) d.ID_Bahan = ctx.params[0];
      const r = await run('saveStok', d, { btn: el });
      if (r.success) { ctx.dirty = false; location.replace('#/stok'); }
    }
  }
};

// ============================================
// KEUANGAN
// ============================================
function trxSheet(t, ctx) {
  const p = P(t.ID_Pasien) || null;
  const masuk = t.Tipe === 'Pemasukan', lunas = t.Status_Bayar === 'Lunas';
  const sisa = num(t.Jumlah) - num(t.Dibayar);
  const pesanTagihan = p ? fillTpl(setting('WA_TPL_TAGIHAN'), { sapaan: p.Sapaan || 'Bapak/Ibu', nama: p.Nama, no_invoice: t.No_Invoice, sisa: rp(sisa), rekening: setting('REKENING_BANK'), klinik: setting('NAMA_KLINIK') }) : '';
  openSheet({
    title: esc(t.No_Invoice || t.ID_Transaksi),
    body: `<div class="row between"><span class="h2 num ${masuk ? 'c-success' : 'c-danger'}">${masuk ? '+' : '-'}${rp(t.Jumlah)}</span>${badge(t.Status_Bayar === 'Belum' ? 'Belum Lunas' : t.Status_Bayar, lunas ? 'b-green' : 'b-amber')}</div>
      <div class="mt-12">${[['Tanggal', fmtTgl(t.Tanggal, 'long') + ' ' + (t.Waktu || '')], ['Tipe', t.Tipe + ' · ' + t.Kategori], ['Deskripsi', t.Deskripsi], ['Pasien', p ? namaPasien(p) + ' (' + p.No_RM + ')' : '-'], ['Metode', t.Metode_Bayar], ['Dibayar', rp(t.Dibayar)], masuk ? ['HPP tercatat', rp(t.HPP_Tercatat)] : null, ['Catatan', t.Catatan || '-']].filter(Boolean).map(([k, v]) => `<div class="kv-row"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`).join('')}</div>
      ${t.Link_Bukti_Bayar ? `<a class="btn btn-secondary btn-block mt-12" href="${esc(t.Link_Bukti_Bayar)}" target="_blank" rel="noopener">${ic('attach_file', 'sm')} Lihat Bukti</a>` : `<button class="btn btn-secondary btn-block mt-12" data-sact="bukti">${ic('upload', 'sm')} Unggah Bukti / Struk</button>`}
      ${masuk ? `<a class="btn btn-secondary btn-block mt-8" href="#/kuitansi/${t.ID_Transaksi}" data-sact="close">${ic('receipt_long', 'sm')} Buka Kuitansi</a>` : ''}
      ${!lunas && p ? `<a class="btn btn-wa btn-block mt-8" href="${waLink(p.No_WA, pesanTagihan)}" target="_blank" rel="noopener">${ic('send', 'sm')} Kirim Tagihan via WA (${rp(sisa)})</a>` : ''}`,
    foot: !lunas ? `<button class="btn btn-primary" data-sact="lunas">${ic('price_check', 'sm')} Tandai Lunas</button>` : '',
    onAction: async (a, b, sh) => {
      if (a === 'lunas') { const r = await run('saveTransaksi', { ID_Transaksi: t.ID_Transaksi, Status_Bayar: 'Lunas' }, { btn: b }); if (r.success) { sh.close(); ctx.rerender(); } }
      if (a === 'bukti') {
        const f = await pilihBerkas();
        if (!f) return;
        try {
          const fd = await readFile(f);
          const up = await run('uploadBerkas', { idPasien: t.ID_Pasien || '', kategori: 'Bukti_Bayar', label: 'Bukti ' + (t.No_Invoice || t.ID_Transaksi), base64: fd.base64, mime: fd.mime }, { btn: b, silent: true });
          if (!up.success) return;
          const r = await run('saveTransaksi', { ID_Transaksi: t.ID_Transaksi, Link_Bukti_Bayar: up.data.url });
          if (r.success) { sh.close(); ctx.rerender(); }
        } catch (err) { toast(err.message, 'err'); }
      }
    }
  });
}
function formTransaksiSheet(ctx) {
  let tipe = 'Pengeluaran';
  const s = openSheet({
    title: 'Catat Transaksi Manual',
    body: `<div class="seg mb-12"><button class="active" data-sact="tipe" data-v="Pengeluaran">Pengeluaran</button><button data-sact="tipe" data-v="Pemasukan">Pemasukan</button></div>
      <label class="field"><span>Deskripsi</span><input id="tf-d" placeholder="Contoh: Bensin & parkir visit (3 lokasi)"></label>
      <div class="grid2 mt-12"><label class="field"><span>Jumlah (Rp)</span><input id="tf-j" type="number" inputmode="numeric" min="0"></label><label class="field"><span>Tanggal</span><input id="tf-t" type="date" value="${todayStr()}"></label></div>
      <div class="grid2 mt-12"><label class="field"><span>Kategori</span><input id="tf-k" list="tf-kl" placeholder="Operasional"></label><label class="field"><span>Metode</span><select id="tf-m">${selOpts(['Tunai', 'Transfer', 'QRIS'], 'Tunai')}</select></label></div>
      <datalist id="tf-kl">${['Operasional', 'Transport Visit', 'Listrik & Internet', 'Sewa', 'Gaji & Honor', 'ATK', 'Pembelian Stok', 'Pemeliharaan Alat', 'Lainnya'].map(x => `<option value="${x}">`).join('')}</datalist>
      <label class="field mt-12"><span>Catatan</span><input id="tf-c"></label>`,
    foot: `<button class="btn btn-primary" data-sact="ok">${ic('save', 'sm')} Simpan</button>`,
    onAction: async (a, b, c) => {
      if (a === 'tipe') { tipe = b.dataset.v; c.el.querySelectorAll('[data-sact=tipe]').forEach(x => x.classList.toggle('active', x === b)); return; }
      if (a !== 'ok') return;
      const g = id => c.el.querySelector(id).value;
      const r = await run('saveTransaksi', { Tipe: tipe, Deskripsi: g('#tf-d'), Jumlah: g('#tf-j'), Tanggal: g('#tf-t'), Kategori: g('#tf-k'), Metode_Bayar: g('#tf-m'), Catatan: g('#tf-c'), Status_Bayar: 'Lunas' }, { btn: b });
      if (r.success) { c.close(); ctx.rerender(); }
    }
  });
  return s;
}
Pages.keuangan = {
  nav: 'keuangan',
  header: () => ({ type: 'main', title: 'Keuangan' }),
  fab: () => null,
  init(ctx) { ctx.state = { ym: monthKey(todayStr()), tab: 'semua', q: '', status: ctx.q.f === 'belum' ? 'belum' : '', metode: '', limit: 20 }; },
  render(ctx) {
    const s = ctx.state;
    const inM = S.transaksi.filter(t => monthKey(t.Tanggal) === s.ym);
    const prevYm = monthKey(addMonths(s.ym + '-01', -1));
    const masuk = inM.filter(t => t.Tipe === 'Pemasukan'), keluar = inM.filter(t => t.Tipe === 'Pengeluaran');
    const omzet = sum(masuk, 'Jumlah'), hpp = sum(masuk, 'HPP_Tercatat'), ops = sum(keluar.filter(t => t.Kategori !== 'Pembelian Stok'), 'Jumlah');
    const prevOmzet = sum(S.transaksi.filter(t => t.Tipe === 'Pemasukan' && monthKey(t.Tanggal) === prevYm), 'Jumlah');
    const laba = omzet - hpp - ops;
    const trend = Array.from({ length: 6 }, (_, i) => { const ym = monthKey(addMonths(s.ym + '-01', i - 5)); return { l: BLN3[Number(ym.slice(5)) - 1], v: sum(S.transaksi.filter(t => t.Tipe === 'Pemasukan' && monthKey(t.Tanggal) === ym), 'Jumlah') }; });
    const naik = prevOmzet ? Math.round((omzet - prevOmzet) / prevOmzet * 100) : null;
    let list = inM.filter(t => s.tab === 'semua' || (s.tab === 'masuk' ? t.Tipe === 'Pemasukan' : t.Tipe === 'Pengeluaran'));
    if (s.status === 'belum') list = list.filter(t => t.Status_Bayar !== 'Lunas');
    if (s.status === 'lunas') list = list.filter(t => t.Status_Bayar === 'Lunas');
    if (s.metode) list = list.filter(t => t.Metode_Bayar === s.metode);
    if (s.q) { const q = s.q.toLowerCase(); list = list.filter(t => (t.No_Invoice + ' ' + t.Deskripsi + ' ' + ((P(t.ID_Pasien) || {}).Nama || '') + ' ' + t.Kategori).toLowerCase().includes(q)); }
    list.sort((a, b) => (b.Tanggal + b.Waktu).localeCompare(a.Tanggal + a.Waktu));
    const nFilter = (s.status ? 1 : 0) + (s.metode ? 1 : 0);
    return `
    <div class="card tight row between"><button class="icon-btn sm" data-act="bulan" data-n="-1" aria-label="Bulan sebelumnya">${ic('chevron_left')}</button>
      <p class="h3 row">${ic('calendar_month', 'c-primary')} ${fmtTgl(s.ym + '-01', 'month')}</p>
      <div class="row">${s.ym !== monthKey(todayStr()) ? `<button class="badge b-blue" data-act="bulanIni" style="border:0;cursor:pointer">Bulan Ini</button>` : ''}<button class="icon-btn sm" data-act="bulan" data-n="1" aria-label="Bulan berikutnya">${ic('chevron_right')}</button></div></div>
    <div class="grid2 mt-12">
      <div class="stat"><div class="row between"><span class="lbl">Total Pemasukan</span><span class="icon-tile sm" style="width:30px;height:30px;border-radius:8px">${ic('south_west', 'xs')}</span></div><p class="val" style="font-size:18px">${rp(omzet)}</p>${naik !== null ? `<p class="tiny ${naik >= 0 ? 'c-success' : 'c-danger'} row">${ic(naik >= 0 ? 'trending_up' : 'trending_down', 'xs')} ${naik >= 0 ? '+' : ''}${naik}% vs ${BLN3[Number(prevYm.slice(5)) - 1]}</p>` : ''}</div>
      <div class="stat"><div class="row between"><span class="lbl">Beban Pokok (HPP)</span><span class="icon-tile sm" style="width:30px;height:30px;border-radius:8px">${ic('medical_services', 'xs')}</span></div><p class="val" style="font-size:18px">${rp(hpp)}</p><p class="tiny muted">${pct(hpp, omzet)} dari omzet</p></div>
      <div class="stat"><div class="row between"><span class="lbl">Operasional Klinik</span><span class="icon-tile sm gray" style="width:30px;height:30px;border-radius:8px">${ic('domain', 'xs')}</span></div><p class="val" style="font-size:18px">${rp(ops)}</p><p class="tiny muted">Di luar pembelian stok</p></div>
      <div class="stat"><div class="row between"><span class="lbl">Laba Bersih Estimasi</span><span class="icon-tile sm teal" style="width:30px;height:30px;border-radius:8px">${ic('query_stats', 'xs')}</span></div><p class="val ${laba >= 0 ? 'c-teal' : 'c-danger'}" style="font-size:18px">${rp(laba)}</p><p class="tiny muted">${pct(laba, omzet)} net margin</p></div>
    </div>
    <div class="card mt-12"><div class="row between top"><div><p class="h3">Tren Pemasukan 6 Bulan</p><p class="tiny muted">${trend[0].l} – ${trend[5].l}</p></div>${badge('Rata-rata: ' + rpShort(trend.reduce((a, b) => a + b.v, 0) / 6), 'b-blue')}</div><div class="mt-8">${lineChart(trend)}</div></div>
    <div class="tabs mt-16">${[['semua', 'Semua Transaksi', inM.length], ['masuk', 'Pemasukan', masuk.length], ['keluar', 'Pengeluaran', keluar.length]].map(([k, n, c]) => `<button class="tab ${s.tab === k ? 'active' : ''}" data-act="tab" data-k="${k}">${n}<span class="n">${c}</span></button>`).join('')}</div>
    <div class="row mt-12"><div class="search grow">${ic('search')}<input data-on="cari" placeholder="Cari no. invoice, pasien, vendor…" value="${esc(s.q)}"></div>
      <button class="btn btn-outline" data-act="filter" style="min-height:52px;border-radius:16px">${ic('tune', 'sm')} Filter${nFilter ? ' (' + nFilter + ')' : ''}</button></div>
    <div class="row between mt-16 mb-8"><p class="h3">Aktivitas Terkini</p><span class="tiny muted">Menampilkan ${Math.min(list.length, s.limit)} dari ${list.length}</span></div>
    <div class="stack-sm">${list.slice(0, s.limit).map(t => {
      const p = P(t.ID_Pasien), masukT = t.Tipe === 'Pemasukan', j = J(t.ID_Kunjungan);
      const st = t.Status_Bayar === 'Lunas' ? badge('Lunas • ' + t.Metode_Bayar, 'b-teal') : badge(t.Status_Bayar === 'DP' ? 'DP' : 'Belum Lunas', 'b-red');
      return `<div class="card tight clickable" data-act="buka" data-id="${t.ID_Transaksi}"><div class="row top gap-12"><div class="icon-tile sm ${masukT ? (j && j.Jenis === 'Visit' ? 'teal' : '') : 'red'}">${ic(masukT ? (j && j.Jenis === 'Visit' ? 'home_health' : 'local_hospital') : t.Kategori === 'Pembelian Stok' ? 'inventory' : 'receipt')}</div>
        <div class="grow"><div class="row between top"><p class="strong ellipsis">${esc(p ? namaPasien(p) : t.Deskripsi)}</p><span class="money nowrap ${masukT ? (t.Status_Bayar === 'Lunas' ? 'c-success' : '') : 'c-danger'}">${masukT ? '+' : '-'}${rp(t.Jumlah)}</span></div>
          <div class="row between"><p class="tiny mono muted">${esc(t.No_Invoice)}</p>${masukT ? st : badge(t.Metode_Bayar, '')}</div>
          <p class="tiny muted ellipsis">${esc(p ? t.Deskripsi : t.Kategori)}</p>
          <div class="row between mt-8"><span class="tiny muted row">${ic('schedule', 'xs')} ${fmtTgl(t.Tanggal, 'dm')} • ${esc(t.Waktu)} WIB</span><span class="tiny strong c-primary">${masukT ? (t.Status_Bayar === 'Lunas' ? 'Kwitansi' : 'Kirim Tagihan') : t.Link_Bukti_Bayar ? 'Bukti Struk' : 'Detail'}</span></div></div></div></div>`;
    }).join('') || `<div class="card">${emptyState('receipt_long', 'Tidak ada transaksi', 'Ubah filter atau bulan.')}</div>`}</div>
    ${list.length > s.limit ? `<button class="btn btn-secondary btn-block mt-12" data-act="more">Tampilkan lebih banyak</button>` : ''}
    <button class="btn btn-primary btn-block mt-16" data-act="manual">${ic('add_circle')} Catat Pengeluaran / Pemasukan Manual</button>
    <button class="link-btn mt-8" style="width:100%;justify-content:center" data-act="csv">${ic('download', 'sm')} Unduh Rekap Bulanan (CSV)</button>`;
  },
  mount: (ctx, el) => pasangTooltipGrafik(el),
  inputs: { cari: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.rerender(); const i = document.querySelector('[data-on=cari]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300) },
  actions: {
    bulan: (el, e, ctx) => { ctx.state.ym = monthKey(addMonths(ctx.state.ym + '-01', Number(el.dataset.n))); ctx.rerender(); },
    bulanIni: (el, e, ctx) => { ctx.state.ym = monthKey(todayStr()); ctx.rerender(); },
    tab: (el, e, ctx) => { ctx.state.tab = el.dataset.k; ctx.rerender(); },
    more: (el, e, ctx) => { ctx.state.limit += 20; ctx.rerender(); },
    buka: (el, e, ctx) => trxSheet(TX(el.dataset.id), ctx),
    manual: (el, e, ctx) => formTransaksiSheet(ctx),
    filter: (el, e, ctx) => openSheet({
      title: 'Filter Transaksi',
      body: `<p class="flabel mb-8">Status bayar</p><div class="chips wrap">${[['', 'Semua'], ['lunas', 'Lunas'], ['belum', 'Belum Lunas / DP']].map(([v, n]) => `<button class="chip ${ctx.state.status === v ? 'active' : ''}" data-sact="status" data-v="${v}">${n}</button>`).join('')}</div>
        <p class="flabel mt-16 mb-8">Metode</p><div class="chips wrap">${['', 'Tunai', 'Transfer', 'QRIS'].map(v => `<button class="chip ${ctx.state.metode === v ? 'active' : ''}" data-sact="metode" data-v="${v}">${v || 'Semua'}</button>`).join('')}</div>`,
      foot: `<button class="btn btn-primary" data-sact="close">Terapkan</button>`,
      onAction: (a, b, sh) => { ctx.state[a] = b.dataset.v; sh.el.querySelectorAll(`[data-sact=${a}]`).forEach(x => x.classList.toggle('active', x === b)); },
      onClose: () => ctx.rerender()
    }),
    csv: (el, e, ctx) => {
      const rows = S.transaksi.filter(t => monthKey(t.Tanggal) === ctx.state.ym).map(t => { const p = P(t.ID_Pasien) || {}; return [t.Tanggal, t.Waktu, t.No_Invoice, t.No_Kuitansi, t.Tipe, t.Kategori, p.Nama || '', p.No_RM || '', t.Deskripsi, t.Metode_Bayar, t.Status_Bayar, t.Subtotal, t.Diskon, t.Jumlah, t.Dibayar, t.HPP_Tercatat]; });
      unduhCsv([['Tanggal', 'Waktu', 'No Invoice', 'No Kuitansi', 'Tipe', 'Kategori', 'Pasien', 'No RM', 'Deskripsi', 'Metode', 'Status', 'Subtotal', 'Diskon', 'Jumlah', 'Dibayar', 'HPP'], ...rows], 'rekap-keuangan-' + ctx.state.ym + '.csv');
    }
  }
};

// ============================================
// LAPORAN & ANALITIK
// ============================================
Pages.laporan = {
  nav: 'menu',
  backTo: '#/menu',
  header: () => ({ type: 'sub', title: 'Laporan & Analitik', sub: 'PERFORMA FINANSIAL & OPERASIONAL' }),
  init(ctx) { const t = todayStr(); ctx.state = { periode: 'bulan', dari: t.slice(0, 8) + '01', sampai: t, lokasi: 'semua', tenaga: '', view: 'visual', status: '', metode: '', q: '' }; },
  range(s) {
    const t = todayStr();
    if (s.periode === 'bulan') return [t.slice(0, 8) + '01', t];
    if (s.periode === 'bulanlalu') { const a = addMonths(t.slice(0, 8) + '01', -1); return [a, addDays(t.slice(0, 8) + '01', -1)]; }
    if (s.periode === '3bulan') return [addMonths(t.slice(0, 8) + '01', -2), t];
    if (s.periode === 'tahun') return [t.slice(0, 4) + '-01-01', t];
    return [s.dari, s.sampai];
  },
  data(ctx) {
    const s = ctx.state, [a, b] = this.range(s);
    const okLok = t => { const j = J(t.ID_Kunjungan); return s.lokasi === 'semua' || (s.lokasi === 'Visit' ? t.Kategori === 'Visit Rumah' : t.Kategori === 'Klinik'); };
    const okTng = t => { if (!s.tenaga) return true; const j = J(t.ID_Kunjungan); return j && j.ID_Tenaga === s.tenaga; };
    const masuk = S.transaksi.filter(t => t.Tipe === 'Pemasukan' && t.Tanggal >= a && t.Tanggal <= b && okLok(t) && okTng(t));
    const keluar = S.transaksi.filter(t => t.Tipe === 'Pengeluaran' && t.Tanggal >= a && t.Tanggal <= b);
    const jad = S.jadwal.filter(j => j.Tanggal >= a && j.Tanggal <= b && (s.lokasi === 'semua' || j.Jenis === s.lokasi) && (!s.tenaga || j.ID_Tenaga === s.tenaga));
    return { a, b, masuk, keluar, jad };
  },
  render(ctx) {
    const s = ctx.state, d = this.data(ctx);
    const per = [['bulan', 'Bulan Ini'], ['bulanlalu', 'Bulan Lalu'], ['3bulan', '3 Bulan'], ['tahun', 'Tahun Ini'], ['custom', 'Pilih Tanggal']];
    return `
    <p class="small muted">Rentang: <b>${fmtTgl(d.a)} – ${fmtTgl(d.b)}</b> (${daysBetween(d.a, d.b) + 1} hari)</p>
    <div class="chips mt-12">${per.map(([k, n]) => `<button class="chip sm ${s.periode === k ? 'active' : ''}" data-act="periode" data-k="${k}">${n}</button>`).join('')}</div>
    ${s.periode === 'custom' ? `<div class="grid2 mt-12"><label class="field"><span>Dari</span><input type="date" data-on="tgl" data-k="dari" value="${s.dari}"></label><label class="field"><span>Sampai</span><input type="date" data-on="tgl" data-k="sampai" value="${s.sampai}"></label></div>` : ''}
    <div class="chips mt-8">${[['semua', 'Semua Layanan', 'tune'], ['Klinik', 'Klinik', 'local_hospital'], ['Visit', 'Visit Rumah', 'home']].map(([k, n, i]) => `<button class="chip sm soft ${s.lokasi === k ? 'active' : ''}" data-act="lokasi" data-k="${k}">${ic(i, 'xs')}${n}</button>`).join('')}
      <select class="chip sm" data-on="tenaga" style="padding-right:24px">${'<option value="">Semua DPJP</option>' + selOpts(S.tenaga, s.tenaga, t => t.Nama, t => t.ID_Tenaga)}</select></div>
    <div class="seg light mt-12"><button class="${s.view === 'visual' ? 'active' : ''}" data-act="view" data-k="visual">${ic('bar_chart', 'sm')} Visual Grafik</button><button class="${s.view === 'tabel' ? 'active' : ''}" data-act="view" data-k="tabel">${ic('table_chart', 'sm')} Tabel Transaksi</button></div>
    <div class="print-only"><h2>${esc(setting('NAMA_KLINIK'))} — Laporan ${fmtTgl(d.a)} s.d. ${fmtTgl(d.b)}</h2></div>
    <div class="mt-16">${s.view === 'visual' ? this.visual(ctx, d) : this.tabel(ctx, d)}</div>`;
  },
  visual(ctx, d) {
    const omzet = sum(d.masuk, 'Jumlah'), hpp = sum(d.masuk, 'HPP_Tercatat'), lk = omzet - hpp;
    const ops = sum(d.keluar.filter(t => t.Kategori !== 'Pembelian Stok'), 'Jumlah');
    const len = daysBetween(d.a, d.b) + 1, pa = addDays(d.a, -len), pb = addDays(d.a, -1);
    const prev = sum(S.transaksi.filter(t => t.Tipe === 'Pemasukan' && t.Tanggal >= pa && t.Tanggal <= pb), 'Jumlah');
    const mom = prev ? (omzet - prev) / prev * 100 : null;
    const mMin = num(setting('MARGIN_MIN', 30)), mg = omzet ? lk / omzet * 100 : 0;
    const kl = d.masuk.filter(t => t.Kategori === 'Klinik'), vs = d.masuk.filter(t => t.Kategori === 'Visit Rumah');
    const lay = {};
    d.masuk.forEach(t => { let it = []; try { it = JSON.parse(t.Item_JSON || '[]'); } catch (e) { it = []; } it.filter(i => i.tipe === 'tindakan').forEach(i => { lay[i.nama] = lay[i.nama] || { n: 0, v: 0 }; lay[i.nama].n += num(i.qty); lay[i.nama].v += num(i.qty) * num(i.harga); }); });
    const top = Object.entries(lay).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
    const maxN = top.length ? top[0][1].n : 1, totalSesi = Object.values(lay).reduce((a, x) => a + x.n, 0);
    const topRev = Object.entries(lay).sort((a, b) => b[1].v - a[1].v)[0];
    const t = todayStr();
    const bulan = Array.from({ length: 6 }, (_, i) => { const ym = monthKey(addMonths(t.slice(0, 8) + '01', i - 5)); const m = S.transaksi.filter(x => x.Tipe === 'Pemasukan' && monthKey(x.Tanggal) === ym); return { l: BLN3[Number(ym.slice(5)) - 1], o: sum(m, 'Jumlah'), lk: sum(m, 'Jumlah') - sum(m, 'HPP_Tercatat') }; });
    const selesai = d.jad.filter(j => j.Status === 'Selesai').length, batal = d.jad.filter(j => ['Batal', 'Tidak Hadir'].includes(j.Status)).length;
    const lunasPct = d.masuk.length ? d.masuk.filter(x => x.Status_Bayar === 'Lunas').length / d.masuk.length * 100 : 0;
    return `
    <div class="card"><div class="row between"><p class="eyebrow gray">Rekonsiliasi Keuangan</p>${badge(d.a.slice(0, 7) === d.b.slice(0, 7) ? fmtTgl(d.a, 'month') : 'Periode terpilih', 'b-teal')}</div>
      <p class="h3 mt-4">Pemasukan vs HPP vs Laba Kotor</p>
      <div class="inset mt-12"><p class="tiny muted">Total omzet bruto</p><div class="row between"><p class="h1 c-primary num">${rp(omzet)}</p>${mom !== null ? `<span class="small strong ${mom >= 0 ? 'c-success' : 'c-danger'} row">${ic(mom >= 0 ? 'trending_up' : 'trending_down', 'sm')}${mom >= 0 ? '+' : ''}${mom.toFixed(1).replace('.', ',')}%</span>` : ''}</div>${mom !== null ? '<p class="tiny muted">vs periode sebelumnya dengan panjang sama</p>' : ''}</div>
      <div class="row between mt-16 tiny"><span class="strong">Komposisi finansial</span><span class="muted">100% omzet</span></div>
      <div class="split-bar mt-8">${omzet ? `<i style="width:${hpp / omzet * 100}%;background:${CH.blue}" title="HPP"></i><i style="width:${Math.max(0, lk) / omzet * 100}%;background:${CH.teal}" title="Laba kotor"></i>` : '<i style="width:100%;background:var(--surface-c)"></i>'}</div>
      <div class="grid2 mt-12"><div class="inset"><p class="tiny row"><i style="width:10px;height:10px;border-radius:3px;background:${CH.blue};display:inline-block"></i> Beban HPP (${pct(hpp, omzet)})</p><p class="money mt-4">${rp(hpp)}</p><p class="tiny muted">BMHP, obat & jasa</p></div>
        <div class="inset"><p class="tiny row"><i style="width:10px;height:10px;border-radius:3px;background:${CH.teal};display:inline-block"></i> Laba kotor (${pct(lk, omzet)})</p><p class="money mt-4">${rp(lk)}</p><p class="tiny muted">Margin klinik bersih</p></div></div>
      <div class="alert ${mg >= mMin ? 'alert-green' : 'alert-red'} mt-12">${ic(mg >= mMin ? 'verified' : 'warning', 'sm')}<span>Rasio margin ${mg.toFixed(1).replace('.', ',')}% ${mg >= mMin ? 'di atas' : 'di bawah'} ambang minimum ${mMin}%.</span></div>
      <div class="kv-row mt-8"><span class="k">Pengeluaran operasional</span><span class="v">${rp(ops)}</span></div>
      <div class="kv-row total"><span class="k">Laba bersih estimasi</span><span class="v ${lk - ops >= 0 ? 'c-success' : 'c-danger'}">${rp(lk - ops)}</span></div></div>

    <div class="card mt-12"><p class="eyebrow gray">Distribusi Pelayanan</p><p class="h3 mt-4">Kunjungan: Klinik vs Home Visit</p>
      <div class="row gap-16 mt-12">${donut([{ n: 'Klinik', v: kl.length, c: CH.blue }, { n: 'Home Visit', v: vs.length, c: CH.teal }], String(kl.length + vs.length), 'Pasien')}
        <div class="grow stack-sm"><p class="small row between"><span class="row"><i style="width:10px;height:10px;border-radius:50%;background:${CH.blue};display:inline-block"></i> Klinik tatap muka</span><b>${pct(kl.length, kl.length + vs.length, 0)} (${kl.length})</b></p>
          <p class="small row between"><span class="row"><i style="width:10px;height:10px;border-radius:50%;background:${CH.teal};display:inline-block"></i> Home visit</span><b>${pct(vs.length, kl.length + vs.length, 0)} (${vs.length})</b></p></div></div>
      <div class="grid2 mt-12"><div class="inset"><p class="tiny muted">Rata-rata pendapatan / pasien klinik</p><p class="money">${rp(kl.length ? sum(kl, 'Jumlah') / kl.length : 0)}</p></div><div class="inset"><p class="tiny muted">Rata-rata pendapatan / pasien visit</p><p class="money">${rp(vs.length ? sum(vs, 'Jumlah') / vs.length : 0)}</p></div></div></div>

    <div class="card mt-12"><div class="row between"><div><p class="eyebrow gray">Peringkat Prosedur</p><p class="h3 mt-4">Layanan Paling Diminati</p></div><span class="tag-mono gray">${totalSesi} sesi</span></div>
      <div class="mt-16">${top.length ? top.map(([n, x], i) => `<div class="hbar"><span class="small strong ellipsis">${i + 1}. ${esc(n)}</span><span class="tiny mono muted nowrap">${x.n} sesi · ${rpShort(x.v)}</span><div class="track"><i style="width:${x.n / maxN * 100}%;${i % 2 ? 'background:' + CH.teal : ''}"></i></div></div>`).join('') : '<p class="small muted">Belum ada data tindakan.</p>'}</div>
      ${topRev ? `<div class="inset tiny mt-4">Kontribusi pendapatan terbesar: <b class="c-primary">${esc(topRev[0])}</b> (${pct(topRev[1].v, omzet)})</div>` : ''}</div>

    <div class="card mt-12"><p class="eyebrow gray">Tren 6 Bulan</p><p class="h3 mt-4">Pemasukan vs Laba Kotor per Bulan</p><div class="mt-12">${barsChart(bulan, [{ k: 'o', n: 'Pemasukan', c: CH.blue }, { k: 'lk', n: 'Laba kotor', c: CH.teal }])}</div></div>

    <p class="eyebrow gray mt-24 mb-8">Indikator Operasional (KPI)</p>
    <div class="grid3"><div class="stat center"><div class="icon-tile sm teal" style="margin:0 auto">${ic('task_alt')}</div><p class="val">${selesai}</p><p class="tiny muted">Kunjungan selesai</p></div>
      <div class="stat center"><div class="icon-tile sm ${batal ? 'amber' : ''}" style="margin:0 auto">${ic('event_busy')}</div><p class="val">${pct(batal, d.jad.length, 0)}</p><p class="tiny muted">Batal / tidak hadir</p></div>
      <div class="stat center"><div class="icon-tile sm" style="margin:0 auto">${ic('price_check')}</div><p class="val">${lunasPct.toFixed(0)}%</p><p class="tiny muted">Tagihan lunas</p></div></div>`;
  },
  tabelRows(ctx, d) {
    const s = ctx.state;
    let rows = d.masuk.concat(d.keluar).filter(t => (!s.status || (s.status === 'lunas' ? t.Status_Bayar === 'Lunas' : t.Status_Bayar !== 'Lunas')) && (!s.metode || t.Metode_Bayar === s.metode));
    if (s.q) { const q = s.q.toLowerCase(); rows = rows.filter(t => (t.No_Invoice + ' ' + t.Deskripsi + ' ' + ((P(t.ID_Pasien) || {}).Nama || '')).toLowerCase().includes(q)); }
    return rows.sort((a, b) => (a.Tanggal + a.Waktu).localeCompare(b.Tanggal + b.Waktu));
  },
  tabel(ctx, d) {
    const s = ctx.state, rows = this.tabelRows(ctx, d);
    const m = rows.filter(t => t.Tipe === 'Pemasukan'), k = rows.filter(t => t.Tipe === 'Pengeluaran');
    return `<div class="row wrap">${[['', 'Semua status'], ['lunas', 'Lunas'], ['belum', 'Belum/DP']].map(([v, n]) => `<button class="chip sm ${s.status === v ? 'active' : ''}" data-act="tf" data-f="status" data-v="${v}">${n}</button>`).join('')}
      ${['', 'Tunai', 'Transfer', 'QRIS'].map(v => `<button class="chip sm soft ${s.metode === v ? 'active' : ''}" data-act="tf" data-f="metode" data-v="${v}">${v || 'Semua metode'}</button>`).join('')}</div>
      <div class="search mt-12">${ic('search')}<input data-on="cari" placeholder="Cari invoice, pasien, deskripsi…" value="${esc(s.q)}"></div>
      <div class="table-wrap mt-12"><table class="tbl"><thead><tr><th>Tanggal</th><th>No. Invoice</th><th>Pasien / Deskripsi</th><th>Lokasi</th><th>Metode</th><th>Status</th><th class="r">Jumlah</th><th class="r">HPP</th></tr></thead>
        <tbody>${rows.map(t => { const p = P(t.ID_Pasien); return `<tr><td>${fmtTgl(t.Tanggal, 'dm')}</td><td class="mono">${esc(t.No_Invoice)}</td><td>${esc(p ? p.Nama : t.Deskripsi)}</td><td>${esc(t.Kategori)}</td><td>${esc(t.Metode_Bayar)}</td><td>${esc(t.Status_Bayar)}</td><td class="r ${t.Tipe === 'Pengeluaran' ? 'c-danger' : ''}">${t.Tipe === 'Pengeluaran' ? '-' : ''}${rp(t.Jumlah)}</td><td class="r">${t.Tipe === 'Pemasukan' ? rp(t.HPP_Tercatat) : '-'}</td></tr>`; }).join('') || '<tr><td colspan="8" class="center muted">Tidak ada data</td></tr>'}</tbody>
        <tfoot><tr><td colspan="6">Total pemasukan (${m.length})</td><td class="r">${rp(sum(m, 'Jumlah'))}</td><td class="r">${rp(sum(m, 'HPP_Tercatat'))}</td></tr><tr><td colspan="6">Total pengeluaran (${k.length})</td><td class="r c-danger">-${rp(sum(k, 'Jumlah'))}</td><td></td></tr></tfoot></table></div>`;
  },
  bar: () => `<button class="btn btn-secondary" data-act="csv">${ic('csv', 'sm')} Ekspor CSV</button><button class="btn btn-primary grow" data-act="pdf">${ic('picture_as_pdf', 'sm')} Unduh Laporan (PDF)</button>`,
  inputs: {
    tgl: (el, e, ctx) => { if (e.type === 'change') { ctx.state[el.dataset.k] = el.value; ctx.rerender(); } },
    tenaga: (el, e, ctx) => { if (e.type === 'change') { ctx.state.tenaga = el.value; ctx.rerender(); } },
    cari: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.rerender(); const i = document.querySelector('[data-on=cari]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300)
  },
  actions: {
    periode: (el, e, ctx) => { ctx.state.periode = el.dataset.k; ctx.rerender(); },
    lokasi: (el, e, ctx) => { ctx.state.lokasi = el.dataset.k; ctx.rerender(); },
    view: (el, e, ctx) => { ctx.state.view = el.dataset.k; ctx.rerender(); },
    tf: (el, e, ctx) => { ctx.state[el.dataset.f] = el.dataset.v; ctx.rerender(); },
    pdf: () => { toast('Pilih "Simpan sebagai PDF" di dialog cetak.', 'info'); setTimeout(() => window.print(), 400); },
    csv: (el, e, ctx) => {
      const d = Pages.laporan.data(ctx), rows = Pages.laporan.tabelRows(ctx, d);
      unduhCsv([['Tanggal', 'No Invoice', 'Tipe', 'Pasien', 'No RM', 'Deskripsi', 'Lokasi/Kategori', 'Metode', 'Status', 'Jumlah', 'HPP', 'Laba Kotor'], ...rows.map(t => { const p = P(t.ID_Pasien) || {}; return [t.Tanggal, t.No_Invoice, t.Tipe, p.Nama || '', p.No_RM || '', t.Deskripsi, t.Kategori, t.Metode_Bayar, t.Status_Bayar, t.Jumlah, t.HPP_Tercatat, t.Tipe === 'Pemasukan' ? num(t.Jumlah) - num(t.HPP_Tercatat) : '']; })], `laporan-${d.a}_${d.b}.csv`);
    }
  }
};

// ============================================
// TENAGA MEDIS
// ============================================
Pages.tenaga = {
  nav: 'menu',
  backTo: '#/menu',
  header: () => ({ type: 'sub', title: 'Tenaga Medis' }),
  fab: () => ({ href: '#/tenaga/baru', icon: 'person_add', label: 'Tambah tenaga medis' }),
  init(ctx) { ctx.state = { q: '', peran: 'Semua' }; },
  render(ctx) {
    const s = ctx.state, t = todayStr();
    const perans = ['Semua', 'Dokter', 'Terapis', 'Perawat'];
    const list = S.tenaga.filter(x => (s.peran === 'Semua' || x.Peran === s.peran) && (!s.q || (x.Nama + ' ' + x.No_SIP + ' ' + x.Spesialisasi).toLowerCase().includes(s.q.toLowerCase())));
    const aktif = S.tenaga.filter(x => x.Status !== 'Nonaktif');
    const bertugas = new Set(S.jadwal.filter(j => j.Tanggal === t && isAktifJadwal(j)).map(j => j.ID_Tenaga));
    return `
    <div class="search">${ic('search')}<input data-on="cari" placeholder="Cari nama, SIP, atau spesialisasi…" value="${esc(s.q)}"></div>
    <div class="chips mt-12">${perans.map(p => `<button class="chip ${s.peran === p ? 'active' : ''}" data-act="peran" data-k="${p}">${p === 'Dokter' ? 'Dokter Spesialis' : p === 'Terapis' ? 'Fisioterapis' : p} (${p === 'Semua' ? S.tenaga.length : S.tenaga.filter(x => x.Peran === p).length})</button>`).join('')}</div>
    <div class="card tint mt-12 row gap-12"><div class="icon-tile teal">${ic('verified_user')}</div><div><p class="eyebrow" style="color:var(--teal-ink)">● Kapasitas klinis siap</p><p class="h3">${aktif.length} Tenaga Aktif · ${bertugas.size} Bertugas Hari Ini</p><p class="tiny c-primary row">${ic('sync', 'xs')} Terkoordinasi dengan jadwal & Google Calendar</p></div></div>
    <div class="stack mt-16">${list.map(x => `
      <div class="card ${x.Status === 'Nonaktif' ? '' : ''}" style="${x.Status === 'Nonaktif' ? 'opacity:.65' : ''}">
        <div class="row top gap-12">${avatar(x.Nama, x.ID_Tenaga, 'lg')}<div class="grow"><p class="h3">${esc(x.Nama)}</p><div class="mt-4">${badge(x.Peran + (x.Spesialisasi ? ' · ' + x.Spesialisasi.split(/[,&]/)[0].trim() : ''), 'b-blue')}</div></div>
          <label class="toggle" aria-label="Status aktif"><input type="checkbox" data-on="aktif" data-id="${x.ID_Tenaga}" ${x.Status !== 'Nonaktif' ? 'checked' : ''}><span></span></label></div>
        <div class="inset mt-12">${x.No_SIP ? `<div class="kv-row"><span class="k row">${ic('badge', 'xs')} SIP</span><span class="v mono">${esc(x.No_SIP)}</span></div>` : ''}${x.No_STR ? `<div class="kv-row"><span class="k row">${ic('verified', 'xs')} STR</span><span class="v mono">${esc(x.No_STR)}</span></div>` : ''}${!x.No_SIP && !x.No_STR ? '<p class="tiny muted">SIP/STR belum diisi</p>' : ''}</div>
        <div class="grid2 mt-12">${x.Jadwal_Praktik ? `<div class="inset"><p class="tiny muted row">${ic('calendar_month', 'xs')} Jadwal praktik</p><p class="small strong">${esc(x.Jadwal_Praktik)}</p></div>` : ''}${x.Cakupan ? `<div class="inset"><p class="tiny muted row">${ic('medical_services', 'xs')} Cakupan layanan</p><p class="small strong">${esc(x.Cakupan)}</p></div>` : ''}</div>
        <div class="row between mt-12"><div><p class="tiny muted row">${ic('payments', 'xs')} Skema honor</p><p class="small strong">${esc(x.Skema_Honor || '-')}</p></div>
          <div class="row">${x.No_WA ? `<a class="btn btn-sm btn-wa" href="${waLink(x.No_WA, '')}" target="_blank" rel="noopener">${ic('chat', 'sm')} WhatsApp</a>` : ''}<a class="btn btn-sm btn-secondary" href="#/tenaga/${x.ID_Tenaga}">Ubah</a></div></div>
      </div>`).join('') || `<div class="card">${emptyState('badge', 'Belum ada tenaga medis')}</div>`}</div>
    <div class="card tint mt-16 row top gap-12">${ic('hub', 'c-primary')}<div><p class="strong">Sinkronisasi jadwal & biaya terpadu</p><p class="small muted">Tenaga aktif muncul di pilihan jadwal; honor per tindakan masuk ke komponen jasa medis HPP layanan.</p></div></div>`;
  },
  inputs: {
    cari: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.rerender(); const i = document.querySelector('[data-on=cari]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250),
    aktif: async (el, e, ctx) => {
      if (e.type !== 'change') return;
      const r = await run('saveTenaga', Object.assign({}, T(el.dataset.id), { Status: el.checked ? 'Aktif' : 'Nonaktif' }));
      if (!r.success) el.checked = !el.checked; else ctx.rerender();
    }
  },
  actions: { peran: (el, e, ctx) => { ctx.state.peran = el.dataset.k; ctx.rerender(); } }
};

Pages.tenagaForm = {
  nav: null,
  backTo: '#/tenaga',
  header: ctx => ({ type: 'sub', title: ctx.params[0] ? 'Ubah Tenaga Medis' : 'Tambah Tenaga Medis', right: '' }),
  init(ctx) { ctx.dirty = true; },
  render(ctx) {
    const x = ctx.params[0] ? T(ctx.params[0]) : { Peran: 'Dokter', Status: 'Aktif' };
    if (!x) return emptyState('badge', 'Data tidak ditemukan');
    const f = (k, l, ph = '', cls = '') => `<label class="field ${cls}"><span>${l}</span><input name="${k}" value="${esc(x[k] || '')}" placeholder="${esc(ph)}"></label>`;
    return `<form id="tf" class="stack"><div class="card form-card"><h3>${ic('badge')} Identitas & Peran</h3>
      ${f('Nama', 'Nama lengkap & gelar', 'dr. Nama, Sp.OT')}
      <div class="grid2 mt-12"><label class="field"><span>Peran</span><select name="Peran">${selOpts(['Dokter', 'Terapis', 'Perawat', 'Lainnya'], x.Peran)}</select></label>${f('No_WA', 'No. WhatsApp', '0812...')}</div>
      <div class="mt-12">${f('Spesialisasi', 'Spesialisasi / kompetensi', 'Rehabilitasi lutut & bahu')}</div></div>
      <div class="card form-card"><h3>${ic('verified')} Legalitas</h3><div class="grid2">${f('No_STR', 'No. STR')}${f('No_SIP', 'No. SIP / SIPF')}</div></div>
      <div class="card form-card"><h3>${ic('calendar_month')} Jadwal & Honor</h3>${f('Jadwal_Praktik', 'Jadwal praktik', 'Senin - Jumat 09:00 - 16:00')}
        <div class="mt-12">${f('Cakupan', 'Cakupan layanan', 'Klinik & Visit Rumah')}</div><div class="mt-12">${f('Skema_Honor', 'Skema honor', 'Fee jasa medis per tindakan')}</div>
        <label class="check mt-12"><input type="checkbox" name="aktif" ${x.Status !== 'Nonaktif' ? 'checked' : ''}><span class="small">Aktif (muncul di pilihan jadwal)</span></label></div></form>`;
  },
  bar: () => `<button class="btn btn-secondary" data-act="batal">Batal</button><button class="btn btn-primary grow" data-act="simpan">${ic('save', 'sm')} Simpan</button>`,
  actions: {
    batal: () => history.back(),
    simpan: async (el, e, ctx) => {
      const d = formData(document.getElementById('tf'));
      if (!d.Nama) return toast('Nama wajib diisi.', 'err');
      d.Status = d.aktif ? 'Aktif' : 'Nonaktif'; delete d.aktif;
      if (ctx.params[0]) d.ID_Tenaga = ctx.params[0];
      const r = await run('saveTenaga', d, { btn: el });
      if (r.success) { ctx.dirty = false; location.replace('#/tenaga'); }
    }
  }
};

// ============================================
// PENGATURAN
// ============================================
Pages.pengaturan = {
  nav: null,
  backTo: '#/menu',
  header: () => ({ type: 'sub', title: 'Pengaturan' }),
  init(ctx) { ctx.dirty = true; ctx.state = { logo: null, qris: null }; },
  mount(ctx) { if (ctx.q.s) { const el = document.getElementById('sec-' + ctx.q.s); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50); } },
  render(ctx) {
    const g = k => esc(setting(k));
    const f = (k, l, opt = {}) => `<label class="field ${opt.cls || ''}"><span>${l}</span><input name="${k}" value="${g(k)}" ${opt.type ? `type="${opt.type}"` : ''} ${opt.mono ? 'class="mono"' : ''} placeholder="${esc(opt.ph || '')}"></label>`;
    const tpl = [['WA_TPL_REMINDER', '1. Pengingat Jadwal Kunjungan', '{sapaan} {nama} {layanan} {lokasi} {tanggal} {jam} {klinik}'], ['WA_TPL_KUITANSI', '2. Pengiriman e-Receipt Kuitansi', '{no_kwitansi} {total_bayar} {link}'], ['WA_TPL_EDUKASI', '3. Edukasi Pasca Tindakan & Kontrol', '{layanan} {tanggal_kontrol}'], ['WA_TPL_SURAT', '4. Pengiriman Surat Keterangan', '{link}'], ['WA_TPL_TAGIHAN', '5. Pengingat Tagihan', '{no_invoice} {sisa} {rekening}']];
    const logo = ctx.state.logo ? ctx.state.logo.dataUrl : S.aset.logo;
    const qris = ctx.state.qris ? ctx.state.qris.dataUrl : S.aset.qris;
    return `
    <div class="card tight row between"><span class="row small"><span class="sync-dot"></span> <b>Sistem operasional stabil</b></span><span class="tag-mono gray">v${esc(APP_CONFIG.APP_VERSION)}</span></div>
    <form id="pg" class="stack mt-12">
      <div class="card form-card"><div class="row between"><h3>${ic('add_box')} Profil & Identitas Klinik</h3><span class="eyebrow gray">MASTER DATA</span></div>
        <div class="inset row gap-12"><div class="avatar lg square" style="overflow:hidden;background:#fff;border:1px solid var(--border)">${logo ? `<img src="${logo}" alt="" style="width:100%;height:100%;object-fit:contain">` : ic('local_hospital', 'c-primary')}</div>
          <div class="grow"><p class="strong">${g('NAMA_KLINIK')}</p><button class="link-btn" data-act="upload" data-k="logo">${ic('photo_camera', 'sm')} Ubah Logo</button></div></div>
        <div class="stack-sm mt-12">${f('NAMA_KLINIK', 'Nama klinik')}${f('SUBJUDUL_KLINIK', 'Subjudul / layanan')}
          <label class="field"><span>Alamat fasilitas <em>dipakai menghitung jarak visit</em></span><textarea name="ALAMAT_KLINIK" rows="2">${g('ALAMAT_KLINIK')}</textarea></label>
          <div class="grid2">${f('TELEPON_KLINIK', 'Telepon kantor', { mono: 1 })}${f('WA_KLINIK', 'WhatsApp resmi', { mono: 1 })}</div>
          ${f('NO_IZIN', 'No. izin / SIP klinik', { mono: 1 })}
          <div class="grid2">${f('NAMA_ADMIN', 'Nama admin')}${f('EMAIL_ADMIN', 'Email (label)')}</div></div></div>

      <div class="card form-card"><div class="row between"><h3>${ic('tune')} Operasional & Ambang Batas</h3><span class="eyebrow gray">GUARDRAILS</span></div>
        <div class="grid2">${f('JAM_BUKA', 'Jam buka', { type: 'time' })}${f('JAM_TUTUP', 'Jam tutup', { type: 'time' })}</div>
        <div class="grid2 mt-12">${f('HARI_OPERASIONAL', 'Hari operasional')}${f('SLOT_MENIT', 'Interval slot (menit)', { type: 'number' })}</div>
        <div class="grid2 mt-12">${f('MARGIN_MIN', 'Margin minimum HPP (%)', { type: 'number' })}${f('EXPIRED_HARI', 'Peringatan kedaluwarsa (H-)', { type: 'number' })}</div>
        <p class="tiny muted mt-8">Sistem memberi peringatan bila margin layanan di bawah ambang ini.</p>
        <div class="mt-12">${f('BIAYA_ADMIN', 'Biaya administrasi default kasir (Rp)', { type: 'number' })}</div></div>

      <div class="card form-card"><h3>${ic('qr_code_2')} Pembayaran</h3>
        ${f('REKENING_BANK', 'Info rekening transfer')}
        <div class="grid2 mt-12">${f('QRIS_NMID', 'NMID QRIS', { mono: 1 })}<div class="field"><span>Gambar QRIS</span><button class="btn btn-secondary btn-sm" data-act="upload" data-k="qris" style="min-height:48px">${ic('upload', 'sm')} ${qris ? 'Ganti' : 'Unggah'}</button></div></div>
        ${qris ? `<img src="${qris}" alt="QRIS" style="max-width:160px;margin-top:12px;border-radius:12px">` : ''}</div>

      <div class="card form-card" id="sec-wa"><div class="row between"><h3>${ic('chat')} Template WhatsApp 1-Klik</h3>${badge(tpl.length + ' Aktif', 'b-teal')}</div>
        ${tpl.map(([k, n, ph]) => `<label class="field mt-12"><span>${n}</span><textarea name="${k}" rows="3" class="small">${g(k)}</textarea></label><p class="tiny muted mt-4 mono">${ph}</p>`).join('')}</div>

      <div class="card form-card" id="sec-pdp"><div class="row between"><h3>${ic('shield', 'c-danger')} Keamanan Data & PDP</h3><span class="eyebrow gray">UU NO. 27/2022</span></div>
        <div class="inset row gap-12"><div class="icon-tile sm">${ic('admin_panel_settings')}</div><div><p class="strong small">Akses API terlindungi kata sandi</p><p class="tiny muted">Token sesi 6 jam · Apps Script "Execute as Me"</p></div></div>
        <div class="inset row gap-12 mt-8"><div class="icon-tile sm teal">${ic('folder_managed')}</div><div><p class="strong small">Berkas Google Drive privat</p><p class="tiny muted">Direktori rekam medis tanpa akses publik</p></div></div>
        <div class="row between mt-12"><div><p class="strong small">Tautan sementara via WA</p><p class="tiny muted">Link PDF 24 jam lalu dicabut otomatis. Nonaktif = unduh & lampirkan manual.</p></div>
          <label class="toggle"><input type="checkbox" name="mode_tautan" ${setting('MODE_KIRIM_PDF') === 'tautan' ? 'checked' : ''}><span></span></label></div>
        <button class="btn btn-block mt-12" style="background:var(--danger-bg);color:var(--danger)" data-act="cabutSemua">${ic('link_off', 'sm')} Cabut Seluruh Akses Tautan Publik Drive</button>
        <button class="btn btn-secondary btn-block mt-8" data-act="password">${ic('key', 'sm')} Ganti Kata Sandi Admin</button></div>

      <div class="card form-card" id="sec-backup"><div class="row between"><h3>${ic('backup')} Cadangan Data & Sinkronisasi</h3><span class="eyebrow gray">STORAGE</span></div>
        <div class="grid2"><div class="inset"><p class="tiny muted">Google Sheets DB</p><p class="small strong row c-teal">${ic('check_circle', 'xs')} Real-time</p></div><div class="inset"><p class="tiny muted">Cadangan snapshot</p><p class="small strong">${S.sistem.jumlahBackup || 0} salinan terakhir</p></div></div>
        <div class="inset row between mt-8"><div><p class="tiny muted">Waktu backup terakhir</p><p class="small strong">${S.sistem.lastBackup ? fmtTgl(S.sistem.lastBackup.slice(0, 10), 'full') + ', ' + S.sistem.lastBackup.slice(11, 16) : 'Belum pernah'}</p></div>${badge('Otomatis tiap Senin', 'b-blue')}</div>
        <button class="btn btn-secondary btn-block mt-12" data-act="backup">${ic('save', 'sm')} Cadangkan Database Sekarang</button></div>
    </form>`;
  },
  bar: () => `<button class="btn btn-primary grow" data-act="simpan">${ic('check', 'sm')} Simpan Pengaturan</button>`,
  actions: {
    upload: async (el, e, ctx) => {
      const f = await pilihBerkas({ accept: 'image/png,image/jpeg,image/webp' });
      if (!f) return;
      try { ctx.state[el.dataset.k] = await readFile(f, 600); ctx.rerender(); toast('Gambar siap — tekan Simpan Pengaturan.', 'info'); } catch (err) { toast(err.message, 'err'); }
    },
    simpan: async (el, e, ctx) => {
      const d = formData(document.getElementById('pg'));
      d.MODE_KIRIM_PDF = d.mode_tautan ? 'tautan' : 'manual'; delete d.mode_tautan;
      const payload = { nilai: d };
      ['logo', 'qris'].forEach(k => { if (ctx.state[k]) payload[k] = { base64: ctx.state[k].base64, mime: ctx.state[k].mime }; });
      const r = await run('savePengaturan', payload, { btn: el, loadingText: ' Menyimpan…' });
      if (r.success) { S.pengaturan = r.data.pengaturan; S.aset = r.data.aset; saveSnapshot(); ctx.state.logo = ctx.state.qris = null; ctx.rerender(); }
    },
    cabutSemua: async el => { if (await confirmSheet({ title: 'Cabut semua tautan publik?', message: 'Semua PDF kuitansi & surat yang pernah dibagikan menjadi privat kembali. Pasien tidak bisa lagi membuka tautan lama.', okText: 'Cabut Semua', danger: true })) run('cabutSemuaTautan', {}, { btn: el }); },
    backup: async (el, e, ctx) => { const r = await run('backupSekarang', {}, { btn: el, loadingText: ' Mencadangkan…' }); if (r.success) { S.sistem.lastBackup = r.data.waktu; S.sistem.jumlahBackup = r.data.jumlah; saveSnapshot(); ctx.rerender(); } },
    password: () => openSheet({
      title: 'Ganti Kata Sandi',
      body: `<label class="field"><span>Kata sandi lama</span><input type="password" id="pw-l" autocomplete="current-password"></label>
        <label class="field mt-12"><span>Kata sandi baru <em>min. 8 karakter</em></span><input type="password" id="pw-b" autocomplete="new-password"></label>
        <label class="field mt-12"><span>Ulangi kata sandi baru</span><input type="password" id="pw-u" autocomplete="new-password"></label>`,
      foot: `<button class="btn btn-primary" data-sact="ok">Simpan Kata Sandi</button>`,
      onAction: async (a, b, sh) => {
        if (a !== 'ok') return;
        const g = id => sh.el.querySelector(id).value;
        if (g('#pw-b') !== g('#pw-u')) return toast('Ulangan kata sandi tidak sama.', 'err');
        const r = await run('gantiPassword', { lama: g('#pw-l'), baru: g('#pw-b') }, { btn: b });
        if (r.success) sh.close();
      }
    })
  }
};

// ============================================
// LOG AUDIT
// ============================================
Pages.log = {
  nav: null,
  backTo: '#/menu',
  header: () => ({ type: 'sub', title: 'Log Audit Aktivitas' }),
  init(ctx) { ctx.state = { rows: null, q: '' }; },
  mount(ctx) {
    if (ctx.state.rows) return;
    API.call('getLog', { limit: 200 }).then(r => { ctx.state.rows = r.success ? r.data : []; if (!r.success) toast(r.message, 'err'); if (App.ctx === ctx) ctx.rerender(); });
  },
  render(ctx) {
    const s = ctx.state;
    if (!s.rows) return skeleton(5);
    const icon = { TAMBAH: 'add_circle', UBAH: 'edit', LOGIN: 'login', SELESAI: 'task_alt', PDF: 'picture_as_pdf', MUTASI: 'swap_vert', ARSIP: 'archive', STATUS: 'sync_alt', CABUT: 'link_off', BACKUP: 'backup', UNGGAH: 'upload' };
    const rows = s.rows.filter(r => !s.q || (r.Aksi + r.Modul + r.ID_Data + r.Ringkasan).toLowerCase().includes(s.q.toLowerCase()));
    return `<p class="small muted mb-12">200 aktivitas terakhir — jejak audit akses & perubahan data medis (UU PDP).</p>
      <div class="search mb-12">${ic('search')}<input data-on="cari" placeholder="Cari aksi, modul, atau ID…" value="${esc(s.q)}"></div>
      <div class="card" style="padding:4px 16px">${rows.map(r => `<div class="list-item"><div class="icon-tile sm gray" style="width:36px;height:36px">${ic(icon[r.Aksi] || 'history', 'sm')}</div>
        <div class="grow"><p class="small"><b>${esc(r.Aksi)}</b> · ${esc(r.Modul)} <span class="tiny mono muted">${esc(r.ID_Data)}</span></p><p class="tiny muted clamp2">${esc(r.Ringkasan)}</p></div>
        <span class="tiny mono muted nowrap">${fmtTgl(r.Timestamp.slice(0, 10), 'dm')}<br>${r.Timestamp.slice(11, 16)}</span></div>`).join('') || emptyState('history', 'Tidak ada log')}</div>`;
  },
  inputs: { cari: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.rerender(); const i = document.querySelector('[data-on=cari]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250) }
};
