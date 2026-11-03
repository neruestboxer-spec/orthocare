/**
 * HALAMAN UTAMA — Beranda, Jadwal, Form Jadwal (stepper), Detail Kunjungan
 */

// ---------- Komponen bersama: kartu jadwal ----------
function kartuJadwal(j, { showDate = false } = {}) {
  const p = P(j.ID_Pasien) || {}, l = L(j.ID_Layanan) || {}, t = T(j.ID_Tenaga) || {};
  const st = jadwalStatus(j), visit = j.Jenis === 'Visit';
  const trx = j.Status === 'Selesai' ? trxKunjungan(j.ID_Kunjungan) : null;
  let actions = '';
  if (j.Status === 'Terjadwal') {
    actions = `<a class="btn btn-secondary" href="${waLink(p.No_WA, pesanReminder(j))}" target="_blank" rel="noopener" data-act="reminder" data-id="${j.ID_Kunjungan}">${ic('chat')}Ingatkan WA</a>` +
      (visit
        ? `<a class="btn btn-teal" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(j.Alamat_Visit)}" target="_blank" rel="noopener" data-act="mulaiVisit" data-id="${j.ID_Kunjungan}">${ic('directions_car')}Mulai Visit</a>`
        : `<button class="btn btn-primary" data-act="selesaikan" data-id="${j.ID_Kunjungan}">${ic('check_circle')}Selesaikan</button>`);
  } else if (trx) {
    actions = `<button class="btn btn-secondary" data-act="kuitansi" data-id="${trx.ID_Transaksi}">${ic('receipt_long')}Kuitansi</button>
      <button class="btn btn-outline" data-act="buka" data-id="${j.ID_Kunjungan}">${ic('info')}Detail</button>`;
  }
  return `<div class="card appt clickable ${visit ? 'accent-teal' : 'accent-blue'}" data-act="buka" data-id="${j.ID_Kunjungan}">
    <div class="row between wrap">
      <div class="row"><span class="time">${esc(j.Jam_Mulai)} - ${esc(j.Jam_Selesai)}</span>${badge(visit ? 'Visit Rumah' : 'Klinik', visit ? 'b-teal' : 'b-blue', visit ? 'home' : '')}</div>
      ${badge(st.label, st.cls)}
    </div>
    ${showDate ? `<p class="tiny muted mt-4">${fmtTgl(j.Tanggal, 'long')}</p>` : ''}
    <div class="row top mt-12 gap-12">
      ${avatar(p.Nama, p.ID_Pasien)}
      <div class="grow">
        <div class="row between"><span class="who ellipsis">${esc(namaPasien(p))}</span><span class="tiny muted nowrap">${umur(p.Tgl_Lahir)} Th</span></div>
        <div class="tiny mono muted mt-4">No. RM: ${esc(p.No_RM)}</div>
        <div class="mt-4">${esc(l.Nama_Layanan || '-')}</div>
        <div class="row tiny muted mt-4">${ic('stethoscope', 'xs')}<span class="ellipsis">${esc(t.Nama || '-')}</span></div>
      </div>
    </div>
    ${visit ? `<div class="addr-box">${ic('location_on', 'sm c-danger')}<span class="small grow ellipsis">${esc(j.Alamat_Visit)}</span>${j.Jarak_Km ? `<span class="tiny mono c-primary nowrap">${esc(j.Jarak_Km)} km</span>` : ''}</div>` : ''}
    ${actions ? `<div class="actions">${actions}</div>` : ''}
  </div>`;
}

const jadwalActions = {
  buka: el => go('#/kunjungan/' + el.dataset.id),
  selesaikan: el => go('#/tindakan/' + el.dataset.id),
  kuitansi: el => go('#/kuitansi/' + el.dataset.id),
  mulaiVisit: el => setTimeout(() => go('#/kunjungan/' + el.dataset.id), 300),
  reminder: (el, e, ctx) => {
    API.call('tandaiReminder', { id: el.dataset.id }).then(r => { if (r.success) { applyDelta(r.delta); ctx.rerender(); } });
  }
};

