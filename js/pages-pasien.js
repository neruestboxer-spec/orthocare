/**
 * HALAMAN PASIEN — Daftar, Form Pendaftaran, Detail Pasien, Rekam Medis (SOAP)
 */

function kunjunganTerakhir(idPasien) {
  const js = S.jadwal.filter(j => j.ID_Pasien === idPasien && j.Status === 'Selesai').sort((a, b) => (b.Tanggal + b.Jam_Mulai).localeCompare(a.Tanggal + a.Jam_Mulai));
  return js[0] || null;
}
function nextNoRmPreview() {
  const th = todayStr().slice(0, 4), pref = 'RM-' + th + '-';
  const max = S.pasien.reduce((m, p) => p.No_RM.startsWith(pref) ? Math.max(m, parseInt(p.No_RM.slice(pref.length), 10) || 0) : m, 0);
  return pref + pad(max + 1, 3);
}

/** Sheet distribusi PDF (kuitansi/surat): WhatsApp, unduh, cabut tautan */
function kirimPdfSheet({ judul, data, pasien, pesan }) {
  const linkTxt = data.shared ? data.url : '';
  const teks = pesan(linkTxt ? 'Unduh dokumen: ' + linkTxt + ' (berlaku 24 jam)' : '');
  return openSheet({
    title: judul,
    body: `<div class="result-icon ok">${ic('picture_as_pdf', 'fill')}</div>
      <p class="center small muted">${data.shared ? 'Tautan "siapa pun yang punya link" aktif 24 jam, lalu dicabut otomatis.' : 'Mode manual: unduh PDF lalu lampirkan sendiri di WhatsApp.'}</p>
      <div class="stack-sm mt-16">
        <a class="btn btn-wa btn-block" href="${waLink(pasien.No_WA, teks)}" target="_blank" rel="noopener" data-sact="wa">${ic('chat')} Kirim via WhatsApp</a>
        <button class="btn btn-secondary btn-block" data-sact="unduh">${ic('download')} Unduh PDF</button>
        ${data.shared ? `<button class="btn btn-ghost-danger btn-block" data-sact="cabut">${ic('link_off')} Cabut Akses Tautan Sekarang</button>` : ''}
      </div>`,
    onAction: async (a, b, ctx) => {
      if (a === 'unduh') unduhBase64(data.base64, data.nama);
      if (a === 'cabut') { const r = await run('cabutTautan', { fileId: data.fileId }, { btn: b }); if (r.success) b.remove(); }
    }
  });
}

// ============================================
// DAFTAR PASIEN
// ============================================
Pages.pasien = {
  nav: 'pasien',
  header: () => ({ type: 'main', title: 'Pasien' }),
  fab: () => ({ href: '#/pasien/baru', icon: 'person_add', label: 'Pasien baru' }),
  init(ctx) { ctx.state = { q: '', filter: ctx.q.f || 'semua', sort: 'terbaru', limit: 30 }; },
  filterFns() {
    const t = todayStr(), batas = addDays(t, -30);
    const aktifIds = new Set(S.jadwal.filter(j => isAktifJadwal(j) && (j.Tanggal >= batas)).map(j => j.ID_Pasien));
    const visitIds = new Set(S.jadwal.filter(j => j.Jenis === 'Visit' && isAktifJadwal(j)).map(j => j.ID_Pasien));
    return {
      semua: p => p.Status !== 'Arsip',
      aktif: p => p.Status !== 'Arsip' && aktifIds.has(p.ID_Pasien),
      pascaop: p => p.Status !== 'Arsip' && (/post-?op|fraktur|operasi/i.test(p.Kategori_Kasus + ' ' + p.Diagnosis_Utama) || !!p.Riwayat_Implan),
      visit: p => p.Status !== 'Arsip' && visitIds.has(p.ID_Pasien),
      arsip: p => p.Status === 'Arsip'
    };
  },
  daftar(ctx) {
    const s = ctx.state, F = this.filterFns();
    const q = s.q.toLowerCase().replace(/^0/, '62');
    let list = S.pasien.filter(F[s.filter]).filter(p => !q || (p.Nama + ' ' + p.No_RM + ' ' + p.No_WA + ' ' + p.Diagnosis_Utama).toLowerCase().includes(q) || p.No_WA.includes(q.replace(/\D/g, '') || '§'));
    list.sort(s.sort === 'nama' ? (a, b) => a.Nama.localeCompare(b.Nama) : (a, b) => String(b.Diubah_Pada || b.Dibuat_Pada).localeCompare(String(a.Diubah_Pada || a.Dibuat_Pada)));
    const total = list.length;
    list = list.slice(0, s.limit);
    if (!total) return emptyState('person_search', s.q ? 'Pasien tidak ditemukan' : 'Belum ada pasien', s.q ? 'Coba kata kunci lain.' : 'Daftarkan pasien pertama Anda.', '<a class="btn btn-primary btn-sm" href="#/pasien/baru">' + ic('person_add', 'sm') + ' Pasien Baru</a>');
    return `<div class="stack">${list.map(p => {
      const last = kunjunganTerakhir(p.ID_Pasien);
      const visit = S.jadwal.some(j => j.ID_Pasien === p.ID_Pasien && j.Jenis === 'Visit' && isAktifJadwal(j));
      const tag = p.Alergi ? badge('Alergi ' + p.Alergi.split(/[,(]/)[0].trim(), 'b-red', 'warning')
        : visit ? badge('Visit Rumah', 'b-teal', 'location_on') : p.Riwayat_Implan ? badge('Riwayat Implan', 'b-blue', 'healing') : '';
      return `<div class="card clickable" data-act="buka" data-id="${p.ID_Pasien}">
        <div class="row gap-12">${avatar(p.Nama, p.ID_Pasien, 'solid')}
          <div class="grow"><p class="h3 ellipsis">${esc(namaPasien(p))}</p><div class="row wrap tiny muted mt-4"><span>${umur(p.Tgl_Lahir)} Th · ${esc(p.Jenis_Kelamin || '-')}</span><span class="tag-mono">${esc(p.No_RM)}</span></div></div>
          <a class="wa-circle" href="${waLink(p.No_WA, '')}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(p.Nama)}" data-act="noop">${ic('chat')}</a>
        </div>
        <div class="inset mt-12"><p class="eyebrow row">${ic('medical_information', 'xs')} Diagnosis klinis</p><p class="mt-4 ${p.Diagnosis_Utama ? '' : 'muted'}">${esc(p.Diagnosis_Utama || 'Belum ada diagnosis')}</p></div>
        <div class="row between mt-12 wrap"><span class="row tiny muted">${ic('history', 'xs')} ${last ? 'Terakhir: ' + fmtTgl(last.Tanggal) + ' (' + esc((L(last.ID_Layanan) || {}).Nama_Layanan || '') + ')' : 'Belum ada kunjungan selesai'}</span>${tag}</div>
      </div>`;
    }).join('')}</div>${total > s.limit ? `<button class="btn btn-secondary btn-block mt-16" data-act="more">Tampilkan lebih banyak (${total - s.limit} lagi)</button>` : ''}`;
  },
  render(ctx) {
    const s = ctx.state, F = this.filterFns(), t = todayStr();
    const senin = addDays(t, -((dow(t) + 6) % 7)), minggu = addDays(senin, 6);
    const kunjPekan = S.jadwal.filter(j => j.Tanggal >= senin && j.Tanggal <= minggu && isAktifJadwal(j)).length;
    const baru = S.pasien.filter(p => String(p.Dibuat_Pada).slice(0, 7) === monthKey(t)).length;
    const belum = new Set(S.transaksi.filter(x => x.Tipe === 'Pemasukan' && x.Status_Bayar !== 'Lunas').map(x => x.ID_Pasien)).size;
    const chips = [['semua', 'Semua'], ['aktif', 'Aktif'], ['pascaop', 'Pasca Operasi'], ['visit', 'Visit Rumah'], ['arsip', 'Arsip']];
    return `
      <div class="search">${ic('search')}<input data-on="cari" placeholder="Cari nama pasien, No. RM, atau No. WhatsApp" value="${esc(s.q)}" type="search"></div>
      <div class="chips mt-12">${chips.map(([k, n]) => `<button class="chip ${s.filter === k ? 'active' : ''}" data-act="filter" data-k="${k}">${n} (${S.pasien.filter(F[k]).length})</button>`).join('')}</div>
      <div class="grid3 mt-12">
        <div class="stat"><p class="lbl">Pasien Baru</p><p class="val">${baru}<small>Bln ini</small></p></div>
        <div class="stat"><p class="lbl">Kunjungan</p><p class="val">${kunjPekan}<small>Pekan ini</small></p></div>
        <a class="stat" href="#/keuangan?f=belum" style="color:inherit"><p class="lbl">Tagihan</p><p class="val ${belum ? 'c-danger' : ''}">${belum}<small>Belum lunas</small></p></a>
      </div>
      <div class="sec-head"><h2>Daftar Rekam Medis <span class="count">${S.pasien.filter(F[s.filter]).length}</span></h2>
        <button class="link-btn" data-act="sort">${ic('swap_vert', 'sm')} ${s.sort === 'nama' ? 'Nama A–Z' : 'Terbaru'}</button></div>
      <div id="plist">${this.daftar(ctx)}</div>`;
  },
  inputs: { cari: debounce((el, e, ctx) => { ctx.state.q = el.value; ctx.state.limit = 30; ctx.update('#plist', Pages.pasien.daftar(ctx)); }, 120) },
  actions: {
    buka: el => go('#/pasien/' + el.dataset.id),
    noop: () => { },
    filter: (el, e, ctx) => { ctx.state.filter = el.dataset.k; ctx.state.limit = 30; ctx.rerender(); },
    sort: (el, e, ctx) => { ctx.state.sort = ctx.state.sort === 'nama' ? 'terbaru' : 'nama'; ctx.rerender(); },
    more: (el, e, ctx) => { ctx.state.limit += 30; ctx.update('#plist', Pages.pasien.daftar(ctx)); }
  }
};

// ============================================
// FORM PASIEN (Baru / Ubah)
// ============================================
const KATEGORI_KASUS = ['Fraktur / Post-Op', 'Cedera Ligamen', 'Osteoartritis', 'Nyeri Tulang Belakang', 'Frozen Shoulder', 'Cedera Olahraga', 'Lainnya'];
const AREA_KELUHAN = ['Bahu', 'Siku', 'Pergelangan Tangan', 'Punggung', 'Leher', 'Panggul', 'Lutut Kanan', 'Lutut Kiri', 'Pergelangan Kaki'];
const SAPAAN = ['Tn.', 'Ny.', 'Nn.', 'Sdr.', 'Sdri.', 'Bpk.', 'Ibu', 'An.'];

Pages.pasienForm = {
  nav: null,
  backTo: '#/pasien',
  header: ctx => ({ type: 'sub', title: ctx.params[0] ? 'Ubah Data Pasien' : 'Pendaftaran Pasien Baru', right: '' }),
  init(ctx) {
    ctx.dirty = true;
    const p = ctx.params[0] ? P(ctx.params[0]) : null;
    ctx.state = { p: p || { Sapaan: 'Tn.', Jenis_Kelamin: 'Laki-laki', Izin_WA: 'Ya' } };
  },
  chipMulti(name, opts, val) {
    const sel = String(val || '').split(',').map(x => x.trim()).filter(Boolean);
    return `<div class="chips wrap">${opts.map(o => `<label class="chip sm ${name === 'Kategori_Kasus' ? '' : 'soft'} ${sel.includes(o) ? 'active' : ''}"><input type="checkbox" hidden name="${name}" data-multi="1" value="${esc(o)}" ${sel.includes(o) ? 'checked' : ''} data-on="chip">${sel.includes(o) ? ic('check', 'xs') : ''}${esc(o)}</label>`).join('')}</div>`;
  },
  render(ctx) {
    const p = ctx.state.p, edit = !!ctx.params[0];
    const wa = String(p.No_WA || '').replace(/^62/, '');
    return `
    <div class="row gap-12 mb-12"><div class="icon-tile sm">${ic(edit ? 'edit' : 'person_add')}</div><div><p class="h3">${edit ? 'Perbarui Data Pasien' : 'Pendaftaran Pasien Baru'}</p><p class="small muted">Lengkapi data rekam medis terpadu</p></div></div>
    <div class="card tint">
      <p class="eyebrow gray">Nomor Rekam Medis Sistem</p>
      <div class="row between mt-8"><span class="h2 mono c-primary">${esc(edit ? p.No_RM : nextNoRmPreview())}</span>${badge(edit ? 'Terdaftar' : 'Otomatis', 'b-teal', 'verified')}</div>
      ${edit ? '' : `<p class="tiny muted mt-8 row">${ic('drive_folder_upload', 'xs')} Folder Google Drive privat pasien dibuat otomatis saat disimpan.</p>`}
    </div>
    <form id="pf" class="stack mt-12" autocomplete="off">
      <div class="card form-card"><h3>${ic('badge')} Data Identitas Diri</h3>
        <div class="field"><span class="req">Nama Lengkap & Sapaan</span>
          <div class="row"><select class="input" name="Sapaan" style="width:100px;flex-shrink:0">${selOpts(SAPAAN, p.Sapaan)}</select><input class="input" name="Nama" value="${esc(p.Nama || '')}" placeholder="Nama sesuai KTP" required></div></div>
        <label class="field mt-12"><span>NIK (KTP) <em>Opsional · 16 digit</em></span><input name="NIK" inputmode="numeric" maxlength="16" value="${esc(p.NIK || '')}" class="mono" placeholder="31710..."></label>
        <div class="grid2 mt-12">
          <label class="field"><span class="req">Tanggal Lahir</span><input type="date" name="Tgl_Lahir" value="${esc(p.Tgl_Lahir || '')}" max="${todayStr()}" data-on="tgl"></label>
          <div class="field"><span>Kalkulasi Usia</span><div class="input row between" style="background:var(--surface-low);border-color:transparent"><b class="h3 c-primary" id="umur">${p.Tgl_Lahir ? umur(p.Tgl_Lahir) : '-'}</b>${badge('Tahun', 'b-blue')}</div></div>
        </div>
        <div class="field mt-12"><span class="req">Jenis Kelamin</span><div class="seg">
          ${['Laki-laki', 'Perempuan'].map(g => `<label class="${p.Jenis_Kelamin === g ? 'active' : ''}"><input type="radio" hidden name="Jenis_Kelamin" value="${g}" ${p.Jenis_Kelamin === g ? 'checked' : ''} data-on="seg">${ic(g === 'Laki-laki' ? 'male' : 'female', 'sm')}${g}</label>`).join('')}</div></div>
        <label class="field mt-12"><span>Pekerjaan & Aktivitas Fisik</span><input name="Pekerjaan" value="${esc(p.Pekerjaan || '')}" placeholder="Contoh: Karyawan swasta (pemain bulutangkis amatir)"></label>
      </div>

      <div class="card form-card"><h3>${ic('contact_phone')} Kontak & Alamat Visit</h3>
        <div class="field"><span class="req">Nomor WhatsApp Aktif <span id="wa-ok">${normWa(p.No_WA) ? badge('Format Valid', 'b-teal', 'check_circle') : ''}</span></span>
          <div class="input-wrap"><span class="prefix">+62</span><input name="No_WA" inputmode="tel" value="${esc(wa)}" placeholder="812-3456-7890" data-on="wa" class="mono"></div></div>
        <label class="check mt-12 small"><input type="checkbox" name="Izin_WA" ${p.Izin_WA !== 'Tidak' ? 'checked' : ''}><span>Izinkan pengiriman pengingat jadwal dan dokumen via WhatsApp</span></label>
        <label class="field mt-12"><span class="req">Alamat Domisili Lengkap</span><textarea name="Alamat" rows="2" placeholder="Jalan, nomor, kelurahan, kecamatan, kota">${esc(p.Alamat || '')}</textarea></label>
        <label class="field mt-12"><span>Patokan Lokasi <em>untuk home visit</em></span><div class="input-wrap">${ic('location_on')}<input name="Catatan_Alamat_Visit" value="${esc(p.Catatan_Alamat_Visit || '')}" placeholder="Contoh: sebelah apotek, pagar putih"></div></label>
      </div>

      <div class="card form-card"><h3>${ic('medical_information')} Riwayat Medis & Keluhan Orthopedi</h3>
        <p class="flabel mb-8">Kategori Kasus Orthopedi</p>${this.chipMulti('Kategori_Kasus', KATEGORI_KASUS, p.Kategori_Kasus)}
        <p class="flabel mt-16 mb-8">Area Keluhan Tubuh</p>${this.chipMulti('Area_Keluhan', AREA_KELUHAN, p.Area_Keluhan)}
        <label class="field mt-16"><span>Diagnosis awal <em>opsional</em></span><input name="Diagnosis_Utama" value="${esc(p.Diagnosis_Utama || '')}" placeholder="Contoh: Ruptur ACL dextra"></label>
        <div class="clinical-alert mt-16"><div class="row between"><span class="head">${ic('warning', 'sm')} Riwayat Alergi Obat / Bahan</span>${badge('Penting', 'b-solid-red')}</div>
          <input class="input mt-12" name="Alergi" value="${esc(p.Alergi || '')}" placeholder="Contoh: Penisilin (gatal & sesak ringan) — kosongkan bila tidak ada" style="border-color:#FBCACA;color:var(--danger-ink)"></div>
        <label class="field mt-16"><span>Riwayat Pemasangan Implan / Tindakan Operasi</span><textarea name="Riwayat_Implan" rows="2" placeholder="Contoh: pen klavikula 2021">${esc(p.Riwayat_Implan || '')}</textarea></label>
      </div>

      <div class="card form-card"><h3>${ic('emergency')} Kontak Darurat</h3>
        <div class="grid2"><label class="field"><span>Nama Lengkap</span><input name="Kontak_Darurat_Nama" value="${esc(p.Kontak_Darurat_Nama || '')}"></label>
          <label class="field"><span>Hubungan</span><input name="Kontak_Darurat_Hubungan" value="${esc(p.Kontak_Darurat_Hubungan || '')}" placeholder="Istri / Anak"></label></div>
        <label class="field mt-12"><span>Nomor Telepon Darurat</span><div class="input-wrap">${ic('call')}<input name="Kontak_Darurat_No" inputmode="tel" value="${esc(p.Kontak_Darurat_No || '')}" class="mono"></div></label>
      </div>
    </form>`;
  },
  bar: ctx => `<button class="btn btn-secondary" data-act="batal">Batal</button><button class="btn btn-primary grow" data-act="simpan">${ic('how_to_reg', 'sm')} ${ctx.params[0] ? 'Simpan Perubahan' : 'Simpan & Buka Profil'}</button>`,
  inputs: {
    tgl: el => { document.getElementById('umur').textContent = el.value ? umur(el.value) : '-'; },
    wa: el => { document.getElementById('wa-ok').innerHTML = normWa(el.value) ? badge('Format Valid', 'b-teal', 'check_circle') : el.value ? badge('Belum valid', 'b-amber') : ''; },
    chip: (el, e) => {
      if (e.type !== 'change') return;
      const l = el.closest('label'), icn = l.querySelector('.ms');
      l.classList.toggle('active', el.checked);
      if (el.checked && !icn) el.insertAdjacentHTML('afterend', ic('check', 'xs'));
      if (!el.checked && icn) icn.remove();
    },
    seg: el => { el.closest('.seg').querySelectorAll('label').forEach(l => l.classList.toggle('active', l.contains(el))); }
  },
  actions: {
    batal: () => history.length > 1 ? history.back() : go('#/pasien'),
    simpan: async (el, e, ctx, force) => {
      const d = formData(document.getElementById('pf'));
      d.Izin_WA = d.Izin_WA ? 'Ya' : 'Tidak';
      if (!d.Nama) return toast('Nama wajib diisi.', 'err');
      if (!d.Tgl_Lahir) return toast('Tanggal lahir wajib diisi.', 'err');
      if (!normWa(d.No_WA)) return toast('Nomor WhatsApp belum valid.', 'err');
      if (!d.Alamat) return toast('Alamat wajib diisi.', 'err');
      if (d.NIK && !/^\d{16}$/.test(d.NIK)) return toast('NIK harus 16 digit angka.', 'err');
      d.No_WA = normWa(d.No_WA);
      if (ctx.params[0]) d.ID_Pasien = ctx.params[0];
      d.force = !!force;
      const res = await run('savePasien', d, { btn: el, codes: ['DUPLIKAT'], loadingText: ' Menyimpan…' });
      if (res.code === 'DUPLIKAT') {
        const ok = await confirmSheet({ title: 'Kemungkinan pasien ganda', message: res.message + ' Tetap simpan sebagai pasien baru?', okText: 'Tetap Simpan' });
        if (ok) Pages.pasienForm.actions.simpan(el, e, ctx, true);
        return;
      }
      if (res.success) {
        ctx.dirty = false;
        if (ctx.q.next === 'jadwal') location.replace('#/jadwal/baru?pasien=' + res.data.ID_Pasien);
        else location.replace('#/pasien/' + res.data.ID_Pasien);
      }
    }
  }
};