// ============================================
// BERANDA
// ============================================
Pages.beranda = {
  nav: 'beranda',
  header: () => ({ type: 'main', title: 'Beranda' }),
  fab: () => ({ href: '#/jadwal/baru', label: 'Jadwal baru' }),
  render() {
    const t = todayStr(), kemarin = addDays(t, -1), besok = addDays(t, 1), bln = monthKey(t);
    const hariIni = jadwalPada(t).filter(isAktifJadwal);
    const klinik = hariIni.filter(j => j.Jenis !== 'Visit').length;
    const masuk = d => sum(S.transaksi.filter(x => x.Tipe === 'Pemasukan' && x.Tanggal === d), 'Jumlah');
    const mHari = masuk(t), mKemarin = masuk(kemarin);
    const naik = mKemarin ? Math.round((mHari - mKemarin) / mKemarin * 100) : 0;
    const pasienBaru = S.pasien.filter(p => String(p.Dibuat_Pada).slice(0, 7) === bln).length;
    const perhatian = stokPerhatian();
    const reminder = S.jadwal.filter(j => j.Tanggal === besok && j.Status === 'Terjadwal' && j.Reminder_Terkirim !== 'Ya').sort((a, b) => a.Jam_Mulai.localeCompare(b.Jam_Mulai));
    const jam = nowHM();
    const buka = jam >= setting('JAM_BUKA', '08:30') && jam < setting('JAM_TUTUP', '17:30');
    const shift = jam < '12:00' ? 'SHIFT PAGI' : jam < '15:00' ? 'SHIFT SIANG' : 'SHIFT SORE';
    const belumLunas = S.transaksi.filter(x => x.Tipe === 'Pemasukan' && x.Status_Bayar !== 'Lunas');
    const nextVisit = hariIni.find(j => j.Jenis === 'Visit' && j.Status === 'Terjadwal' && j.Jam_Mulai >= jam);
    let tip = 'Pastikan lembar informed-consent dan BMHP sudah disiapkan sebelum sesi pertama.';
    if (nextVisit) tip = `Visit berikutnya pukul ${nextVisit.Jam_Mulai} ke ${(nextVisit.Alamat_Visit || '').split(',')[0]}. Siapkan kit visit & BMHP sebelum berangkat.`;
    else if (belumLunas.length) tip = `${belumLunas.length} tagihan belum lunas. Kirim pengingat tagihan dari menu Keuangan.`;
    else if (reminder.length) tip = `${reminder.length} pasien besok belum diingatkan — kirim lewat tombol "Kirim Semua".`;

    return `
    <div class="hero">
      <div class="row between top">
        <p class="eyebrow"><span class="sync-dot" style="background:${buka ? '#5EEAD4' : '#FCA5A5'}"></span> ${buka ? 'KLINIK BUKA' : 'KLINIK TUTUP'} • ${shift}</p>
        <button class="pill-glass" data-act="refresh" style="cursor:pointer">${ic('sync', 'xs')} Sinkron</button>
      </div>
      <h1 class="h1 mt-8" style="position:relative;z-index:1">Halo, ${esc(setting('NAMA_ADMIN', 'Admin'))}</h1>
      <p style="opacity:.9;position:relative;z-index:1">${fmtTgl(t, 'long')}</p>
    </div>

    <a class="card row gap-12 mt-16" href="#/jadwal" style="color:inherit">
      <div class="icon-tile">${ic('calendar_month')}</div>
      <div class="grow"><p class="small">Kunjungan Hari Ini</p><p><span class="h2 num">${hariIni.length}</span> <span class="small">Pasien</span></p>
        <p class="tiny mono c-primary">${klinik} Klinik · <span class="c-teal">${hariIni.length - klinik} Visit</span></p></div>
      <div class="icon-btn soft">${ic('chevron_right')}</div>
    </a>
    <a class="card row gap-12 mt-12" href="#/keuangan" style="color:inherit">
      <div class="icon-tile teal">${ic('account_balance_wallet')}</div>
      <div class="grow"><div class="row"><p class="small">Pemasukan Hari Ini</p>${mKemarin ? badge((naik >= 0 ? '+' : '') + naik + '%', naik >= 0 ? 'b-green' : 'b-red') : ''}</div>
        <p class="h2 num">${rp(mHari)}</p><p class="tiny muted">vs ${rp(mKemarin)} kemarin</p></div>
      <div class="icon-btn soft">${ic('arrow_forward')}</div>
    </a>
    <div class="grid2 mt-12">
      <a class="stat" href="#/pasien" style="color:inherit"><div class="row between"><span class="lbl">Pasien Baru (Bln Ini)</span>${ic('person_add', 'sm c-primary')}</div>
        <div class="val">${pasienBaru}<small>Pasien</small></div><p class="tiny c-primary mt-4">${S.pasien.filter(p => p.Status !== 'Arsip').length} pasien aktif total</p></a>
      <a class="stat ${perhatian.length ? 'danger' : ''}" href="#/stok?tab=kritis" style="color:inherit"><div class="row between"><span class="lbl">Stok Perlu Perhatian</span>${ic('inventory_2', 'sm c-danger')}</div>
        <div class="val">${perhatian.length}<small>Item</small></div>${perhatian.length ? badge('Perlu Aksi', 'b-red') : badge('Aman', 'b-green')}</a>
    </div>

    <div class="sec-head"><h2>Jadwal Hari Ini <span class="count">${hariIni.length}</span></h2><a class="link-btn" href="#/jadwal">Lihat Semua ${ic('chevron_right', 'sm')}</a></div>
    <div class="stack">${hariIni.length ? hariIni.map(j => kartuJadwal(j)).join('') : `<div class="card">${emptyState('event_available', 'Belum ada jadwal hari ini', 'Tekan tombol + untuk membuat jadwal baru.')}</div>`}</div>

    ${reminder.length ? `
    <div class="sec-head"><h2>Perlu Diingatkan Besok <span class="count">${reminder.length}</span></h2><button class="link-btn" data-act="kirimSemua">${ic('send', 'sm')} Kirim Semua</button></div>
    <div class="card" style="padding:4px 16px">${reminder.map(j => {
      const p = P(j.ID_Pasien) || {}, l = L(j.ID_Layanan) || {};
      return `<div class="list-item">${avatar(p.Nama, p.ID_Pasien, 'sm')}<div class="grow"><p class="strong ellipsis">${esc(namaPasien(p))}</p>
        <p class="tiny"><span class="mono c-primary">${j.Jam_Mulai} WIB</span> <span class="muted">• ${esc(l.Nama_Layanan || '')}</span></p></div>
        <a class="btn btn-sm btn-wa-soft" href="${waLink(p.No_WA, pesanReminder(j))}" target="_blank" rel="noopener" data-act="reminder" data-id="${j.ID_Kunjungan}">${ic('chat', 'sm')}Kirim WA</a></div>`;
    }).join('')}</div>` : ''}

    <div class="sec-head"><h2>Peringatan Inventaris ${ic('notification_important', 'sm c-danger')}</h2><a class="link-btn" href="#/stok">Kelola</a></div>
    <div class="stack-sm">${perhatian.length ? perhatian.slice(0, 5).map(({ s, i }) => `
      <a class="card tight row gap-12" href="#/stok?tab=kritis" style="color:inherit">
        <div class="icon-tile sm ${i.kritis ? '' : 'red'}">${ic(s.Kategori === 'Obat' ? 'medication' : 'medical_services')}</div>
        <div class="grow"><p class="strong ellipsis">${esc(s.Nama)}</p>
          <p class="tiny mono ${i.kritis ? 'c-danger' : 'c-danger'}">${i.kritis ? `Sisa: ${i.stok} ${esc(s.Satuan)} <span class="muted">(Min: ${i.min})</span>` : i.expired ? 'Sudah kedaluwarsa' : `Kedaluwarsa ${i.sisaHari} hari`}</p></div>
        ${i.kritis ? badge('Stok Menipis', 'b-red') : badge('Segera Pakai', 'b-solid-red')}
      </a>`).join('') : `<div class="card tight row gap-12"><div class="icon-tile sm teal">${ic('verified')}</div><p class="small">Semua stok aman & belum mendekati kedaluwarsa.</p></div>`}</div>

    <div class="card tint row top gap-12 mt-24">${ic('lightbulb', 'c-primary')}<div><p class="strong">Tips Operasional Hari Ini</p><p class="small muted mt-4">${esc(tip)}</p></div></div>`;
  },
  actions: Object.assign({}, jadwalActions, {
    refresh: async (el) => { el.innerHTML = '<span class="spinner sm"></span>'; const ok = await App.refresh(true); if (ok) toast('Data tersinkron.'); },
    kirimSemua: (el, e, ctx) => {
      const besok = addDays(todayStr(), 1);
      const list = S.jadwal.filter(j => j.Tanggal === besok && j.Status === 'Terjadwal' && j.Reminder_Terkirim !== 'Ya');
      openSheet({
        title: 'Kirim Pengingat Besok',
        body: `<p class="small muted mb-12">WhatsApp hanya bisa dibuka satu per satu. Ketuk "Kirim" untuk tiap pasien — status otomatis tertandai.</p>` +
          list.map(j => { const p = P(j.ID_Pasien) || {}; return `<div class="list-item"><div class="grow"><p class="strong">${esc(namaPasien(p))}</p><p class="tiny mono muted">${j.Jam_Mulai} · ${esc(fmtWa(p.No_WA))}</p></div>
            <a class="btn btn-sm btn-wa" href="${waLink(p.No_WA, pesanReminder(j))}" target="_blank" rel="noopener" data-sact="kirim" data-id="${j.ID_Kunjungan}">${ic('send', 'sm')}Kirim</a></div>`; }).join(''),
        onAction: (a, b) => {
          if (a !== 'kirim') return;
          b.classList.replace('btn-wa', 'btn-wa-soft'); b.innerHTML = ic('done_all', 'sm') + 'Terkirim';
          API.call('tandaiReminder', { id: b.dataset.id }).then(r => r.success && applyDelta(r.delta));
        },
        onClose: () => ctx.rerender()
      });
    }
  })
};