// ============================================
// DETAIL PASIEN
// ============================================
Pages.pasienDetail = {
  nav: null,
  backTo: '#/pasien',
  header: () => ({ type: 'sub', title: 'Detail Pasien' }),
  init(ctx) { ctx.state = { tab: ctx.q.tab || 'soap' }; },
  mount(ctx) {
    const id = ctx.params[0], d = S.detail[id];
    if ((!d || !d.berkasLoaded) && !ctx.state.loading) {
      ctx.state.loading = true;
      muatDetailPasien(id, false, false).then(() => { if (App.ctx === ctx) ctx.rerender(); });
    }
  },
  render(ctx) {
    const p = P(ctx.params[0]);
    if (!p) return emptyState('person_off', 'Pasien tidak ditemukan');
    const d = S.detail[p.ID_Pasien];
    const rekam = d ? d.rekam : null;
    const terakhir = rekam && rekam[0];
    const jadwalAkan = S.jadwal.filter(j => j.ID_Pasien === p.ID_Pasien && j.Status === 'Terjadwal' && j.Tanggal >= todayStr()).sort((a, b) => (a.Tanggal + a.Jam_Mulai).localeCompare(b.Tanggal + b.Jam_Mulai));
    const s = ctx.state;
    const nBerkas = d && d.berkasLoaded ? d.berkas.length : '…';
    let tabBody;
    if (!d) tabBody = skeleton(3);
    else if (s.tab === 'soap') tabBody = this.tabSoap(p, rekam);
    else if (s.tab === 'care') tabBody = this.tabCare(p, terakhir, jadwalAkan);
    else if (s.tab === 'berkas') tabBody = this.tabBerkas(p, d);
    else tabBody = this.tabBilling(p);

    return `
    <div class="row between"><span class="row small muted">${ic('person', 'sm c-primary')} ${p.Status === 'Arsip' ? 'Diarsipkan' : 'Status Rawat Jalan'}</span>
      <div class="row"><a class="btn btn-sm btn-secondary" href="#/pasien/ubah/${p.ID_Pasien}">${ic('edit', 'sm')} Ubah Data</a><button class="icon-btn sm" data-act="lainnya" aria-label="Lainnya">${ic('more_vert')}</button></div></div>
    <div class="card mt-12">
      <div class="row top gap-12">${avatar(p.Nama, p.ID_Pasien, 'lg solid')}<div class="grow"><div class="row between top"><p class="h2" style="line-height:26px">${esc(namaPasien(p))}</p><span class="small muted nowrap">${umur(p.Tgl_Lahir)} Th</span></div>
        <div class="row wrap mt-4"><span class="tag-mono">${esc(p.No_RM)}</span><span class="small muted row">${ic(p.Jenis_Kelamin === 'Perempuan' ? 'female' : 'male', 'xs')}${esc(p.Jenis_Kelamin || '')}</span></div></div></div>
      <div class="row wrap mt-12">${badge(p.Status === 'Arsip' ? 'Arsip' : jadwalAkan.length ? 'Pasien Aktif' : 'Rawat Jalan', p.Status === 'Arsip' ? '' : 'b-blue')}${p.Kategori_Kasus ? p.Kategori_Kasus.split(',').slice(0, 2).map(k => badge(k.trim(), 'b-blue', 'healing')).join('') : ''}${terakhir && terakhir.Fase_Rehab ? badge(terakhir.Fase_Rehab, 'b-teal') : ''}</div>
      <div class="inset row mt-12">${ic('location_on', 'sm muted')}<span class="small ellipsis grow">${esc(p.Alamat || '-')}</span></div>
      <div class="row mt-12"><a class="btn btn-teal grow" href="${waLink(p.No_WA, '')}" target="_blank" rel="noopener">${ic('chat', 'sm')} Kirim WA</a><a class="btn btn-secondary grow" href="tel:+${esc(p.No_WA)}">${ic('call', 'sm')} Telepon</a></div>
    </div>
    ${p.Alergi || p.Riwayat_Implan ? `<div class="clinical-alert mt-12"><p class="head">${ic('warning', 'fill')} PERHATIAN KLINIS & ALERGI</p>
      ${p.Alergi ? `<div class="item"><p class="k row">${ic('medication', 'xs')} Alergi obat / bahan</p><p class="mt-4">${esc(p.Alergi)}</p></div>` : ''}
      ${p.Riwayat_Implan ? `<div class="item"><p class="k row">${ic('healing', 'xs')} Riwayat implan / operasi</p><p class="mt-4">${esc(p.Riwayat_Implan)}</p></div>` : ''}</div>` : ''}
    <div class="row mt-16">
      <a class="btn btn-primary btn-sm grow" href="#/jadwal/baru?pasien=${p.ID_Pasien}">${ic('event', 'sm')} + Jadwal</a>
      <a class="btn btn-secondary btn-sm grow" href="#/soap/pasien/${p.ID_Pasien}">${ic('note_add', 'sm')} + SOAP</a>
      <button class="btn btn-outline btn-sm grow" data-act="tab" data-k="billing">${ic('receipt', 'sm')} Tagihan</button>
    </div>
    ${jadwalAkan.length ? `<a class="card tight row gap-12 mt-12" href="#/kunjungan/${jadwalAkan[0].ID_Kunjungan}" style="color:inherit"><div class="icon-tile sm">${ic('event_upcoming')}</div><div class="grow"><p class="tiny muted">Jadwal berikutnya</p><p class="strong">${fmtTgl(jadwalAkan[0].Tanggal, 'long')} · ${jadwalAkan[0].Jam_Mulai}</p></div>${ic('chevron_right', 'faint')}</a>` : ''}
    <div class="tabs mt-16">${[['soap', 'Riwayat SOAP'], ['care', 'Care Plan'], ['berkas', `Berkas (${nBerkas})`], ['billing', 'Billing']].map(([k, n]) => `<button class="tab ${s.tab === k ? 'active' : ''}" data-act="tab" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="mt-16">${tabBody}</div>
    ${p.Kontak_Darurat_Nama ? `<div class="card tint row gap-12 mt-24"><div class="icon-tile sm gray">${ic('contact_emergency')}</div><div class="grow"><p class="eyebrow gray">Kontak Darurat</p><p class="strong">${esc(p.Kontak_Darurat_Nama)}${p.Kontak_Darurat_Hubungan ? ' (' + esc(p.Kontak_Darurat_Hubungan) + ')' : ''}</p><p class="tiny mono c-primary">${esc(fmtWa(p.Kontak_Darurat_No))}</p></div>
      ${p.Kontak_Darurat_No ? `<a class="icon-btn outline" href="tel:+${esc(normWa(p.Kontak_Darurat_No) || p.Kontak_Darurat_No)}" aria-label="Telepon">${ic('call', 'c-primary')}</a>` : ''}</div>` : ''}`;
  },
  targetCard(r) {
    if (!r || (!r.ROM_Fleksi && !r.Fase_Rehab)) return '';
    const rom = num(r.ROM_Fleksi), tgt = num(r.ROM_Target) || 135;
    const pr = rom ? Math.min(100, Math.round(rom / tgt * 100)) : 0;
    return `<div class="card mb-16"><div class="row between"><h3 class="h3 row">${ic('directions_walk', 'c-primary')} Target Rehabilitasi</h3>${r.Fase_Rehab ? `<span class="strong c-primary small">${esc(r.Fase_Rehab.split(/[(—-]/)[0].trim())}</span>` : ''}</div>
      ${r.Fase_Rehab ? `<p class="small muted mt-4">${esc(r.Fase_Rehab)}</p>` : ''}
      ${rom ? `<div class="row between tiny mt-12"><span class="muted">Kemajuan ROM fleksi</span><b class="c-primary">${pr}%</b></div><div class="progress mt-4"><i style="width:${pr}%"></i></div>` : ''}
      <div class="grid2 mt-12">${rom ? `<div class="inset"><p class="tiny muted">ROM Fleksi</p><p class="h2 num">${rom}°<small class="small muted"> / ${tgt}°</small></p></div>` : ''}
        ${r.MMT ? `<div class="inset"><p class="tiny muted">MMT</p><p class="strong small mt-4">${esc(r.MMT)}</p></div>` : ''}</div></div>`;
  },
  tabSoap(p, rekam) {
    if (!rekam.length) return `<div class="card">${emptyState('clinical_notes', 'Belum ada rekam medis', 'Catat SOAP pertama untuk pasien ini.', `<a class="btn btn-primary btn-sm" href="#/soap/pasien/${p.ID_Pasien}">${ic('note_add', 'sm')} Catat SOAP</a>`)}</div>`;
    return this.targetCard(rekam[0]) + `<div class="row between mb-12"><h3 class="h2">Timeline Terapi & SOAP</h3><span class="tiny muted">${rekam.length} sesi</span></div>
      <div class="timeline">${rekam.map((r, i) => {
        const j = J(r.ID_Kunjungan), trx = r.ID_Kunjungan ? trxKunjungan(r.ID_Kunjungan) : null;
        const n = rekam.length - i;
        return `<div class="tl-item ${i === 0 ? 'first' : ''}"><div class="card ${i === 0 ? '' : 'tight'}">
          <div class="row between"><p class="${i === 0 ? 'h3 c-primary' : 'strong'}">Sesi #${n} <span class="small muted" style="font-weight:400">· ${fmtTgl(r.Tanggal)}</span></p>${trx ? badge(trx.Status_Bayar === 'Lunas' ? 'Lunas ' + rp(trx.Jumlah) : trx.Status_Bayar, trx.Status_Bayar === 'Lunas' ? 'b-green' : 'b-amber') : j ? badge(j.Status, j.Status === 'Selesai' ? 'b-green' : '') : ''}</div>
          ${j ? `<p class="tiny muted">${j.Jam_Mulai} WIB — ${j.Jenis === 'Visit' ? 'Visit Rumah' : 'Klinik'} · ${esc((L(j.ID_Layanan) || {}).Nama_Layanan || '')}</p>` : ''}
          ${i === 0 ? `<div class="inset mt-12">
            ${r.Keluhan ? `<div class="soap-line"><span class="l">S</span><span>${esc(r.Keluhan)}${r.VAS ? ` <b>VAS ${esc(r.VAS)}/10</b>` : ''}</span></div>` : ''}
            ${r.Pemeriksaan || r.ROM_Fleksi ? `<div class="soap-line"><span class="l">O</span><span>${r.ROM_Fleksi ? 'ROM fleksi ' + esc(r.ROM_Fleksi) + '°. ' : ''}${r.MMT ? 'MMT ' + esc(r.MMT) + '. ' : ''}${esc(r.Pemeriksaan)}</span></div>` : ''}
            ${r.Diagnosis ? `<div class="soap-line"><span class="l">A</span><span>${r.Kode_ICD10 ? '<span class="mono">' + esc(r.Kode_ICD10) + '</span> ' : ''}${esc(r.Diagnosis)}</span></div>` : ''}
            ${r.Tindakan || r.Resep_Anjuran ? `<div class="soap-line"><span class="l">P</span><span>${esc(r.Tindakan)}${r.Resep_Anjuran ? ' — ' + esc(r.Resep_Anjuran) : ''}</span></div>` : ''}
          </div>` : `<p class="small mt-8 clamp2">${esc([r.Diagnosis, r.Tindakan].filter(Boolean).join(' · ') || r.Keluhan)}</p>`}
          <div class="row between mt-12">${trx ? `<span class="tiny mono muted">${rp(trx.Jumlah)} (${esc(trx.Metode_Bayar)})</span>` : '<span></span>'}<button class="link-btn" data-act="bukaRekam" data-id="${r.ID_Rekam}">Buka Rekam Medis ${ic('arrow_forward', 'sm')}</button></div>
        </div></div>`;
      }).join('')}</div>`;
  },
  tabCare(p, r, akan) {
    if (!r) return `<div class="card">${emptyState('assignment', 'Care plan belum tersedia', 'Care plan disusun dari SOAP terakhir.')}</div>`;
    const kontrol = r.Rencana_Kontrol;
    const sudah = kontrol && akan.find(j => j.Tanggal === kontrol);
    return this.targetCard(r) + `<div class="card stack-sm">
      <h3 class="h3 row">${ic('assignment', 'c-primary')} Rencana Terapi (dari sesi ${fmtTgl(r.Tanggal)})</h3>
      <div class="kv-row"><span class="k">Diagnosis</span><span class="v">${esc(r.Diagnosis || '-')}</span></div>
      ${r.Kode_ICD10 ? `<div class="kv-row"><span class="k">ICD-10</span><span class="v mono">${esc(r.Kode_ICD10)}</span></div>` : ''}
      <div class="kv-row"><span class="k">Fase rehabilitasi</span><span class="v">${esc(r.Fase_Rehab || '-')}</span></div>
      <p class="eyebrow gray mt-12">Tindakan / latihan</p><p class="small">${esc(r.Tindakan || '-')}</p>
      <p class="eyebrow gray mt-12">Resep / anjuran</p><p class="small">${esc(r.Resep_Anjuran || '-')}</p>
    </div>
    <div class="card mt-12 row gap-12"><div class="icon-tile sm">${ic('event_upcoming')}</div><div class="grow"><p class="tiny muted">Rencana kontrol berikutnya</p><p class="strong">${kontrol ? fmtTgl(kontrol, 'long') : 'Belum ditentukan'}</p>${sudah ? badge('Sudah dijadwalkan ' + sudah.Jam_Mulai, 'b-green') : ''}</div>
      ${kontrol && !sudah ? `<a class="btn btn-sm btn-primary" href="#/jadwal/baru?${qs({ pasien: p.ID_Pasien, tgl: kontrol, catatan: 'Kontrol lanjutan' })}">Jadwalkan</a>` : ''}</div>`;
  },
  tabBerkas(p, d) {
    if (!d.berkasLoaded) return skeleton(2);
    const label = { Rontgen_Pemeriksaan: 'Rontgen', Persetujuan: 'Consent', Bukti_Bayar: 'Bukti Bayar' };
    return `<div class="card"><div class="row between mb-12"><h3 class="h3 row">${ic('radiology', 'c-primary')} Berkas Radiologi & Klinis</h3><button class="link-btn" data-act="unggah">${ic('upload_file', 'sm')} Unggah</button></div>
      ${d.berkas.length ? `<div class="thumb-grid">${d.berkas.map(b => `<a href="${esc(b.url)}" target="_blank" rel="noopener" style="color:inherit"><div class="thumb">${b.thumb ? `<img src="${b.thumb}" alt="">` : ic(b.mime.includes('pdf') ? 'picture_as_pdf' : 'description', 'lg')}<span class="cap">${label[b.kategori] || b.kategori}</span></div>
        <p class="small strong ellipsis mt-4">${esc(b.label || b.nama)}</p><p class="tiny mono muted">${fmtTgl(b.tanggal.slice(0, 10), 'dm')} · ${(b.ukuran / 1048576).toFixed(1)} MB</p></a>`).join('')}</div>`
        : emptyState('folder_open', 'Belum ada berkas', 'Unggah rontgen, hasil pemeriksaan, atau informed consent.')}
      <p class="tiny muted mt-12 row">${ic('lock', 'xs')} Berkas privat di Google Drive — terbuka hanya dengan akun Google admin.</p></div>`;
  },
  tabBilling(p) {
    const tx = S.transaksi.filter(t => t.ID_Pasien === p.ID_Pasien && t.Tipe === 'Pemasukan').sort((a, b) => (b.Tanggal + b.Waktu).localeCompare(a.Tanggal + a.Waktu));
    const total = sum(tx, 'Jumlah'), sisa = sum(tx.filter(t => t.Status_Bayar !== 'Lunas'), t => num(t.Jumlah) - num(t.Dibayar));
    return `<div class="grid2"><div class="stat"><p class="lbl">Total Tagihan</p><p class="val" style="font-size:18px">${rp(total)}</p></div><div class="stat ${sisa ? 'danger' : ''}"><p class="lbl">Sisa Belum Lunas</p><p class="val ${sisa ? 'c-danger' : ''}" style="font-size:18px">${rp(sisa)}</p></div></div>
      <div class="stack-sm mt-12">${tx.length ? tx.map(t => `<a class="card tight" href="#/kuitansi/${t.ID_Transaksi}" style="color:inherit"><div class="row between"><span class="tag-mono gray">${esc(t.No_Invoice)}</span>${badge(t.Status_Bayar === 'Belum' ? 'Belum Lunas' : t.Status_Bayar, t.Status_Bayar === 'Lunas' ? 'b-green' : t.Status_Bayar === 'DP' ? 'b-amber' : 'b-red')}</div>
        <div class="row between mt-8"><div><p class="strong">${esc(t.Deskripsi)}</p><p class="tiny muted">${fmtTgl(t.Tanggal)} · ${esc(t.Metode_Bayar)}</p></div><span class="money">${rp(t.Jumlah)}</span></div></a>`).join('') : `<div class="card">${emptyState('receipt_long', 'Belum ada tagihan')}</div>`}</div>`;
  },
  actions: {
    tab: (el, e, ctx) => { ctx.state.tab = el.dataset.k; ctx.rerender(); },
    unggah: (el, e, ctx) => unggahBerkasPasien(ctx.params[0], () => { S.detail[ctx.params[0]] = null; ctx.state.loading = false; ctx.rerender(); }),
    bukaRekam: (el, e, ctx) => bukaRekamSheet(ctx.params[0], el.dataset.id),
    lainnya: (el, e, ctx) => {
      const p = P(ctx.params[0]);
      openSheet({
        title: 'Aksi Pasien',
        body: `<div class="pick-list"><div class="pick" data-sact="ubah">${ic('edit', 'c-primary')}<span>Ubah data pasien</span></div>
          <div class="pick" data-sact="muat">${ic('refresh', 'c-primary')}<span>Muat ulang rekam medis & berkas</span></div>
          <div class="pick" data-sact="arsip">${ic(p.Status === 'Arsip' ? 'unarchive' : 'archive', p.Status === 'Arsip' ? 'c-primary' : 'c-danger')}<span>${p.Status === 'Arsip' ? 'Pulihkan dari arsip' : 'Arsipkan pasien (soft delete)'}</span></div></div>`,
        onAction: async (a, b, s) => {
          s.close();
          if (a === 'ubah') go('#/pasien/ubah/' + p.ID_Pasien);
          if (a === 'muat') { S.detail[p.ID_Pasien] = null; ctx.state.loading = false; ctx.rerender(); }
          if (a === 'arsip') {
            const pul = p.Status === 'Arsip';
            if (!pul && !await confirmSheet({ title: 'Arsipkan ' + p.Nama + '?', message: 'Data tidak dihapus, hanya disembunyikan dari daftar aktif. Bisa dipulihkan kapan saja.', okText: 'Arsipkan', danger: true })) return;
            const r = await run('arsipPasien', { id: p.ID_Pasien, pulihkan: pul });
            if (r.success) ctx.rerender();
          }
        }
      });
    }
  }
};

/** Sheet detail 1 rekam medis + buat surat PDF */
function bukaRekamSheet(idPasien, idRekam) {
  const d = S.detail[idPasien], r = d && d.rekam.find(x => x.ID_Rekam === idRekam);
  if (!r) return;
  const p = P(idPasien), t = T(r.ID_Tenaga);
  const baris = [['Keluhan (S)', r.Keluhan + (r.VAS ? ` — VAS ${r.VAS}/10` : '') + (r.Kepatuhan ? ` · Latihan rumah: ${r.Kepatuhan}` : '')],
    ['Tanda vital', [r.Tekanan_Darah && 'TD ' + r.Tekanan_Darah + ' mmHg', r.Nadi && 'Nadi ' + r.Nadi + ' bpm', r.Suhu && 'Suhu ' + r.Suhu + '°C', r.SpO2 && 'SpO₂ ' + r.SpO2 + '%'].filter(Boolean).join(' · ')],
    ['ROM / MMT', [r.ROM_Fleksi && `Fleksi ${r.ROM_Fleksi}°/${r.ROM_Target || '-'}°`, r.ROM_Ekstensi && 'Ekstensi ' + r.ROM_Ekstensi, r.MMT].filter(Boolean).join(' · ')],
    ['Pemeriksaan (O)', r.Pemeriksaan], ['Diagnosis (A)', (r.Kode_ICD10 ? r.Kode_ICD10 + ' — ' : '') + r.Diagnosis], ['Fase', r.Fase_Rehab],
    ['Tindakan (P)', r.Tindakan], ['Resep / anjuran', r.Resep_Anjuran], ['Rencana kontrol', r.Rencana_Kontrol ? fmtTgl(r.Rencana_Kontrol, 'long') : ''], ['Tenaga medis', t ? t.Nama : '']].filter(b => b[1]);
  const links = String(r.Link_Berkas || '').split(/\s*,\s*/).filter(Boolean);
  openSheet({
    title: 'Rekam Medis · ' + fmtTgl(r.Tanggal),
    body: `<p class="tiny mono muted mb-8">${esc(r.ID_Rekam)}${r.ID_Kunjungan ? ' · ' + esc(r.ID_Kunjungan) : ''}</p>
      ${baris.map(([k, v]) => `<div class="mb-12"><p class="eyebrow gray">${k}</p><p class="small mt-4">${esc(v)}</p></div>`).join('')}
      ${links.length ? `<p class="eyebrow gray">Berkas terlampir</p>${links.map((l, i) => `<a class="row small mt-4" href="${esc(l)}" target="_blank" rel="noopener">${ic('attach_file', 'sm')} Berkas ${i + 1}</a>`).join('')}` : ''}
      ${r.Link_Surat ? `<a class="row small mt-12" href="${esc(r.Link_Surat)}" target="_blank" rel="noopener">${ic('description', 'sm')} Surat PDF terakhir</a>` : ''}`,
    foot: `<a class="btn btn-secondary" href="#/soap/${r.ID_Kunjungan || 'pasien/' + idPasien}${r.ID_Kunjungan ? '' : '?rekam=' + r.ID_Rekam}" data-sact="close">${ic('edit', 'sm')} Ubah</a><button class="btn btn-primary" data-sact="surat">${ic('picture_as_pdf', 'sm')} Surat PDF</button>`,
    onAction: (a, b, ctx) => { if (a === 'surat') { ctx.close(); buatSuratSheet(p, r); } }
  });
}

function buatSuratSheet(p, r) {
  openSheet({
    title: 'Buat Surat PDF',
    body: `<div class="seg mb-12"><button class="active" data-sact="jenis" data-v="Keterangan">Surat Keterangan</button><button data-sact="jenis" data-v="Hasil Pemeriksaan">Hasil Pemeriksaan</button></div>
      <label class="field"><span>Catatan tambahan <em>opsional</em></span><textarea id="sk-cat" rows="3" placeholder="Contoh: Pasien disarankan istirahat 3 hari"></textarea></label>
      <label class="check small mt-12"><input type="checkbox" id="sk-share" ${setting('MODE_KIRIM_PDF') === 'tautan' ? 'checked' : ''}><span>Buat tautan unduh untuk WhatsApp (otomatis dicabut setelah 24 jam)</span></label>`,
    foot: `<button class="btn btn-primary" data-sact="buat">${ic('picture_as_pdf', 'sm')} Buat PDF Berkop</button>`,
    onAction: async (a, b, ctx) => {
      if (a === 'jenis') { ctx.el.querySelectorAll('[data-sact=jenis]').forEach(x => x.classList.toggle('active', x === b)); return; }
      if (a !== 'buat') return;
      const jenis = ctx.el.querySelector('[data-sact=jenis].active').dataset.v;
      const res = await run('buatSurat', { idRekam: r.ID_Rekam, jenis, catatan: ctx.el.querySelector('#sk-cat').value, share: ctx.el.querySelector('#sk-share').checked }, { btn: b, loadingText: ' Membuat PDF…' });
      if (!res.success) return;
      ctx.close();
      r.Link_Surat = res.data.url;
      kirimPdfSheet({
        judul: 'Surat Siap Dikirim', data: res.data, pasien: p,
        pesan: link => fillTpl(setting('WA_TPL_SURAT'), { sapaan: p.Sapaan || 'Bapak/Ibu', nama: p.Nama, klinik: setting('NAMA_KLINIK'), link })
      });
    }
  });
}

// ============================================
// REKAM MEDIS — FORM SOAP
// ============================================
const MMT_OPT = ['', '0/5', '1/5', '2/5', '3-/5', '3/5', '3+/5', '4-/5', '4/5', '4+/5', '5/5'];
const ICD_UMUM = [
  ['M17.0', 'Osteoartritis lutut bilateral primer'], ['M17.1', 'Osteoartritis lutut unilateral primer'], ['M23.2', 'Derangement meniskus'],
  ['S83.5', 'Sprain/ruptur ligamen cruciatum lutut (ACL/PCL)'], ['M75.0', 'Adhesive capsulitis (frozen shoulder)'], ['M75.1', 'Rotator cuff syndrome'],
  ['M54.5', 'Low back pain'], ['M51.1', 'HNP lumbal dengan radikulopati'], ['S42.0', 'Fraktur klavikula'], ['S52.5', 'Fraktur radius distal'],
  ['S72.0', 'Fraktur collum femur'], ['S82.6', 'Fraktur maleolus lateral'], ['M77.1', 'Epikondilitis lateral (tennis elbow)'], ['G56.0', 'Carpal tunnel syndrome'],
  ['M65.3', 'Trigger finger'], ['M72.2', 'Plantar fasciitis'], ['Z47.8', 'Perawatan lanjutan orthopedi pasca operasi'], ['Z96.6', 'Adanya implan sendi orthopedi']
];
const TEMPLATE_SOAP = {
  Lutut: { Pemeriksaan: 'Inspeksi: edema minimal, luka insisi kering. Palpasi: nyeri tekan minimal. Tes stabilitas: Lachman (-), anterior drawer (-).', Tindakan: 'Mobilisasi patella grade II-III, elektroterapi TENS & ultrasound, latihan closed kinetic chain (mini-squat), penguatan isometrik quadriceps.', Resep_Anjuran: 'Kompres es 15 menit 3x/hari, latihan straight leg raise 3x10 di rumah.' },
  Bahu: { Pemeriksaan: 'ROM bahu terbatas pada abduksi & rotasi eksternal. Painful arc (+). Tes Neer/Hawkins dicatat.', Tindakan: 'Mobilisasi sendi glenohumeral, pendulum exercise, stretching kapsul posterior, ultrasound terapi.', Resep_Anjuran: 'Latihan pendulum & wall climbing 2x/hari, hindari mengangkat beban di atas kepala.' },
  Tulang_Belakang: { Pemeriksaan: 'Postur, spasme otot paravertebral, SLR test, pemeriksaan neurologis ekstremitas bawah.', Tindakan: 'TENS, mobilisasi lumbal, core stabilization exercise, McKenzie extension.', Resep_Anjuran: 'Ergonomi duduk, latihan core 10 menit/hari, hindari membungkuk mengangkat beban.' },
  Fraktur: { Pemeriksaan: 'Evaluasi gips/bidai, neurovaskular distal baik (CRT <2 dtk), edema, tanda infeksi tidak ada.', Tindakan: 'Evaluasi gips, latihan ROM sendi bebas di proksimal & distal, edukasi elevasi.', Resep_Anjuran: 'Elevasi ekstremitas, jaga gips tetap kering, kontrol X-Ray sesuai jadwal.' }
};

Pages.soap = {
  nav: null,
  backTo: ctx => ctx.state.j ? '#/kunjungan/' + ctx.state.j.ID_Kunjungan : '#/pasien/' + ctx.state.idPasien,
  header: ctx => ({ type: 'sub', title: 'Rekam Medis (SOAP)' }),
  init(ctx) {
    ctx.dirty = true;
    const byPasien = ctx.path.startsWith('soap/pasien/');
    const j = byPasien ? null : J(ctx.params[0]);
    const idPasien = byPasien ? ctx.params[0] : j && j.ID_Pasien;
    ctx.state = {
      j, idPasien, closed: {}, links: [], loaded: false, buatKontrol: false,
      f: { ID_Rekam: '', ID_Kunjungan: j ? j.ID_Kunjungan : '', ID_Pasien: idPasien, Tanggal: j ? j.Tanggal : todayStr(), ID_Tenaga: j ? j.ID_Tenaga : '', VAS: '', ROM_Target: '120', mmtQ: '', mmtH: '' }
    };
    const draft = Draft.get('soap_' + (j ? j.ID_Kunjungan : idPasien));
    if (draft && !ctx.q.rekam) { Object.assign(ctx.state.f, draft); ctx.state.fromDraft = true; }
  },
  mount(ctx) {
    const s = ctx.state;
    if (s.loaded || !s.idPasien) return;
    s.loaded = true;
    muatDetailPasien(s.idPasien, false, true).then(d => {
      const r = ctx.q.rekam ? d.rekam.find(x => x.ID_Rekam === ctx.q.rekam) : s.j ? d.rekam.find(x => x.ID_Kunjungan === s.j.ID_Kunjungan) : null;
      if (r) {
        Object.assign(s.f, r);
        const m = String(r.MMT || '').match(/Quadriceps\s*([\d+\-/]+)/i), h = String(r.MMT || '').match(/Hamstring\s*([\d+\-/]+)/i);
        s.f.mmtQ = m ? m[1] : ''; s.f.mmtH = h ? h[1] : '';
        s.links = String(r.Link_Berkas || '').split(/\s*,\s*/).filter(Boolean);
        s.fromDraft = false;
        if (App.ctx === ctx) ctx.rerender();
      }
    });
  },
  sec(ctx, L1, title, sub, body) {
    const closed = ctx.state.closed[L1];
    return `<div class="card soap-sec ${closed ? 'closed' : ''} mt-12"><div class="head" data-act="toggle" data-k="${L1}"><span class="letter">${L1}</span><div class="grow"><p class="h3">${title}</p><p class="tiny muted">${sub}</p></div>${ic('expand_more', 'chev')}</div><div class="body">${body}</div></div>`;
  },
  inp(f, k, label, opt = {}) {
    const v = esc(f[k] || '');
    if (opt.area) return `<label class="field ${opt.cls || ''}"><span>${label}</span><textarea rows="${opt.rows || 3}" data-on="f" data-f="${k}" placeholder="${esc(opt.ph || '')}">${v}</textarea></label>`;
    return `<label class="field ${opt.cls || ''}"><span>${label}</span><input ${opt.type ? `type="${opt.type}"` : ''} ${opt.mode ? `inputmode="${opt.mode}"` : ''} ${opt.list ? `list="${opt.list}"` : ''} data-on="f" data-f="${k}" value="${v}" placeholder="${esc(opt.ph || '')}" class="${opt.mono ? 'mono' : ''}"></label>`;
  },
  render(ctx) {
    const s = ctx.state, f = s.f, p = P(s.idPasien);
    if (!p) return emptyState('person_off', 'Pasien tidak ditemukan');
    const nSesi = S.detail[p.ID_Pasien] ? S.detail[p.ID_Pasien].rekam.length + (f.ID_Rekam ? 0 : 1) : '';
    const tenaga = S.tenaga.filter(t => t.Status !== 'Nonaktif' || t.ID_Tenaga === f.ID_Tenaga);
    const vas = num(f.VAS), rom = num(f.ROM_Fleksi), tgt = num(f.ROM_Target) || 120;
    return `
    <div class="card">
      <div class="row gap-12">${avatar(p.Nama, p.ID_Pasien, 'solid')}<div class="grow"><p class="h3 ellipsis">${esc(namaPasien(p))} <span class="small muted">(${umur(p.Tgl_Lahir)} Th · ${esc((p.Jenis_Kelamin || '')[0] || '')})</span></p>
        <div class="row wrap mt-4"><span class="tag-mono">${esc(p.No_RM)}</span>${nSesi ? badge('Sesi #' + nSesi, 'b-blue') : ''}${p.Alergi ? badge('Alergi ' + p.Alergi.split(/[,(]/)[0], 'b-red', 'warning') : ''}</div></div></div>
      <div class="grid2 mt-12"><label class="field soft"><span>Tanggal</span><input type="date" data-on="f" data-f="Tanggal" value="${esc(f.Tanggal)}"></label>
        <label class="field soft"><span>DPJP / Tenaga</span><select data-on="f" data-f="ID_Tenaga"><option value="">— pilih —</option>${selOpts(tenaga, f.ID_Tenaga, t => t.Nama, t => t.ID_Tenaga)}</select></label></div>
    </div>
    ${s.fromDraft ? `<div class="alert alert-amber mt-12">${ic('history')}<div class="grow">Draft belum tersimpan dipulihkan.</div><button class="link-btn" data-act="buangDraft">Buang</button></div>` : ''}
    <div class="chips mt-12"><span class="small muted row nowrap">${ic('auto_awesome', 'sm c-primary')} Template:</span>${Object.keys(TEMPLATE_SOAP).map(k => `<button class="chip sm" data-act="template" data-k="${k}">${k.replace('_', ' ')}</button>`).join('')}</div>

    ${this.sec(ctx, 'S', 'Subjektif', 'Keluhan utama & evaluasi mandiri pasien', `
      ${this.inp(f, 'Keluhan', 'Keluhan pasien', { area: true, ph: 'Contoh: nyeri lutut berkurang setelah kompres dingin, masih kaku di pagi hari' })}
      <div class="inset mt-12"><div class="row between"><span class="strong small row">${ic('monitor_heart', 'sm')} Visual Analogue Scale (VAS)</span>${badge(f.VAS === '' ? 'Belum diisi' : `Skor ${vas}/10 · ${vas <= 3 ? 'Ringan' : vas <= 6 ? 'Sedang' : 'Berat'}`, f.VAS === '' ? '' : vas <= 3 ? 'b-blue' : vas <= 6 ? 'b-amber' : 'b-red')}</div>
        <input type="range" class="range mt-12" min="0" max="10" step="1" value="${f.VAS === '' ? 0 : vas}" data-on="vas"><div class="row between tiny muted"><span>0 (Tidak nyeri)</span><span>10 (Sangat nyeri)</span></div></div>
      <p class="flabel mt-12 mb-8">Kepatuhan latihan rumah</p>
      <div class="chips wrap">${['Rutin Dilakukan', 'Kadang-kadang', 'Tidak Dilakukan'].map(k => `<button class="chip sm ${f.Kepatuhan === k ? 'active' : ''}" data-act="pilih" data-f="Kepatuhan" data-v="${k}">${k}</button>`).join('')}</div>`)}

    ${this.sec(ctx, 'O', 'Objektif', 'Tanda vital, goniometri & temuan klinis', `
      <div class="grid2">${this.inp(f, 'Tekanan_Darah', 'Tekanan darah (mmHg)', { ph: '120/80', mono: true, cls: 'soft' })}${this.inp(f, 'Nadi', 'Denyut nadi (bpm)', { mode: 'numeric', mono: true, cls: 'soft' })}
        ${this.inp(f, 'Suhu', 'Suhu (°C)', { mode: 'decimal', mono: true, cls: 'soft' })}${this.inp(f, 'SpO2', 'Saturasi O₂ (%)', { mode: 'numeric', mono: true, cls: 'soft' })}</div>
      <div class="inset mt-12"><p class="strong small">ROM Goniometri</p>
        <div class="grid2 mt-8">${this.inp(f, 'ROM_Fleksi', 'Fleksi aktif (°)', { mode: 'numeric', mono: true })}${this.inp(f, 'ROM_Target', 'Target (°)', { mode: 'numeric', mono: true })}</div>
        ${rom ? `<div class="row between tiny mt-8"><span class="muted">Capaian</span><b class="c-primary">${Math.round(rom / tgt * 100)}%</b></div><div class="progress mt-4"><i style="width:${Math.min(100, rom / tgt * 100)}%"></i></div>` : ''}
        <div class="mt-8">${this.inp(f, 'ROM_Ekstensi', 'Ekstensi aktif', { ph: '0° (penuh/normal)' })}</div></div>
      <div class="inset mt-12"><p class="strong small">Kekuatan Otot (MMT)</p><div class="grid2 mt-8">
        <label class="field"><span>Quadriceps</span><select data-on="f" data-f="mmtQ">${selOpts(MMT_OPT, f.mmtQ, x => x || '—')}</select></label>
        <label class="field"><span>Hamstring</span><select data-on="f" data-f="mmtH">${selOpts(MMT_OPT, f.mmtH, x => x || '—')}</select></label></div></div>
      <div class="mt-12">${this.inp(f, 'Pemeriksaan', 'Temuan fisik lokal', { area: true, ph: 'Contoh: edema minimal infrapatelar, luka insisi kering' })}</div>
      <div class="row between mt-16"><p class="strong small row">${ic('attach_file', 'sm')} Foto & penunjang klinis</p><span class="tiny muted">${s.links.length} terlampir</span></div>
      ${s.links.length ? s.links.map((l, i) => `<a class="row small mt-4" href="${esc(l)}" target="_blank" rel="noopener">${ic('image', 'sm')} Berkas ${i + 1}</a>`).join('') : ''}
      <div class="upload-drop mt-8"><p class="small muted">Unggah X-Ray, foto klinis (JPG/PNG/PDF)</p><div class="row mt-8" style="justify-content:center"><button class="btn btn-sm btn-secondary" data-act="unggah">${ic('photo_camera', 'sm')} Kamera / Galeri</button></div></div>`)}

    ${this.sec(ctx, 'A', 'Asesmen', 'Diagnosis klinis & fase pemulihan', `
      <div class="grid2" style="grid-template-columns:120px 1fr">${this.inp(f, 'Kode_ICD10', 'ICD-10', { mono: true, list: 'icd-list', ph: 'M17.0' })}${this.inp(f, 'Diagnosis', 'Diagnosis utama', { ph: 'Ketik atau pilih kode' })}</div>
      <datalist id="icd-list">${ICD_UMUM.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</datalist>
      <div class="mt-12">${this.inp(f, 'Fase_Rehab', 'Status fase rehabilitasi', { ph: 'Contoh: Fase 2 Pemulihan (minggu ke-6 post-op)' })}</div>`)}

    ${this.sec(ctx, 'P', 'Rencana (Plan)', 'Tindakan terapi, anjuran & kontrol', `
      ${this.inp(f, 'Tindakan', 'Tindakan terapi hari ini', { area: true })}
      <div class="mt-12">${this.inp(f, 'Resep_Anjuran', 'Resep / anjuran / latihan rumah', { area: true, rows: 2 })}</div>
      <div class="inset mt-12"><p class="strong small row">${ic('event_upcoming', 'sm')} Rencana kontrol berikutnya</p>
        <div class="row mt-8"><button class="chip sm" data-act="kontrol" data-n="7">+7 hari</button><button class="chip sm" data-act="kontrol" data-n="14">+14 hari</button><button class="chip sm" data-act="kontrol" data-n="30">+30 hari</button></div>
        <label class="field mt-8"><input type="date" data-on="f" data-f="Rencana_Kontrol" value="${esc(f.Rencana_Kontrol || '')}" min="${todayStr()}"></label>
        <label class="check small mt-12"><input type="checkbox" data-on="buatKontrol" ${s.buatKontrol ? 'checked' : ''}><span>Setelah simpan, buat jadwal kontrol (otomatis masuk Google Calendar)</span></label></div>`)}
    <p class="tiny muted center mt-16 row" style="justify-content:center">${ic('lock', 'xs')} Tercatat di log audit sesuai UU PDP</p>`;
  },
  bar(ctx) {
    const j = ctx.state.j;
    const lanjut = j && j.Status === 'Terjadwal';
    return `<button class="icon-btn soft" data-act="draft" aria-label="Simpan draft" style="width:52px;height:52px">${ic('save')}</button>` +
      `<button class="btn btn-primary grow" data-act="simpan">${ic(lanjut ? 'arrow_forward' : 'check_circle', 'sm')} ${lanjut ? 'Simpan & Lanjut Tindakan' : 'Simpan Rekam Medis'}</button>`;
  },
  inputs: {
    f: (el, e, ctx) => {
      ctx.state.f[el.dataset.f] = el.value;
      if (el.dataset.f === 'Kode_ICD10' && e.type === 'change') {
        const hit = ICD_UMUM.find(x => x[0] === el.value.trim().toUpperCase());
        if (hit && !ctx.state.f.Diagnosis) { ctx.state.f.Diagnosis = hit[1]; ctx.rerender(); }
      }
      if (['ROM_Fleksi', 'ROM_Target'].includes(el.dataset.f) && e.type === 'change') ctx.rerender();
    },
    vas: (el, e, ctx) => { ctx.state.f.VAS = el.value; if (e.type === 'change') ctx.rerender(); else { const b = el.closest('.inset').querySelector('.badge'); const v = Number(el.value); b.className = 'badge ' + (v <= 3 ? 'b-blue' : v <= 6 ? 'b-amber' : 'b-red'); b.textContent = `Skor ${v}/10 · ${v <= 3 ? 'Ringan' : v <= 6 ? 'Sedang' : 'Berat'}`; } },
    buatKontrol: (el, e, ctx) => { ctx.state.buatKontrol = el.checked; }
  },
  actions: {
    toggle: (el, e, ctx) => { const k = el.dataset.k; ctx.state.closed[k] = !ctx.state.closed[k]; ctx.rerender(); },
    pilih: (el, e, ctx) => { ctx.state.f[el.dataset.f] = el.dataset.v; ctx.rerender(); },
    kontrol: (el, e, ctx) => { ctx.state.f.Rencana_Kontrol = addDays(todayStr(), Number(el.dataset.n)); ctx.state.buatKontrol = true; ctx.rerender(); },
    template: (el, e, ctx) => {
      const t = TEMPLATE_SOAP[el.dataset.k], f = ctx.state.f;
      Object.keys(t).forEach(k => { f[k] = f[k] ? f[k] + (f[k].includes(t[k]) ? '' : '\n' + t[k]) : t[k]; });
      ctx.rerender(); toast('Template ' + el.dataset.k.replace('_', ' ') + ' diterapkan.', 'info');
    },
    buangDraft: (el, e, ctx) => { Draft.del('soap_' + (ctx.state.j ? ctx.state.j.ID_Kunjungan : ctx.state.idPasien)); App.route(); },
    draft: (el, e, ctx) => { Draft.set('soap_' + (ctx.state.j ? ctx.state.j.ID_Kunjungan : ctx.state.idPasien), ctx.state.f); toast('Draft tersimpan di perangkat ini.', 'info'); },
    unggah: (el, e, ctx) => unggahBerkasPasien(ctx.state.idPasien, data => { ctx.state.links.push(data.url); if (S.detail[ctx.state.idPasien]) S.detail[ctx.state.idPasien].berkasLoaded = false; ctx.rerender(); }),
    simpan: async (el, e, ctx) => {
      const s = ctx.state, f = Object.assign({}, s.f);
      f.MMT = [s.f.mmtQ && 'Quadriceps ' + s.f.mmtQ, s.f.mmtH && 'Hamstring ' + s.f.mmtH].filter(Boolean).join('; ');
      f.Link_Berkas = s.links.join(', ');
      delete f.mmtQ; delete f.mmtH;
      if (!f.Keluhan && !f.Diagnosis && !f.Pemeriksaan) return toast('Isi minimal keluhan, pemeriksaan, atau diagnosis.', 'err');
      const res = await run('saveRekam', f, { btn: el, loadingText: ' Menyimpan…' });
      if (!res.success) return;
      Draft.del('soap_' + (s.j ? s.j.ID_Kunjungan : s.idPasien));
      ctx.dirty = false;
      if (S.detail[s.idPasien]) { const d = S.detail[s.idPasien]; if (!d.rekam.find(x => x.ID_Rekam === res.data.ID_Rekam)) d.rekam.unshift(res.data); d.rekam.sort((a, b) => a.Tanggal < b.Tanggal ? 1 : -1); }
      if (s.buatKontrol && f.Rencana_Kontrol) { location.replace('#/jadwal/baru?' + qs({ pasien: s.idPasien, tgl: f.Rencana_Kontrol, catatan: 'Kontrol lanjutan: ' + (f.Diagnosis || '') })); return; }
      if (s.j && s.j.Status === 'Terjadwal') location.replace('#/tindakan/' + s.j.ID_Kunjungan);
      else location.replace('#/pasien/' + s.idPasien);
    }
  }
};