// ============================================
// JADWAL
// ============================================
Pages.jadwal = {
  nav: 'jadwal',
  header: () => ({ type: 'main', title: 'Jadwal' }),
  fab: ctx => ({ href: '#/jadwal/baru?' + qs({ tgl: ctx.state.tgl >= todayStr() ? ctx.state.tgl : '' }), label: 'Jadwal baru' }),
  init(ctx) {
    ctx.state = { tab: ctx.q.tab || 'mendatang', tgl: ctx.q.tgl || todayStr(), filter: 'semua', mode: ctx.q.mode || 'hari', minggu: ctx.q.tgl || todayStr() };
  },
  render(ctx) {
    const s = ctx.state, t = todayStr();
    const statusOf = { mendatang: j => j.Status === 'Terjadwal', selesai: j => j.Status === 'Selesai', batal: j => ['Batal', 'Tidak Hadir'].includes(j.Status) };
    const filt = j => s.filter === 'semua' || (s.filter === 'visit' ? j.Jenis === 'Visit' : j.Jenis !== 'Visit');

    let range;
    if (s.mode === 'hari') range = [s.tgl];
    else if (s.mode === 'minggu') { const st = addDays(s.tgl, -((dow(s.tgl) + 6) % 7)); range = Array.from({ length: 7 }, (_, i) => addDays(st, i)); }
    else { const st = s.tgl.slice(0, 8) + '01'; const n = daysBetween(st, addMonths(st, 1)); range = Array.from({ length: n }, (_, i) => addDays(st, i)); }
    const inRange = S.jadwal.filter(j => range.includes(j.Tanggal));
    const cnt = k => inRange.filter(statusOf[k]).length;
    const list = inRange.filter(statusOf[s.tab]);
    const shown = list.filter(filt).sort((a, b) => (a.Tanggal + a.Jam_Mulai).localeCompare(b.Tanggal + b.Jam_Mulai));

    const startStrip = addDays(s.minggu, -3);
    const strip = Array.from({ length: 7 }, (_, i) => addDays(startStrip, i)).map(d => {
      const has = S.jadwal.some(j => j.Tanggal === d && isAktifJadwal(j));
      return `<button class="day ${d === s.tgl ? 'active' : ''} ${d === t ? 'today' : ''}" data-act="pilihTgl" data-tgl="${d}"><div class="d1">${HARI3[dow(d)]}</div><div class="d2 num">${parseYmd(d).d}</div>${has ? '<i class="dot"></i>' : ''}</button>`;
    }).join('');

    let body;
    if (s.mode === 'bulan' && s.tab === 'mendatang') {
      body = kalenderBulan(s.tgl, d => S.jadwal.filter(j => j.Tanggal === d && j.Status === 'Terjadwal' && filt(j)).length, 'pilihTglHari');
      body = `<div class="card mt-12">${body}</div>` + (shown.length ? `<p class="small muted mt-16 mb-8">${shown.length} jadwal mendatang bulan ini</p><div class="stack">${shown.map(j => kartuJadwal(j, { showDate: true })).join('')}</div>` : '');
    } else if (!shown.length) {
      body = `<div class="card mt-12">${emptyState(s.tab === 'mendatang' ? 'event_available' : s.tab === 'selesai' ? 'task_alt' : 'event_busy', s.tab === 'mendatang' ? 'Tidak ada jadwal mendatang' : s.tab === 'selesai' ? 'Belum ada kunjungan selesai' : 'Tidak ada jadwal batal', 'Periode: ' + (s.mode === 'hari' ? fmtTgl(s.tgl, 'long') : s.mode === 'minggu' ? 'minggu ini' : fmtTgl(s.tgl, 'month')))}</div>`;
    } else if (s.mode === 'hari') {
      body = `<div class="stack mt-12">${shown.map(j => kartuJadwal(j)).join('')}</div>`;
    } else {
      const byDay = {};
      shown.forEach(j => { (byDay[j.Tanggal] = byDay[j.Tanggal] || []).push(j); });
      body = Object.keys(byDay).sort().map(d => `<p class="strong mt-16 mb-8">${fmtTgl(d, 'long')} <span class="count">${byDay[d].length}</span></p><div class="stack">${byDay[d].map(j => kartuJadwal(j)).join('')}</div>`).join('');
    }

    return `
    <div class="row between">
      <div class="tabs grow">
        ${['mendatang', 'selesai', 'batal'].map(k => `<button class="tab ${s.tab === k ? 'active' : ''}" data-act="tab" data-k="${k}">${k[0].toUpperCase() + k.slice(1)}<span class="n">${cnt(k)}</span></button>`).join('')}
      </div>
      ${S.sistem.calendarId ? `<a class="badge b-teal" href="https://calendar.google.com/calendar/r/day/${s.tgl.replace(/-/g, '/')}" target="_blank" rel="noopener" style="padding:6px 10px">${ic('sync')}Google Cal</a>` : ''}
    </div>
    <div class="seg light mt-16">${['hari', 'minggu', 'bulan'].map(m => `<button class="${s.mode === m ? 'active' : ''}" data-act="mode" data-m="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
    <div class="row between mt-16">
      <h2 class="h3 row">${ic('calendar_month', 'c-primary')} ${fmtTgl(s.mode === 'hari' ? s.minggu : s.tgl, 'month')}</h2>
      <div class="row"><button class="icon-btn outline sm" data-act="geser" data-n="-1" aria-label="Sebelumnya">${ic('chevron_left')}</button>
        <button class="icon-btn outline sm" data-act="geser" data-n="1" aria-label="Berikutnya">${ic('chevron_right')}</button></div>
    </div>
    ${s.mode !== 'bulan' ? `<div class="date-strip mt-12">${strip}</div>` : ''}
    ${s.tgl !== t ? `<button class="link-btn mt-8" data-act="pilihTgl" data-tgl="${t}">${ic('today', 'sm')} Kembali ke hari ini</button>` : ''}
    <div class="chips mt-12">
      ${[['semua', 'Semua'], ['klinik', 'Klinik'], ['visit', 'Visit Rumah']].map(([k, lbl]) => `<button class="chip ${s.filter === k ? 'active' : ''}" data-act="filter" data-k="${k}">${lbl} (${list.filter(j => k === 'semua' || (k === 'visit' ? j.Jenis === 'Visit' : j.Jenis !== 'Visit')).length})</button>`).join('')}
    </div>
    ${body}`;
  },
  actions: Object.assign({}, jadwalActions, {
    tab: (el, e, ctx) => { ctx.state.tab = el.dataset.k; ctx.rerender(); },
    mode: (el, e, ctx) => { ctx.state.mode = el.dataset.m; ctx.rerender(); },
    filter: (el, e, ctx) => { ctx.state.filter = el.dataset.k; ctx.rerender(); },
    pilihTgl: (el, e, ctx) => { ctx.state.tgl = el.dataset.tgl; if (el.dataset.tgl === todayStr() || ctx.state.mode !== 'hari') ctx.state.minggu = el.dataset.tgl; ctx.rerender(); },
    pilihTglHari: (el, e, ctx) => { ctx.state.tgl = ctx.state.minggu = el.dataset.tgl; ctx.state.mode = 'hari'; ctx.rerender(); },
    geser: (el, e, ctx) => {
      const n = Number(el.dataset.n), s = ctx.state;
      if (s.mode === 'bulan') { s.tgl = s.minggu = addMonths(s.tgl, n); }
      else { s.minggu = addDays(s.minggu, 7 * n); s.tgl = s.mode === 'minggu' ? addDays(s.tgl, 7 * n) : s.minggu; }
      ctx.rerender();
    }
  })
};

/** Kalender bulan (grid). countFn(tgl) → angka kecil; act = nama action klik */
function kalenderBulan(tgl, countFn, act, opt = {}) {
  const first = tgl.slice(0, 8) + '01';
  const start = addDays(first, -dow(first));
  const t = todayStr();
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    if (i >= 35 && d.slice(0, 7) !== first.slice(0, 7)) break;
    const out = d.slice(0, 7) !== first.slice(0, 7);
    const c = countFn ? countFn(d) : 0;
    const disabled = opt.minDate && d < opt.minDate;
    cells += `<button class="${out ? 'out' : ''} ${dow(d) === 0 ? 'sun' : ''} ${d === (opt.selected || tgl) ? 'active' : ''} ${d === t ? 'today' : ''}" data-act="${act}" data-tgl="${d}" ${disabled ? 'disabled' : ''}>${parseYmd(d).d}${c ? `<span class="cnt">${c}</span>` : ''}</button>`;
  }
  return `<div class="cal-grid">${HARI3.map((h, i) => `<div class="wd ${i === 0 ? 'sun' : ''}">${h}</div>`).join('')}${cells}</div>`;
}

// ============================================
// FORM JADWAL (Stepper: Pasien → Layanan → Waktu → Review)
// ============================================
Pages.jadwalForm = {
  nav: null,
  backTo: '#/jadwal',
  header: ctx => ({ type: 'sub', title: ctx.params[0] ? 'Ubah Jadwal' : 'Jadwal Baru' }),
  init(ctx) {
    ctx.dirty = true;
    const lama = ctx.params[0] ? J(ctx.params[0]) : null;
    const tenagaAktif = S.tenaga.filter(t => t.Status !== 'Nonaktif');
    ctx.state = lama ? {
      step: 3, edit: lama.ID_Kunjungan, ID_Pasien: lama.ID_Pasien, Jenis: lama.Jenis, ID_Layanan: lama.ID_Layanan, ID_Tenaga: lama.ID_Tenaga,
      Tanggal: lama.Tanggal, Jam_Mulai: lama.Jam_Mulai, Alamat_Visit: lama.Alamat_Visit, Catatan_Lokasi: lama.Catatan_Lokasi, Catatan: lama.Catatan, syncCalendar: true, q: ''
    } : {
      step: ctx.q.pasien ? 2 : 1, ID_Pasien: ctx.q.pasien || '', Jenis: ctx.q.jenis === 'Visit' ? 'Visit' : 'Klinik', ID_Layanan: '',
      ID_Tenaga: tenagaAktif.length === 1 ? tenagaAktif[0].ID_Tenaga : '', Tanggal: ctx.q.tgl && ctx.q.tgl >= todayStr() ? ctx.q.tgl : todayStr(),
      Jam_Mulai: '', Alamat_Visit: '', Catatan_Lokasi: '', Catatan: ctx.q.catatan || '', syncCalendar: true, q: ''
    };
    if (!lama && ctx.q.pasien) this.isiAlamat(ctx.state);
  },
  isiAlamat(s) { const p = P(s.ID_Pasien); if (p) { s.Alamat_Visit = s.Alamat_Visit || p.Alamat; s.Catatan_Lokasi = s.Catatan_Lokasi || p.Catatan_Alamat_Visit; } },
  render(ctx) {
    const s = ctx.state;
    const steps = ['Pasien', 'Layanan', 'Waktu', 'Review'];
    const stepper = `<div class="stepper card tight mb-12">${steps.map((n, i) => `<div class="st ${i + 1 < s.step ? 'done' : i + 1 === s.step ? 'cur' : ''}"><div class="dot">${i + 1 < s.step ? ic('check', 'sm') : i + 1}</div>${n}</div>`).join('')}</div>`;
    return stepper + this['step' + s.step](ctx);
  },
  ringkas(s) {
    const p = P(s.ID_Pasien) || {}, l = L(s.ID_Layanan), t = T(s.ID_Tenaga);
    return `<div class="card stack-sm">
      <div class="row between"><p class="h3 row">${ic('person', 'c-primary')} <span class="ellipsis">${esc(namaPasien(p))}</span> <span class="small muted nowrap">(${umur(p.Tgl_Lahir)} Th)</span></p><span class="tag-mono gray">${esc(p.No_RM)}</span></div>
      ${l ? `<div class="row small">${badge(s.Jenis === 'Visit' ? 'Visit Rumah' : 'Klinik', s.Jenis === 'Visit' ? 'b-teal' : 'b-blue', s.Jenis === 'Visit' ? 'home' : 'local_hospital')}<span class="ellipsis">${esc(l.Nama_Layanan)}</span></div>` : ''}
      ${t ? `<p class="row small">${ic('medical_services', 'sm c-primary')} Tenaga: <b>${esc(t.Nama)}</b></p>` : ''}
    </div>`;
  },
  daftarPasien(q) {
    const f = S.pasien.filter(p => p.Status !== 'Arsip' && (!q || (p.Nama + ' ' + p.No_RM + ' ' + p.No_WA).toLowerCase().includes(q.toLowerCase()))).slice(0, 40);
    return f.length ? f.map(p => `<div class="card tight row gap-12 clickable mb-8" data-act="pilihPasien" data-id="${p.ID_Pasien}">${avatar(p.Nama, p.ID_Pasien, 'sm')}
      <div class="grow"><p class="strong ellipsis">${esc(namaPasien(p))}</p><p class="tiny muted"><span class="mono">${esc(p.No_RM)}</span> · ${umur(p.Tgl_Lahir)} th · ${esc(p.Jenis_Kelamin || '')}</p></div>${ic('chevron_right', 'faint')}</div>`).join('')
      : emptyState('person_search', 'Pasien tidak ditemukan', 'Daftarkan sebagai pasien baru.');
  },
  step1(ctx) {
    return `<h2 class="h2 mb-12">Pilih Pasien</h2>
      <div class="search">${ic('search')}<input data-on="cariPasien" placeholder="Cari nama, No. RM, atau No. WA" value="${esc(ctx.state.q)}"></div>
      <a class="card tight row gap-12 mt-12" href="#/pasien/baru?next=jadwal" style="border-style:dashed">${ic('person_add', 'c-primary')}<span class="strong c-primary">Daftarkan pasien baru</span></a>
      <div id="pk" class="mt-12">${this.daftarPasien(ctx.state.q)}</div>`;
  },
  step2(ctx) {
    const s = ctx.state;
    const lyn = S.layanan.filter(l => l.Aktif !== 'Tidak' && lokasiOk(l, s.Jenis));
    const tng = S.tenaga.filter(t => t.Status !== 'Nonaktif');
    return this.ringkas(s) + `
      <h3 class="h3 mt-16 mb-8">Jenis Kunjungan</h3>
      <div class="seg"><button class="${s.Jenis === 'Klinik' ? 'active' : ''}" data-act="jenis" data-v="Klinik">${ic('local_hospital', 'sm')}Di Klinik</button><button class="${s.Jenis === 'Visit' ? 'active' : ''}" data-act="jenis" data-v="Visit">${ic('home', 'sm')}Visit Rumah</button></div>
      <h3 class="h3 mt-24 mb-8">Layanan</h3>
      <div class="stack-sm">${lyn.length ? lyn.map(l => `<label class="radio-card ${s.ID_Layanan === l.ID_Layanan ? 'active' : ''}" data-act="layanan" data-id="${l.ID_Layanan}">
        <div class="icon-tile sm ${s.Jenis === 'Visit' ? 'teal' : ''}">${ic(l.Kategori === 'Terapi' ? 'accessibility_new' : l.Kategori === 'Kontrol' ? 'stethoscope' : 'healing')}</div>
        <div class="grow"><p class="strong">${esc(l.Nama_Layanan)}</p><p class="tiny muted">${esc(l.Durasi_Menit)} menit · <span class="strong c-primary">${rp(tarif(l, s.Jenis))}</span></p></div>
        <input type="radio" name="lyn" ${s.ID_Layanan === l.ID_Layanan ? 'checked' : ''} tabindex="-1"></label>`).join('') : emptyState('medical_services', 'Belum ada layanan untuk ' + (s.Jenis === 'Visit' ? 'visit rumah' : 'klinik'), '', '<a class="btn btn-secondary btn-sm" href="#/layanan/baru">Tambah layanan</a>')}</div>
      <h3 class="h3 mt-24 mb-8">Tenaga Medis</h3>
      <div class="chips wrap">${tng.map(t => `<button class="chip ${s.ID_Tenaga === t.ID_Tenaga ? 'active' : ''}" data-act="tenaga" data-id="${t.ID_Tenaga}">${ic('stethoscope', 'sm')}${esc(t.Nama)}</button>`).join('') || '<p class="small muted">Belum ada tenaga medis aktif. <a href="#/tenaga/baru">Tambah</a></p>'}</div>`;
  },
  step3(ctx) {
    const s = ctx.state, l = L(s.ID_Layanan);
    const dur = num(l && l.Durasi_Menit) || 30;
    const slots = hitungSlot(s.Tanggal, s.ID_Tenaga, dur, s.edit);
    const visitLain = s.Jenis === 'Visit' ? S.jadwal.filter(j => j.Tanggal === s.Tanggal && j.Jenis === 'Visit' && isAktifJadwal(j) && j.ID_Kunjungan !== s.edit) : [];
    slots.forEach(sl => { sl.near = visitLain.some(v => Math.abs(hmToMin(v.Jam_Mulai) - hmToMin(sl.jam)) <= 90 && v.Jam_Mulai !== sl.jam); });
    const slotBtn = sl => `<button class="slot ${sl.taken ? 'taken' : ''} ${s.Jam_Mulai === sl.jam ? 'active' : ''} ${sl.near && !sl.taken ? 'near' : ''}" data-act="slot" data-jam="${sl.jam}" ${sl.taken ? 'disabled' : ''}>${sl.jam}</button>`;
    const pagi = slots.filter(x => !x.siang), siang = slots.filter(x => x.siang);
    const jm = s.Jam_Mulai && !slots.some(x => x.jam === s.Jam_Mulai) ? s.Jam_Mulai : '';
    const biaya = tarif(l, s.Jenis);
    return this.ringkas(s) + `
      <div class="card mt-12">
        <div class="row between mb-12"><h3 class="h3 row">${ic('calendar_month', 'c-primary')} ${fmtTgl(s.Tanggal, 'month')}</h3>
          <div class="row"><button class="icon-btn outline sm" data-act="bulan" data-n="-1">${ic('chevron_left')}</button><button class="icon-btn outline sm" data-act="bulan" data-n="1">${ic('chevron_right')}</button></div></div>
        ${kalenderBulan(s.calMonth || s.Tanggal, null, 'tanggal', { minDate: todayStr(), selected: s.Tanggal })}
      </div>
      <div class="card mt-12">
        <div class="row between"><h3 class="h3 row">${ic('schedule', 'c-primary')} Pilih Slot</h3><span class="tiny strong muted">WIB · ${dur} mnt</span></div>
        ${pagi.length ? `<p class="eyebrow gray row mt-12 mb-8">${ic('light_mode', 'xs')} Pagi hari</p><div class="slot-grid">${pagi.map(slotBtn).join('')}</div>` : ''}
        ${siang.length ? `<p class="eyebrow gray row mt-16 mb-8">${ic('wb_twilight', 'xs')} Siang & sore</p><div class="slot-grid">${siang.map(slotBtn).join('')}</div>` : ''}
        ${!slots.length ? '<p class="small muted mt-12">Tidak ada slot di jam operasional.</p>' : ''}
        <label class="field mt-16"><span>Jam lain (manual) <em>opsional</em></span><input type="time" data-on="jamManual" value="${jm}"></label>
      </div>
      ${visitLain.length ? `<div class="alert alert-blue mt-12">${ic('route')}<div><b>Ada ${visitLain.length} visit lain di tanggal ini</b><br>${visitLain.map(v => `${v.Jam_Mulai} — ${esc((v.Alamat_Visit || '').split(',').slice(0, 2).join(','))}`).join('<br>')}<br>Slot bertanda titik berdekatan waktunya — cocok bila lokasinya searah.</div></div>` : ''}
      ${s.Jenis === 'Visit' ? `<div class="card mt-12 form-card"><h3>${ic('location_on')} Lokasi Kunjungan Rumah</h3>
        <label class="field soft"><span>Alamat pasien</span><textarea rows="2" data-on="f" data-f="Alamat_Visit">${esc(s.Alamat_Visit)}</textarea></label>
        <label class="field soft mt-12"><span>Catatan patokan lokasi <em>opsional</em></span><input data-on="f" data-f="Catatan_Lokasi" value="${esc(s.Catatan_Lokasi)}" placeholder="Contoh: pagar hitam depan pos satpam"></label></div>` : ''}
      <label class="card check mt-12"><input type="checkbox" data-on="sync" ${s.syncCalendar ? 'checked' : ''}><div><p class="strong">Sinkronisasi Google Calendar</p><p class="small muted">Otomatis buat event di kalender klinik dengan pengingat H-2 jam.</p></div></label>
      <div class="card tint mt-12"><div class="row between"><span class="row small">${ic('timer', 'sm')} Durasi Layanan</span><b>${dur} Menit</b></div>
        <div class="row between mt-8"><div><p class="tiny muted">Estimasi Total Biaya</p>${s.Jenis === 'Visit' && l && num(l.Biaya_Transport_Visit) ? `<p class="tiny muted">Termasuk transport visit ${rp(l.Biaya_Transport_Visit)}</p>` : ''}</div><span class="h3 c-primary num">${rp(biaya)}</span></div></div>`;
  },
  step4(ctx) {
    const s = ctx.state, p = P(s.ID_Pasien) || {}, l = L(s.ID_Layanan) || {}, t = T(s.ID_Tenaga) || {};
    const dur = num(l.Durasi_Menit) || 30;
    return `<h2 class="h2 mb-12">Konfirmasi Jadwal</h2>
      <div class="card stack-sm">
        <div class="row gap-12">${avatar(p.Nama, p.ID_Pasien)}<div class="grow"><p class="h3 ellipsis">${esc(namaPasien(p))}</p><p class="tiny mono muted">${esc(p.No_RM)} · ${esc(fmtWa(p.No_WA))}</p></div></div>
        <hr class="divider">
        <div class="kv-row"><span class="k">Jenis</span><span class="v">${s.Jenis === 'Visit' ? 'Visit Rumah' : 'Di Klinik'}</span></div>
        <div class="kv-row"><span class="k">Layanan</span><span class="v">${esc(l.Nama_Layanan)}</span></div>
        <div class="kv-row"><span class="k">Tenaga Medis</span><span class="v">${esc(t.Nama)}</span></div>
        <div class="kv-row"><span class="k">Tanggal</span><span class="v">${fmtTgl(s.Tanggal, 'long')}</span></div>
        <div class="kv-row"><span class="k">Jam</span><span class="v mono">${s.Jam_Mulai} – ${minToHm(hmToMin(s.Jam_Mulai) + dur)} WIB</span></div>
        ${s.Jenis === 'Visit' ? `<div class="kv-row"><span class="k">Alamat</span><span class="v">${esc(s.Alamat_Visit)}</span></div>` : ''}
        <div class="kv-row"><span class="k">Google Calendar</span><span class="v">${s.syncCalendar ? 'Ya, pengingat H-2 jam' : 'Tidak'}</span></div>
        <div class="kv-row total"><span class="k">Estimasi Biaya</span><span class="v c-primary">${rp(tarif(l, s.Jenis))}</span></div>
      </div>
      ${p.Alergi ? `<div class="alert alert-red mt-12">${ic('warning', 'fill')}<div><b>Alergi:</b> ${esc(p.Alergi)}</div></div>` : ''}
      <div class="card mt-12"><label class="field"><span>Instruksi khusus / keluhan <em>opsional</em></span><textarea data-on="f" data-f="Catatan" rows="3" placeholder="Contoh: pasien mengeluh lutut kaku di pagi hari">${esc(s.Catatan)}</textarea></label></div>`;
  },
  bar(ctx) {
    const s = ctx.state;
    const back = s.step > 1 ? `<button class="btn btn-secondary" data-act="kembali">Kembali</button>` : `<button class="btn btn-secondary" data-act="batal">Batal</button>`;
    const next = s.step < 4 ? `<button class="btn btn-primary grow" data-act="lanjut">Lanjut ${ic('arrow_forward', 'sm')}</button>`
      : `<button class="btn btn-primary grow" data-act="simpan">${ic('event_available', 'sm')} ${s.edit ? 'Simpan Perubahan' : 'Simpan Jadwal'}</button>`;
    return back + next;
  },
  inputs: {
    cariPasien: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.update('#pk', Pages.jadwalForm.daftarPasien(el.value)); }, 150),
    f: (el, e, ctx) => { ctx.state[el.dataset.f] = el.value; },
    sync: (el, e, ctx) => { ctx.state.syncCalendar = el.checked; },
    jamManual: (el, e, ctx) => { if (e.type === 'change' && el.value) { ctx.state.Jam_Mulai = el.value; ctx.rerender(); } }
  },
  actions: {
    pilihPasien: (el, e, ctx) => { ctx.state.ID_Pasien = el.dataset.id; Pages.jadwalForm.isiAlamat(ctx.state); ctx.state.step = 2; ctx.rerender(); },
    jenis: (el, e, ctx) => {
      ctx.state.Jenis = el.dataset.v;
      if (!lokasiOk(L(ctx.state.ID_Layanan), ctx.state.Jenis)) ctx.state.ID_Layanan = '';
      ctx.rerender();
    },
    layanan: (el, e, ctx) => { ctx.state.ID_Layanan = el.dataset.id; ctx.rerender(); },
    tenaga: (el, e, ctx) => { ctx.state.ID_Tenaga = el.dataset.id; ctx.rerender(); },
    tanggal: (el, e, ctx) => { ctx.state.Tanggal = el.dataset.tgl; ctx.state.calMonth = el.dataset.tgl; ctx.state.Jam_Mulai = ''; ctx.rerender(); },
    bulan: (el, e, ctx) => { const base = ctx.state.calMonth || ctx.state.Tanggal; ctx.state.calMonth = addMonths(base, Number(el.dataset.n)); ctx.rerender(); },
    slot: (el, e, ctx) => { ctx.state.Jam_Mulai = el.dataset.jam; ctx.rerender(); },
    batal: () => history.length > 1 ? history.back() : go('#/jadwal'),
    kembali: (el, e, ctx) => { ctx.state.step--; ctx.rerender(); },
    lanjut: (el, e, ctx) => {
      const s = ctx.state;
      if (s.step === 1 && !s.ID_Pasien) return toast('Pilih pasien dulu.', 'err');
      if (s.step === 2 && !s.ID_Layanan) return toast('Pilih layanan.', 'err');
      if (s.step === 2 && !s.ID_Tenaga) return toast('Pilih tenaga medis.', 'err');
      if (s.step === 3 && !s.Jam_Mulai) return toast('Pilih slot jam.', 'err');
      if (s.step === 3 && s.Jenis === 'Visit' && !s.Alamat_Visit) return toast('Alamat visit wajib diisi.', 'err');
      s.step++; ctx.rerender();
    },
    simpan: async (el, e, ctx, force) => {
      const s = ctx.state;
      const payload = { ID_Kunjungan: s.edit || '', ID_Pasien: s.ID_Pasien, ID_Layanan: s.ID_Layanan, ID_Tenaga: s.ID_Tenaga, Jenis: s.Jenis, Tanggal: s.Tanggal, Jam_Mulai: s.Jam_Mulai, Alamat_Visit: s.Alamat_Visit, Catatan_Lokasi: s.Catatan_Lokasi, Catatan: s.Catatan, syncCalendar: s.syncCalendar, force: !!force };
      const res = await run('saveJadwal', payload, { btn: el, codes: ['BENTROK'], loadingText: ' Menyimpan…' });
      if (res.code === 'BENTROK') {
        const ok = await confirmSheet({ title: 'Jadwal bentrok', message: res.message + ' Tetap simpan?', okText: 'Tetap Simpan', danger: true });
        if (ok) Pages.jadwalForm.actions.simpan(el, e, ctx, true);
        return;
      }
      if (res.success) { ctx.dirty = false; go('#/kunjungan/' + res.data.ID_Kunjungan); }
    }
  }
};

// ============================================
// DETAIL KUNJUNGAN
// ============================================
Pages.kunjungan = {
  nav: null,
  backTo: '#/jadwal',
  header: () => ({ type: 'sub', title: 'Detail Kunjungan', right: '' }),
  init(ctx) { ctx.state = { hppOpen: false }; },
  mount(ctx) {
    const j = J(ctx.params[0]);
    if (!j) return;
    if (ctx.state.berkasHtml) { ctx.update('#berkas-kunj', ctx.state.berkasHtml); return; }
    if (ctx.state.loaded) return;
    ctx.state.loaded = true;
    muatDetailPasien(j.ID_Pasien).then(d => {
      const thumbs = (d.berkas || []).slice(0, 4);
      ctx.state.berkasHtml = thumbs.length ? `<div class="thumb-grid">${thumbs.map(b => `<a class="thumb" href="${esc(b.url)}" target="_blank" rel="noopener">${b.thumb ? `<img src="${b.thumb}" alt="">` : ic(b.mime.includes('pdf') ? 'picture_as_pdf' : 'image', 'lg')}<span class="cap ellipsis">${esc(b.label || b.kategori.replace(/_/g, ' '))}</span></a>`).join('')}</div>`
        : '<p class="small muted">Belum ada foto/berkas untuk pasien ini.</p>';
      if (App.ctx === ctx) ctx.update('#berkas-kunj', ctx.state.berkasHtml);
    });
  },
  render(ctx) {
    const j = J(ctx.params[0]);
    if (!j) return emptyState('event_busy', 'Jadwal tidak ditemukan');
    const p = P(j.ID_Pasien) || {}, l = L(j.ID_Layanan) || {}, t = T(j.ID_Tenaga) || {};
    const st = jadwalStatus(j), visit = j.Jenis === 'Visit';
    const trx = trxKunjungan(j.ID_Kunjungan);
    const h = hppDetail(l, j.Jenis), m = marginInfo(l, j.Jenis);
    const hasil = trx ? num(trx.Jumlah) : m.tarif;
    return `
    <div class="row between"><p class="eyebrow row">${st.live ? '<span class="sync-dot" style="background:var(--primary)"></span> KUNJUNGAN BERLANGSUNG' : 'STATUS: ' + esc(st.label.toUpperCase())}</p>
      <div class="row"><button class="icon-btn soft sm" data-act="bagikan" aria-label="Bagikan">${ic('share', 'sm')}</button><button class="icon-btn soft sm" data-act="lainnya" aria-label="Lainnya">${ic('more_vert', 'sm')}</button></div></div>
    <div class="card mt-12">
      <div class="row between wrap"><div class="row">${badge(st.label, st.cls)}${badge(visit ? 'Visit Rumah' : 'Klinik', visit ? 'b-teal' : 'b-blue', visit ? 'home' : '')}</div><span class="tag-mono gray">${esc(j.ID_Kunjungan)}</span></div>
      <div class="row gap-12 mt-16"><div class="icon-tile sm">${ic('calendar_today')}</div><div><p class="h3">${fmtTgl(j.Tanggal, 'long')}</p>
        <p class="row small muted">${ic('schedule', 'xs')} ${j.Jam_Mulai} - ${j.Jam_Selesai} WIB ${badge((num(l.Durasi_Menit) || '') + ' Menit', 'b-blue')}</p></div></div>
      ${j.ID_Event_Calendar ? `<div class="inset row mt-12">${ic('event_repeat', 'sm c-primary')}<div class="grow"><p class="tiny muted">Tersinkron Google Calendar</p><p class="tiny mono ellipsis">${esc(j.ID_Event_Calendar.split('@')[0].slice(0, 16))}</p></div>${ic('check_circle', 'sm c-teal')}</div>`
        : (j.Status === 'Terjadwal' ? `<div class="inset row mt-12 small muted">${ic('event_busy', 'sm')} Belum masuk Google Calendar</div>` : '')}
    </div>

    <div class="card mt-12">
      <div class="row gap-12">${avatar(p.Nama, p.ID_Pasien, 'lg')}<div class="grow"><p class="h3 ellipsis">${esc(namaPasien(p))}</p><p class="small muted">${umur(p.Tgl_Lahir)} Th · ${esc(p.Jenis_Kelamin || '-')}</p><p class="tiny mono c-primary">No. RM: ${esc(p.No_RM)}</p></div>
        <a class="btn btn-sm btn-wa" href="${waLink(p.No_WA, '')}" target="_blank" rel="noopener">${ic('chat', 'sm')}Chat WA</a></div>
      <a class="inset row mt-12" href="tel:+${esc(p.No_WA)}" style="color:inherit">${ic('smartphone', 'sm')}<span class="grow mono">${esc(fmtWa(p.No_WA))}</span><span class="badge">Kontak Utama</span></a>
      ${p.Diagnosis_Utama ? `<p class="eyebrow gray mt-16">Diagnosis Primer</p><div class="inset mt-8">${esc(p.Diagnosis_Utama)}</div>` : ''}
      ${p.Alergi ? `<div class="mt-12">${badge('Alergi: ' + p.Alergi, 'b-red', 'warning')}</div>` : ''}
      <a class="row between mt-16 strong" href="#/pasien/${p.ID_Pasien}">Lihat Profil Rekam Medis Lengkap ${ic('arrow_forward', 'sm')}</a>
    </div>

    <div class="card mt-12">
      <div class="row between"><h3 class="h3 row">${ic('medical_services', 'c-primary')} Layanan & Tarif</h3>${trx ? badge(trx.Status_Bayar === 'Lunas' ? 'Lunas' : trx.Status_Bayar, trx.Status_Bayar === 'Lunas' ? 'b-green' : 'b-amber') : badge('Belum Ditagih', '')}</div>
      <p class="eyebrow gray mt-12">Nama Prosedur</p><p class="h3 mt-4">${esc(l.Nama_Layanan || '-')}</p>
      <div class="inset row mt-12">${ic('stethoscope', 'sm c-primary')}<div><p class="tiny muted">Dokter / Tenaga Penanggung Jawab</p><p class="strong">${esc(t.Nama || '-')}</p></div></div>
      <div class="row between mt-16"><span>${trx ? 'Total Tagihan Tercatat' : 'Tarif Layanan'}</span><span class="h2 c-primary num">${rp(hasil)}</span></div>
      <div class="inset mt-12">
        <button class="row between" data-act="toggleHpp" style="width:100%;background:none;border:0;padding:0;cursor:pointer"><span class="row strong small">${ic('analytics', 'sm')} Analisis HPP & Margin</span>${ic(ctx.state.hppOpen ? 'expand_less' : 'expand_more')}</button>
        ${ctx.state.hppOpen ? `<div class="mt-8">
          ${h.items.map(b => `<div class="kv-row"><span class="k">${esc(b.nama)} ×${b.qty}</span><span class="v">${rp(b.biaya)}</span></div>`).join('')}
          <div class="kv-row"><span class="k">Jasa medis</span><span class="v">${rp(h.jasa)}</span></div>
          <div class="kv-row"><span class="k">Overhead</span><span class="v">${rp(h.overhead)}</span></div>
          ${visit ? `<div class="kv-row"><span class="k">Transport visit</span><span class="v">${rp(h.transport)}</span></div>` : ''}
          <div class="kv-row total"><span class="k">Total Beban Pokok (HPP)</span><span class="v">${rp(trx ? trx.HPP_Tercatat : h.total)}</span></div>
          ${(() => { const hp = trx ? num(trx.HPP_Tercatat) : h.total; const lb = hasil - hp; const mg = hasil ? lb / hasil * 100 : 0; return `<div class="alert ${mg < num(setting('MARGIN_MIN', 30)) ? 'alert-red' : 'alert-green'} mt-8">${ic('trending_up', 'sm')}<div class="row between grow"><span>Estimasi margin ${mg.toFixed(1).replace('.', ',')}%</span><b class="num">Laba ${rp(lb)}</b></div></div>`; })()}
        </div>` : ''}
      </div>
    </div>

    ${visit ? `<div class="card mt-12">
      <div class="row between"><h3 class="h3 row">${ic('location_on', 'c-primary')} Alamat Kunjungan</h3>${j.Jarak_Km ? badge(j.Jarak_Km + ' km dari klinik', 'b-blue') : ''}</div>
      <p class="mt-8">${esc(j.Alamat_Visit)}</p>
      ${j.Catatan_Lokasi ? `<div class="inset row top mt-12">${ic('info', 'sm c-primary')}<div><p class="tiny muted">Petunjuk patokan</p><p class="small">${esc(j.Catatan_Lokasi)}</p></div></div>` : ''}
      <iframe class="map-frame mt-12" loading="lazy" referrerpolicy="no-referrer" src="https://maps.google.com/maps?q=${encodeURIComponent(j.Alamat_Visit)}&z=14&output=embed" title="Peta"></iframe>
      ${j.Estimasi_Menit ? `<p class="tiny muted mt-8 row">${ic('directions_car', 'xs')} Estimasi tempuh ~${esc(j.Estimasi_Menit)} menit</p>` : ''}
      <a class="btn btn-secondary btn-block mt-12" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(j.Alamat_Visit)}" target="_blank" rel="noopener">${ic('near_me')} Buka Rute di Google Maps</a>
    </div>` : ''}

    ${j.Catatan ? `<div class="card mt-12"><h3 class="h3 row mb-12">${ic('format_quote', 'c-primary')} Instruksi Khusus / Keluhan</h3><div class="quote">${esc(j.Catatan)}</div></div>` : ''}

    <div class="card mt-12"><div class="row between mb-12"><h3 class="h3 row">${ic('photo_library', 'c-primary')} Foto & Pemeriksaan</h3><button class="link-btn" data-act="unggah">${ic('add_photo_alternate', 'sm')} Tambah</button></div>
      <div id="berkas-kunj"><div class="skel" style="height:90px"></div></div></div>

    ${j.Status === 'Terjadwal' ? `<div class="row between mt-16"><a class="btn btn-sm" style="background:none;color:var(--primary)" href="#/jadwal/ubah/${j.ID_Kunjungan}">${ic('event_repeat', 'sm')} Jadwalkan Ulang</a>
      <button class="btn btn-sm btn-ghost-danger" data-act="batalkan">${ic('cancel', 'sm')} Batalkan Jadwal</button></div>` : ''}`;
  },
  bar(ctx) {
    const j = J(ctx.params[0]);
    if (!j) return '';
    const p = P(j.ID_Pasien) || {};
    if (j.Status === 'Selesai') {
      const trx = trxKunjungan(j.ID_Kunjungan);
      return `<a class="btn btn-secondary" href="#/soap/${j.ID_Kunjungan}">${ic('edit_note', 'sm')}SOAP</a>` + (trx ? `<a class="btn btn-primary grow" href="#/kuitansi/${trx.ID_Transaksi}">${ic('receipt_long', 'sm')} Lihat Kuitansi</a>` : '');
    }
    if (j.Status !== 'Terjadwal') return `<a class="btn btn-primary grow" href="#/jadwal/baru?pasien=${j.ID_Pasien}">${ic('event', 'sm')} Buat Jadwal Baru</a>`;
    return `<div style="width:100%"><button class="btn btn-primary btn-block" data-act="selesai">${ic('task_alt')} Tandai Selesai & Kurangi Stok</button>
      <div class="row mt-8"><a class="btn btn-secondary btn-sm grow" href="#/soap/${j.ID_Kunjungan}">${ic('edit_note', 'sm')} Catat SOAP</a>
      <a class="btn btn-secondary btn-sm grow" href="${waLink(p.No_WA, pesanReminder(j))}" target="_blank" rel="noopener" data-act="reminder" data-id="${j.ID_Kunjungan}">${ic('notifications_active', 'sm')} Kirim WA Reminder</a></div></div>`;
  },
  actions: {
    toggleHpp: (el, e, ctx) => { ctx.state.hppOpen = !ctx.state.hppOpen; ctx.rerender(); },
    selesai: (el, e, ctx) => go('#/tindakan/' + ctx.params[0]),
    reminder: jadwalActions.reminder,
    bagikan: async (el, e, ctx) => {
      const j = J(ctx.params[0]), p = P(j.ID_Pasien) || {}, l = L(j.ID_Layanan) || {};
      const txt = `${j.Jenis === 'Visit' ? 'Visit Rumah' : 'Klinik'} — ${namaPasien(p)}\n${l.Nama_Layanan}\n${fmtTgl(j.Tanggal, 'long')} ${j.Jam_Mulai}-${j.Jam_Selesai}${j.Jenis === 'Visit' ? '\n' + j.Alamat_Visit + '\nhttps://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(j.Alamat_Visit) : ''}`;
      if (navigator.share) { try { await navigator.share({ text: txt }); } catch (err) { /* batal */ } }
      else { await navigator.clipboard.writeText(txt); toast('Detail jadwal disalin.'); }
    },
    lainnya: (el, e, ctx) => {
      const j = J(ctx.params[0]);
      openSheet({
        title: 'Aksi Lainnya',
        body: `<div class="pick-list">
          ${j.Status === 'Terjadwal' ? `<div class="pick" data-sact="ubah">${ic('edit_calendar', 'c-primary')}<span>Ubah / jadwalkan ulang</span></div>
          <div class="pick" data-sact="tidakHadir">${ic('person_off', 'c-warning')}<span>Tandai pasien tidak hadir</span></div>` : ''}
          ${['Batal', 'Tidak Hadir'].includes(j.Status) ? `<div class="pick" data-sact="pulihkan">${ic('restore', 'c-primary')}<span>Aktifkan kembali jadwal</span></div>` : ''}
          <div class="pick" data-sact="soap">${ic('edit_note', 'c-primary')}<span>Catat / lihat SOAP</span></div>
          <div class="pick" data-sact="pasien">${ic('person', 'c-primary')}<span>Buka profil pasien</span></div></div>`,
        onAction: async (a, b, s) => {
          s.close();
          if (a === 'ubah') go('#/jadwal/ubah/' + j.ID_Kunjungan);
          if (a === 'soap') go('#/soap/' + j.ID_Kunjungan);
          if (a === 'pasien') go('#/pasien/' + j.ID_Pasien);
          if (a === 'tidakHadir' || a === 'pulihkan') {
            const r = await run('ubahStatusJadwal', { id: j.ID_Kunjungan, status: a === 'pulihkan' ? 'Terjadwal' : 'Tidak Hadir' });
            if (r.success) ctx.rerender();
          }
        }
      });
    },
    batalkan: async (el, e, ctx) => {
      const alasan = await confirmSheet({ title: 'Batalkan jadwal ini?', message: 'Event di Google Calendar juga akan dihapus.', okText: 'Batalkan Jadwal', danger: true, input: { label: 'Alasan (opsional)', placeholder: 'Contoh: pasien minta reschedule' } });
      if (alasan === false) return;
      const r = await run('ubahStatusJadwal', { id: ctx.params[0], status: 'Batal', alasan: String(alasan).trim() });
      if (r.success) ctx.rerender();
    },
    unggah: async (el, e, ctx) => {
      const j = J(ctx.params[0]);
      unggahBerkasPasien(j.ID_Pasien, () => { ctx.state.loaded = false; ctx.state.berkasHtml = ''; S.detail[j.ID_Pasien] = null; ctx.rerender(); });
    }
  }
};

/** Alur unggah berkas: pilih kategori + label → kamera/galeri → kompres → kirim */
function unggahBerkasPasien(idPasien, onDone, kategoriDefault = 'Rontgen_Pemeriksaan') {
  const s = openSheet({
    title: 'Unggah Berkas Pasien',
    body: `<div class="chips wrap mb-12">${[['Rontgen_Pemeriksaan', 'Rontgen / Pemeriksaan'], ['Persetujuan', 'Informed Consent'], ['Bukti_Bayar', 'Bukti Bayar']].map(([k, n]) => `<button class="chip ${k === kategoriDefault ? 'active' : ''}" data-sact="kat" data-k="${k}">${n}</button>`).join('')}</div>
      <label class="field"><span>Keterangan berkas</span><input id="ub-label" placeholder="Contoh: X-Ray AP/Lateral lutut kanan"></label>
      <div class="upload-drop mt-16">${ic('cloud_upload', 'lg c-primary')}<p class="small muted mt-8">JPG, PNG, PDF · foto dikompres otomatis</p>
        <div class="row mt-12" style="justify-content:center"><button class="btn btn-secondary btn-sm" data-sact="kamera">${ic('photo_camera', 'sm')}Kamera</button><button class="btn btn-secondary btn-sm" data-sact="galeri">${ic('image', 'sm')}Galeri / Berkas</button></div></div>
      <p class="tiny muted mt-12 row">${ic('lock', 'xs')} Tersimpan privat di folder Drive pasien.</p>`,
    onAction: async (a, b, ctx) => {
      if (a === 'kat') { ctx.el.querySelectorAll('[data-sact=kat]').forEach(x => x.classList.toggle('active', x === b)); kategoriDefault = b.dataset.k; return; }
      if (a !== 'kamera' && a !== 'galeri') return;
      const file = await pilihBerkas({ capture: a === 'kamera', accept: a === 'kamera' ? 'image/*' : 'image/*,application/pdf' });
      if (!file) return;
      try {
        const f = await readFile(file);
        const res = await run('uploadBerkas', { idPasien, kategori: kategoriDefault, label: ctx.el.querySelector('#ub-label').value, base64: f.base64, mime: f.mime }, { btn: b });
        if (res.success) { ctx.close(); if (onDone) onDone(res.data); }
      } catch (err) { toast(err.message, 'err'); }
    }
  });
  return s;
}
