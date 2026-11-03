/**
 * ALUR KASIR — Tindakan & Resep → Kasir & Bayar → Kuitansi (e-Receipt)
 * Draft item disimpan lokal per kunjungan (Draft 'tx_<ID_Kunjungan>').
 */

function draftTindakan(j) {
  const ada = Draft.get('tx_' + j.ID_Kunjungan);
  if (ada && ada.items) return ada;
  const l = L(j.ID_Layanan), t = T(j.ID_Tenaga);
  const items = [];
  if (l) items.push({ tipe: 'tindakan', ref: l.ID_Layanan, nama: l.Nama_Layanan, qty: 1, harga: tarif(l, j.Jenis), ket: (t ? t.Nama : '') + ' · ' + (l.Durasi_Menit || '') + ' menit', utama: true });
  resepLayanan(j.ID_Layanan).forEach(r => {
    const s = B(r.ID_Bahan);
    if (s) items.push({ tipe: 'bmhp', ref: s.ID_Bahan, nama: s.Nama, qty: num(r.Qty_Pakai), harga: num(s.Harga_Jual), ket: 'Resep bahan layanan' });
  });
  return { items, resepMode: 'farmasi', resepLuar: '', kirimResep: true };
}
const subtotal = (items, tipe) => items.filter(i => !tipe || i.tipe === tipe).reduce((a, i) => a + num(i.qty) * num(i.harga), 0);
function cekAlergi(p, nama) {
  const kata = String(p.Alergi || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 5);
  return kata.some(w => String(nama).toLowerCase().includes(w));
}
function crumbsKasir(id, cur) {
  const steps = [['SOAP', '#/soap/' + id], ['Tindakan & Resep', '#/tindakan/' + id], ['Kasir & Bayar', '#/kasir/' + id]];
  return `<div class="crumbs mb-12">${steps.map(([n, h], i) => `${i ? ic('chevron_right', 'xs faint') : ''}<a class="c ${i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : ''}" href="${h}">${i + 1 < cur ? ic('check', 'xs') : i + 1 + '.'} ${n}</a>`).join('')}</div>`;
}
function headerPasienKasir(j, p, extra = '') {
  return `<div class="card"><div class="row between top"><div class="grow"><p class="h3">${esc(namaPasien(p))} <span class="small muted">(${umur(p.Tgl_Lahir)} Th)</span></p>
    <div class="row wrap mt-4">${badge(j.Jenis === 'Visit' ? 'Visit Rumah' : 'Klinik', j.Jenis === 'Visit' ? 'b-teal' : 'b-blue')}<span class="tiny mono muted">No. RM: ${esc(p.No_RM)}</span></div></div>
    <a class="icon-btn soft sm" href="#/pasien/${p.ID_Pasien}" aria-label="Profil">${ic('folder_shared', 'sm c-primary')}</a></div>
    <div class="grid2 mt-12"><div class="inset"><p class="tiny muted">Diagnosis klinis</p><p class="small strong ellipsis">${esc(p.Diagnosis_Utama || '-')}</p></div><div class="inset"><p class="tiny muted">Tanggal kunjungan</p><p class="small strong">${fmtTgl(j.Tanggal)}</p></div></div>${extra}</div>`;
}

// ============================================
// TINDAKAN & RESEP
// ============================================
Pages.tindakan = {
  nav: null,
  backTo: ctx => '#/kunjungan/' + ctx.params[0],
  header: () => ({ type: 'sub', title: 'Tindakan & Resep' }),
  init(ctx) {
    ctx.dirty = true;
    const j = J(ctx.params[0]);
    ctx.state = { j, d: j ? draftTindakan(j) : null };
  },
  save(ctx) { Draft.set('tx_' + ctx.state.j.ID_Kunjungan, ctx.state.d); },
  render(ctx) {
    const { j, d } = ctx.state;
    if (!j) return emptyState('event_busy', 'Kunjungan tidak ditemukan');
    if (j.Status === 'Selesai') { const trx = trxKunjungan(j.ID_Kunjungan); return emptyState('task_alt', 'Kunjungan sudah diselesaikan', '', trx ? `<a class="btn btn-primary" href="#/kuitansi/${trx.ID_Transaksi}">Lihat Kuitansi</a>` : ''); }
    const p = P(j.ID_Pasien) || {};
    const it = d.items.map((x, i) => Object.assign({ i }, x));
    const tind = it.filter(x => x.tipe === 'tindakan'), bmhp = it.filter(x => x.tipe === 'bmhp'), obat = it.filter(x => x.tipe === 'obat');
    const stokBadge = x => { const s = B(x.ref); if (!s) return badge('Item terhapus', 'b-red'); const sisa = num(s.Stok_Saat_Ini); return sisa < x.qty ? badge(`Stok kurang (sisa ${sisa})`, 'b-red') : badge(`Ready (sisa ${sisa} ${s.Satuan})`, 'b-teal'); };
    const sTind = subtotal(d.items, 'tindakan'), sB = subtotal(d.items, 'bmhp'), sO = d.resepMode === 'farmasi' ? subtotal(d.items, 'obat') : 0;
    return crumbsKasir(j.ID_Kunjungan, 2) + headerPasienKasir(j, p,
      p.Alergi || p.Riwayat_Implan ? `<div class="alert alert-red mt-12">${ic('warning', 'fill')}<div><b>PERINGATAN RESEP & IMPLAN</b><br>${p.Alergi ? 'Alergi: ' + esc(p.Alergi) + '. ' : ''}${p.Riwayat_Implan ? 'Implan: ' + esc(p.Riwayat_Implan) : ''}</div></div>` : '') + `

    <div class="sec-head"><h2>${ic('healing', 'c-primary')} Tindakan Medis & Terapi (${tind.length})</h2><button class="link-btn" data-act="tambahTindakan">${ic('add', 'sm')} Tindakan</button></div>
    <div class="stack-sm">${tind.map(x => `<div class="card tight clickable" data-act="edit" data-i="${x.i}"><div class="row between top"><p class="strong grow">${esc(x.nama)}${x.qty > 1 ? ' ×' + x.qty : ''}</p><span class="money">${rp(x.qty * x.harga)}</span></div>
      ${x.ket ? `<p class="tiny muted row mt-4">${ic('stethoscope', 'xs')} ${esc(x.ket)}</p>` : ''}<div class="mt-8">${badge('Dilakukan', 'b-teal', 'done_all')}</div></div>`).join('') || '<p class="small muted">Belum ada tindakan.</p>'}</div>
    <div class="inset row between mt-8"><span class="small">Subtotal Tindakan</span><b class="num">${rp(sTind)}</b></div>

    <div class="sec-head"><h2>${ic('medical_services', 'c-primary')} Bahan Medis Habis Pakai (${bmhp.length})</h2></div>
    <p class="tiny c-primary row mb-8" style="margin-top:-8px">${ic('sync_alt', 'xs')} Auto-kurangi stok saat pembayaran diproses</p>
    <div class="stack-sm">${bmhp.map(x => `<div class="card tight clickable" data-act="edit" data-i="${x.i}"><div class="row between"><p class="strong grow">${esc(x.nama)}</p><span class="money">${rp(x.qty * x.harga)}</span></div>
      <div class="row wrap mt-4"><span class="tiny">Pakai: <b>${x.qty} ${esc((B(x.ref) || {}).Satuan || '')}</b></span>${stokBadge(x)}</div></div>`).join('')}
      <button class="btn btn-secondary btn-block" data-act="tambahBahan" data-k="BMHP">${ic('add_circle', 'sm')} Catat Bahan Tambahan</button></div>
    <div class="inset row between mt-8"><span class="small">Subtotal BMHP</span><b class="num">${rp(sB)}</b></div>

    <div class="sec-head"><h2>${ic('medication', 'c-primary')} Resep Obat & Farmasi (${obat.length} R/)</h2></div>
    <div class="seg"><button class="${d.resepMode === 'farmasi' ? 'active' : ''}" data-act="resepMode" data-v="farmasi">Farmasi Klinik</button><button class="${d.resepMode === 'luar' ? 'active' : ''}" data-act="resepMode" data-v="luar">Resep Luar</button></div>
    ${d.resepMode === 'farmasi' ? `<div class="stack-sm mt-12">${obat.map((x, n) => `<div class="card tight clickable" data-act="edit" data-i="${x.i}"><div class="row between top"><p class="strong grow"><span class="c-primary mono">R/ ${n + 1}</span> ${esc(x.nama)}</p><span class="money">${rp(x.qty * x.harga)}</span></div>
        ${x.aturan ? `<p class="small muted mt-4">Aturan: ${esc(x.aturan)}</p>` : ''}
        <div class="row wrap mt-8"><span class="tag-mono gray">${x.qty} ${esc((B(x.ref) || {}).Satuan || '')}</span>${stokBadge(x)}${cekAlergi(p, x.nama) ? badge('Cek alergi!', 'b-solid-red', 'warning') : p.Alergi ? badge('Tidak cocok kata alergi', 'b-green', 'verified') : ''}</div></div>`).join('')}
        <button class="btn btn-secondary btn-block" data-act="tambahBahan" data-k="Obat">${ic('add_circle', 'sm')} Tambah Obat</button></div>
      <div class="inset row between mt-8"><span class="small">Subtotal Farmasi</span><b class="num">${rp(sO)}</b></div>`
      : `<label class="field mt-12"><span>Resep untuk ditebus di apotek luar <em>tidak ditagihkan</em></span><textarea rows="4" data-on="resepLuar" placeholder="R/ Celecoxib 200mg No. X&#10;S 2 dd 1 pc">${esc(d.resepLuar)}</textarea></label>`}

    <div class="card mt-24"><div class="row between"><h3 class="h3 row">${ic('receipt_long', 'c-primary')} Ringkasan Tagihan Sesi</h3>${badge('Siap Ditagihkan', 'b-teal')}</div>
      <div class="kv-row mt-8"><span class="k">Tindakan Medis & Terapi</span><span class="v">${rp(sTind)}</span></div>
      <div class="kv-row"><span class="k">Bahan Medis Habis Pakai</span><span class="v">${rp(sB)}</span></div>
      <div class="kv-row"><span class="k">Farmasi & Resep</span><span class="v">${rp(sO)}</span></div>
      <div class="kv-row total"><span class="k">Grand Total</span><span class="v c-primary">${rp(sTind + sB + sO)}</span></div></div>
    <label class="check mt-16"><input type="checkbox" data-on="kirimResep" ${d.kirimResep ? 'checked' : ''}><div><p class="strong small">Kirim salinan e-resep via WhatsApp</p><p class="tiny muted">Tombol kirim muncul di halaman kuitansi ke ${esc(fmtWa(p.No_WA))}</p></div></label>`;
  },
  bar(ctx) {
    const d = ctx.state.d;
    if (!d || !ctx.state.j || ctx.state.j.Status === 'Selesai') return '';
    const total = subtotal(d.items.filter(i => d.resepMode === 'farmasi' || i.tipe !== 'obat'));
    return `<button class="btn btn-secondary" data-act="draft">Simpan Draft</button><button class="btn btn-primary grow" data-act="lanjut">Lanjut ke Kasir <span class="mono small" style="opacity:.85">(${rp(total)})</span></button>`;
  },
  inputs: {
    resepLuar: (el, e, ctx) => { ctx.state.d.resepLuar = el.value; Pages.tindakan.save(ctx); },
    kirimResep: (el, e, ctx) => { ctx.state.d.kirimResep = el.checked; Pages.tindakan.save(ctx); }
  },
  actions: {
    resepMode: (el, e, ctx) => { ctx.state.d.resepMode = el.dataset.v; Pages.tindakan.save(ctx); ctx.rerender(); },
    draft: (el, e, ctx) => { Pages.tindakan.save(ctx); toast('Draft tindakan tersimpan.', 'info'); },
    lanjut: (el, e, ctx) => {
      const d = ctx.state.d;
      if (!d.items.some(i => i.tipe === 'tindakan')) return toast('Minimal satu tindakan/layanan.', 'err');
      Pages.tindakan.save(ctx); ctx.dirty = false; go('#/kasir/' + ctx.state.j.ID_Kunjungan);
    },
    tambahTindakan: (el, e, ctx) => {
      const j = ctx.state.j;
      pickSheet({
        title: 'Tambah Tindakan', items: S.layanan.filter(l => l.Aktif !== 'Tidak').map(l => Object.assign({ _q: l.Nama_Layanan + ' ' + l.Kategori }, l)),
        render: l => `<div class="icon-tile sm">${ic('healing')}</div><div class="grow"><p class="strong">${esc(l.Nama_Layanan)}</p><p class="tiny muted">${esc(l.Kategori)} · ${rp(tarif(l, j.Jenis) || tarif(l, 'Klinik'))}</p></div>`,
        onPick: l => { ctx.state.d.items.push({ tipe: 'tindakan', ref: l.ID_Layanan, nama: l.Nama_Layanan, qty: 1, harga: tarif(l, j.Jenis) || tarif(l, 'Klinik'), ket: (l.Durasi_Menit || '') + ' menit' }); Pages.tindakan.save(ctx); ctx.rerender(); }
      });
    },
    tambahBahan: (el, e, ctx) => {
      const kat = el.dataset.k;
      pickSheet({
        title: kat === 'Obat' ? 'Tambah Obat' : 'Tambah Bahan (BMHP)',
        items: S.stok.filter(s => s.Aktif !== 'Tidak' && s.Kategori === kat).map(s => Object.assign({ _q: s.Nama + ' ' + s.Kode }, s)),
        render: s => `<div class="icon-tile sm ${num(s.Stok_Saat_Ini) <= 0 ? 'red' : ''}">${ic(kat === 'Obat' ? 'medication' : 'medical_services')}</div><div class="grow"><p class="strong">${esc(s.Nama)}</p><p class="tiny muted">Stok ${esc(s.Stok_Saat_Ini)} ${esc(s.Satuan)} · ${rp(s.Harga_Jual)}/${esc(s.Satuan)}</p></div>`,
        onPick: s => {
          const it = { tipe: kat === 'Obat' ? 'obat' : 'bmhp', ref: s.ID_Bahan, nama: s.Nama, qty: 1, harga: num(s.Harga_Jual), aturan: '' };
          ctx.state.d.items.push(it); Pages.tindakan.save(ctx); ctx.rerender();
          Pages.tindakan.actions.edit({ dataset: { i: ctx.state.d.items.length - 1 } }, null, ctx);
        }
      });
    },
    edit: (el, e, ctx) => {
      const i = Number(el.dataset.i), it = ctx.state.d.items[i];
      const s = it.tipe !== 'tindakan' ? B(it.ref) : null;
      openSheet({
        title: esc(it.nama),
        body: `<div class="grid2"><label class="field"><span>Jumlah ${s ? '(' + esc(s.Satuan) + ')' : ''}</span><input id="e-qty" type="number" inputmode="decimal" min="0" step="any" value="${it.qty}"></label>
          <label class="field"><span>Harga satuan</span><input id="e-harga" type="number" inputmode="numeric" min="0" value="${it.harga}"></label></div>
          ${it.tipe === 'obat' ? `<label class="field mt-12"><span>Aturan pakai</span><input id="e-aturan" value="${esc(it.aturan || '')}" placeholder="Contoh: 2×1 kapsul sesudah makan" list="aturan-list"></label>
            <datalist id="aturan-list"><option value="1×1 sesudah makan"><option value="2×1 sesudah makan"><option value="3×1 sesudah makan"><option value="Oles tipis 3× sehari bila nyeri"><option value="1×1 tablet pagi"></datalist>` : ''}
          ${s ? `<p class="tiny muted mt-12">Stok tersedia: ${esc(s.Stok_Saat_Ini)} ${esc(s.Satuan)} · harga beli rata-rata ${rp(s.Harga_Beli_Rata2)}</p>` : ''}`,
        foot: `<button class="btn btn-ghost-danger" data-sact="hapus">${ic('delete', 'sm')} Hapus</button><button class="btn btn-primary" data-sact="ok">Simpan</button>`,
        onAction: (a, b, sh) => {
          if (a === 'hapus') ctx.state.d.items.splice(i, 1);
          if (a === 'ok') {
            it.qty = num(sh.el.querySelector('#e-qty').value); it.harga = num(sh.el.querySelector('#e-harga').value);
            const at = sh.el.querySelector('#e-aturan'); if (at) it.aturan = at.value;
            if (it.qty <= 0) ctx.state.d.items.splice(i, 1);
          }
          Pages.tindakan.save(ctx); sh.close(); ctx.rerender();
        }
      });
    }
  }
};

// ============================================
// KASIR & BAYAR
// ============================================
Pages.kasir = {
  nav: null,
  backTo: ctx => '#/tindakan/' + ctx.params[0],
  header: () => ({ type: 'sub', title: 'Kasir & Pembayaran' }),
  init(ctx) {
    ctx.dirty = true;
    const j = J(ctx.params[0]);
    const d = j ? draftTindakan(j) : null;
    ctx.state = {
      j, d, bukti: null,
      k: Object.assign({ admin: num(setting('BIAYA_ADMIN', 0)), diskon: 0, diskonLabel: '', metode: 'Tunai', status: 'Lunas', dibayar: '', catatan: '', kirim: true }, (d && d.kasir) || {})
    };
  },
  items(ctx) {
    const { d, k } = ctx.state;
    const items = d.items.filter(i => d.resepMode === 'farmasi' || i.tipe !== 'obat').map(i => ({ tipe: i.tipe, ref: i.ref, nama: i.nama, qty: i.qty, harga: i.harga, aturan: i.aturan || '' }));
    if (num(k.admin) > 0) items.push({ tipe: 'admin', ref: '', nama: 'Biaya Administrasi & Berkas', qty: 1, harga: num(k.admin) });
    return items;
  },
  render(ctx) {
    const { j, d, k } = ctx.state;
    if (!j) return emptyState('event_busy', 'Kunjungan tidak ditemukan');
    if (j.Status === 'Selesai') { const trx = trxKunjungan(j.ID_Kunjungan); return emptyState('task_alt', 'Sudah dibayar', '', trx ? `<a class="btn btn-primary" href="#/kuitansi/${trx.ID_Transaksi}">Lihat Kuitansi</a>` : ''); }
    if (!d.items.length) return emptyState('playlist_add', 'Belum ada item tagihan', '', `<a class="btn btn-primary" href="#/tindakan/${j.ID_Kunjungan}">Isi Tindakan</a>`);
    const p = P(j.ID_Pasien) || {}, t = T(j.ID_Tenaga) || {};
    const items = this.items(ctx);
    const sub = subtotal(items), total = Math.max(0, sub - num(k.diskon));
    const grup = [['tindakan', 'Tindakan Medis & Terapi', items.filter(i => i.tipe === 'tindakan').map(i => i.nama).join(', ')], ['bmhp', 'Bahan Medis Habis Pakai (BMHP)', items.filter(i => i.tipe === 'bmhp').map(i => i.nama).join(', ')], ['obat', `Obat & Farmasi (${items.filter(i => i.tipe === 'obat').length} R/)`, items.filter(i => i.tipe === 'obat').map(i => i.nama).join(', ')], ['admin', 'Biaya Administrasi & Berkas', 'Pelaporan e-RM & arsip digital']];
    const metode = [['Tunai', 'payments', 'Pembayaran langsung di tempat'], ['Transfer', 'account_balance', setting('REKENING_BANK', 'Transfer bank')], ['QRIS', 'qr_code_2', 'GoPay, OVO, ShopeePay, Mobile Banking']];
    return crumbsKasir(j.ID_Kunjungan, 3) + `
    <div class="card"><div class="row between top"><p class="h3">${esc(namaPasien(p))} <span class="small muted">(${umur(p.Tgl_Lahir)} Th)</span></p>${badge(j.Jenis === 'Visit' ? 'Visit Rumah' : 'Klinik', j.Jenis === 'Visit' ? 'b-teal' : 'b-blue')}</div>
      <div class="row wrap mt-4"><span class="tag-mono">No. RM: ${esc(p.No_RM)}</span></div>
      <div class="inset mt-12"><div class="kv-row"><span class="k row">${ic('stethoscope', 'xs')} DPJP</span><span class="v">${esc(t.Nama || '-')}</span></div>
        <div class="kv-row"><span class="k row">${ic('schedule', 'xs')} Waktu pelayanan</span><span class="v">${fmtTgl(j.Tanggal)}, ${j.Jam_Mulai} WIB</span></div></div></div>
    <div class="dark-total mt-12"><div class="row between"><span class="lbl">TOTAL TAGIHAN PASIEN</span>${badge('Siap Ditransaksikan', 'b-teal')}</div><p class="amt mt-8">${rp(total)}</p><p class="tiny" style="color:#AEB8D0">Termasuk BMHP & administrasi</p></div>

    <div class="card mt-12"><h3 class="h3 row mb-8">${ic('receipt', 'c-primary')} Rincian Tagihan Layanan</h3>
      ${grup.map(([tp, n, det]) => { const v = subtotal(items, tp); return v ? `<div class="row between top" style="padding:8px 0"><div class="grow"><p class="small strong">${n}</p><p class="tiny muted clamp2">${esc(det)}</p></div><span class="money">${rp(v)}</span></div>` : ''; }).join('')}
      <div class="grid2 mt-12"><label class="field"><span>Biaya admin</span><input type="number" inputmode="numeric" min="0" data-on="k" data-k="admin" value="${k.admin}"></label>
        <label class="field"><span>Diskon (Rp)</span><input type="number" inputmode="numeric" min="0" data-on="k" data-k="diskon" value="${k.diskon || ''}" placeholder="0"></label></div>
      ${num(k.diskon) ? `<label class="field mt-12"><span>Keterangan diskon</span><input data-on="k" data-k="diskonLabel" value="${esc(k.diskonLabel)}" placeholder="Contoh: Promo pasca operasi"></label>
        <div class="alert alert-red mt-12">${ic('sell', 'sm')}<div class="row between grow"><span>${esc(k.diskonLabel || 'Diskon')}</span><b class="num">-${rp(k.diskon)}</b></div></div>` : ''}
    </div>

    <div class="card mt-12"><div class="row between mb-12"><h3 class="h3 row">${ic('account_balance_wallet', 'c-primary')} Metode Pembayaran</h3><span class="tiny c-primary">Pilih salah satu</span></div>
      <div class="stack-sm">${metode.map(([m, icn, sub]) => `<label class="radio-card ${k.metode === m ? 'active' : ''}"><div class="icon-tile sm ${k.metode === m ? '' : 'gray'}">${ic(icn)}</div><div class="grow"><p class="strong">${m === 'QRIS' ? 'QRIS Klinik' : m === 'Tunai' ? 'Tunai (Cash)' : 'Transfer Bank'}</p><p class="tiny muted">${esc(sub)}</p></div><input type="radio" name="metode" value="${m}" ${k.metode === m ? 'checked' : ''} data-on="metode"></label>
        ${m === 'QRIS' && k.metode === 'QRIS' ? `<div class="inset center">${setting('QRIS_NMID') ? `<p class="tiny mono muted">NMID: ${esc(setting('QRIS_NMID'))}</p>` : ''}${S.aset.qris ? `<img src="${S.aset.qris}" alt="QRIS" style="max-width:220px;margin:12px auto;border-radius:12px">` : `<p class="small muted mt-8">Gambar QRIS belum diunggah. <a href="#/pengaturan">Unggah di Pengaturan</a></p>`}<p class="tiny muted">Tunjukkan QRIS klinik ke pasien atau pendamping</p></div>` : ''}`).join('')}</div></div>

    <div class="card mt-12"><h3 class="h3 row mb-12">${ic('fact_check', 'c-primary')} Status Pembayaran</h3>
      <div class="chips wrap">${[['Lunas', 'Lunas'], ['DP', 'DP (Uang Muka)'], ['Belum', 'Belum Lunas']].map(([v, n]) => `<button class="chip ${k.status === v ? 'active' : ''}" data-act="status" data-v="${v}">${k.status === v ? ic('check_circle', 'sm') : ''}${n}</button>`).join('')}</div>
      ${k.status === 'DP' ? `<label class="field mt-12"><span>Jumlah DP dibayar</span><input type="number" inputmode="numeric" data-on="k" data-k="dibayar" value="${esc(k.dibayar)}"></label>` : ''}
    </div>

    <div class="card mt-12"><div class="row between"><h3 class="h3 row">${ic('cloud_upload', 'c-primary')} Bukti Pembayaran</h3><span class="tiny muted">Opsional</span></div>
      ${ctx.state.bukti ? `<div class="row gap-12 mt-12">${ctx.state.bukti.mime.startsWith('image') ? `<img src="${ctx.state.bukti.dataUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:10px">` : ic('picture_as_pdf', 'lg')}<span class="small grow ellipsis">${esc(ctx.state.bukti.nama)}</span><button class="icon-btn sm" data-act="hapusBukti">${ic('close')}</button></div>`
        : `<div class="upload-drop mt-12"><div class="row" style="justify-content:center"><button class="btn btn-sm btn-secondary" data-act="bukti" data-c="1">${ic('photo_camera', 'sm')}Kamera</button><button class="btn btn-sm btn-secondary" data-act="bukti">${ic('image', 'sm')}Galeri</button></div><p class="tiny muted mt-8">Unggah bukti transfer / resi QRIS</p></div>`}</div>

    <label class="card check mt-12" style="background:var(--success-bg);border-color:#BBF7D0"><input type="checkbox" data-on="kirim" ${k.kirim ? 'checked' : ''}><div><p class="strong small">Kirim kuitansi resmi (e-Receipt PDF)</p><p class="tiny muted">Disiapkan untuk WhatsApp ${esc(fmtWa(p.No_WA))}</p></div></label>
    <label class="field mt-12"><span>Catatan kasir / keterangan</span><input data-on="k" data-k="catatan" value="${esc(k.catatan)}" placeholder="Contoh: ditransfer via rekening Mandiri a.n. keluarga"></label>`;
  },
  bar(ctx) {
    const { j, d } = ctx.state;
    if (!j || !d || j.Status === 'Selesai' || !d.items.length) return '';
    const total = Math.max(0, subtotal(this.items(ctx)) - num(ctx.state.k.diskon));
    return `<button class="btn btn-secondary" data-act="tahan">${ic('pause_circle', 'sm')} Tahan</button><button class="btn btn-primary grow" data-act="proses">Proses Pembayaran <span class="mono small" style="opacity:.85">(${rp(total)})</span></button>`;
  },
  simpanDraft(ctx) { const d = ctx.state.d; d.kasir = ctx.state.k; Draft.set('tx_' + ctx.state.j.ID_Kunjungan, d); },
  inputs: {
    k: (el, e, ctx) => { ctx.state.k[el.dataset.k] = el.value; if (e.type === 'change' && ['diskon', 'admin'].includes(el.dataset.k)) ctx.rerender(); },
    metode: (el, e, ctx) => { if (e.type === 'change') { ctx.state.k.metode = el.value; ctx.rerender(); } },
    kirim: (el, e, ctx) => { ctx.state.k.kirim = el.checked; }
  },
  actions: {
    status: (el, e, ctx) => { ctx.state.k.status = el.dataset.v; ctx.rerender(); },
    tahan: (el, e, ctx) => { Pages.kasir.simpanDraft(ctx); ctx.dirty = false; toast('Tagihan ditahan sebagai draft.', 'info'); go('#/kunjungan/' + ctx.state.j.ID_Kunjungan); },
    hapusBukti: (el, e, ctx) => { ctx.state.bukti = null; ctx.rerender(); },
    bukti: async (el, e, ctx) => {
      const f = await pilihBerkas({ capture: !!el.dataset.c });
      if (!f) return;
      try { ctx.state.bukti = await readFile(f); ctx.rerender(); } catch (err) { toast(err.message, 'err'); }
    },
    proses: async (el, e, ctx) => {
      const { j, k, d } = ctx.state;
      const items = Pages.kasir.items(ctx);
      const total = Math.max(0, subtotal(items) - num(k.diskon));
      if (k.status === 'DP' && (!num(k.dibayar) || num(k.dibayar) >= total)) return toast('Isi jumlah DP (lebih kecil dari total).', 'err');
      const kurang = items.filter(i => (i.tipe === 'bmhp' || i.tipe === 'obat') && B(i.ref) && num(B(i.ref).Stok_Saat_Ini) < i.qty);
      let izinkanMinus = false;
      if (kurang.length) {
        izinkanMinus = await confirmSheet({ title: 'Stok tidak mencukupi', message: kurang.map(i => i.nama).join(', ') + ' — stok di sistem kurang. Tetap proses (stok jadi minus, perlu koreksi)?', okText: 'Tetap Proses', danger: true });
        if (!izinkanMinus) return;
      }
      Pages.kasir.simpanDraft(ctx);
      el.disabled = true;
      let linkBukti = '';
      if (ctx.state.bukti) {
        el.innerHTML = '<span class="spinner sm"></span> Mengunggah bukti…';
        const up = await API.call('uploadBerkas', { idPasien: j.ID_Pasien, kategori: 'Bukti_Bayar', label: 'Bukti bayar ' + j.ID_Kunjungan, base64: ctx.state.bukti.base64, mime: ctx.state.bukti.mime });
        if (!up.success) { el.disabled = false; el.textContent = 'Proses Pembayaran'; return toast(up.message, 'err'); }
        linkBukti = up.data.url;
      }
      const catatan = [k.catatan, num(k.diskon) && k.diskonLabel ? 'Diskon: ' + k.diskonLabel : '', d.resepMode === 'luar' && d.resepLuar ? 'Resep luar: ' + d.resepLuar : ''].filter(Boolean).join(' | ');
      const res = await run('checkout', { ID_Kunjungan: j.ID_Kunjungan, items, diskon: num(k.diskon), metode: k.metode, status: k.status, dibayar: num(k.dibayar), catatan, linkBukti, izinkanMinus }, { btn: el, loadingText: ' Memproses…' });
      if (!res.success) return;
      Draft.del('tx_' + j.ID_Kunjungan);
      ctx.dirty = false;
      sessionStorage.setItem('oc_resep_' + res.data.ID_Transaksi, JSON.stringify({ kirim: d.kirimResep, luar: d.resepMode === 'luar' ? d.resepLuar : '' }));
      location.replace('#/kuitansi/' + res.data.ID_Transaksi + (k.kirim ? '?kirim=1' : ''));
    }
  }
};

// ============================================
// KUITANSI (e-Receipt)
// ============================================
Pages.kuitansi = {
  nav: null,
  backTo: '#/keuangan',
  header: () => ({ type: 'sub', title: 'Kuitansi (e-Receipt)', right: `<button class="icon-btn" data-act="cetak" aria-label="Cetak">${ic('print')}</button>` }),
  init(ctx) { ctx.state = { pdf: null }; },
  mount(ctx) {
    if (ctx.q.kirim === '1' && !ctx.state.auto) {
      ctx.state.auto = true;
      history.replaceState(null, '', '#/kuitansi/' + ctx.params[0]);
      const b = document.querySelector('[data-act=kirimWa]');
      if (b) Pages.kuitansi.actions.kirimWa(b, null, ctx);
    }
  },
  render(ctx) {
    const t = TX(ctx.params[0]);
    if (!t) return emptyState('receipt_long', 'Transaksi tidak ditemukan');
    const p = P(t.ID_Pasien) || {}, j = J(t.ID_Kunjungan), tn = j ? T(j.ID_Tenaga) || {} : {};
    let items = [];
    try { items = JSON.parse(t.Item_JSON || '[]'); } catch (e) { items = []; }
    if (!items.length) items = [{ nama: t.Deskripsi, qty: 1, harga: num(t.Subtotal || t.Jumlah) }];
    const lunas = t.Status_Bayar === 'Lunas', dp = t.Status_Bayar === 'DP';
    const grup = [['tindakan', 'Tindakan & Terapi'], ['bmhp', 'BMHP Steril'], ['obat', 'Paket Farmasi Resep'], ['admin', 'Administrasi Medis Digital'], [undefined, 'Lainnya']];
    const obat = items.filter(i => i.tipe === 'obat');
    const resepInfo = JSON.parse(sessionStorage.getItem('oc_resep_' + t.ID_Transaksi) || '{}');
    const rekamKontrol = (S.detail[p.ID_Pasien] && S.detail[p.ID_Pasien].rekam.find(r => r.ID_Kunjungan === t.ID_Kunjungan)) || {};
    const tglKontrol = rekamKontrol.Rencana_Kontrol || addDays(t.Tanggal, 7);
    const sisa = num(t.Jumlah) - num(t.Dibayar);
    return `
    <div class="card" style="background:${lunas ? '#E8FBF5' : '#FFF8E6'};border-color:${lunas ? '#A7F3D0' : '#FDE68A'}">
      <div class="row top gap-12"><div class="icon-tile ${lunas ? 'teal' : 'amber'}">${ic(lunas ? 'check_circle' : 'hourglass_top', 'fill')}</div>
        <div class="grow"><div class="row between"><p class="h3">${lunas ? 'Pembayaran Berhasil' : dp ? 'DP Diterima' : 'Tagihan Tercatat'}</p>${badge(lunas ? 'LUNAS' : dp ? 'DP' : 'BELUM LUNAS', lunas ? 'b-solid-green' : 'b-amber')}</div>
        <p class="tiny muted">${lunas ? 'Kuitansi digital resmi diterbitkan & tersinkron ke e-RM.' : 'Sisa tagihan ' + rp(sisa) + ' — catat pelunasan bila sudah dibayar.'}</p></div></div>
      <div class="inset white mt-12"><div class="kv-row"><span class="k">No. Kuitansi</span><span class="v mono c-primary">${esc(t.No_Kuitansi || '—')}</span></div>
        <div class="kv-row"><span class="k">No. Invoice</span><span class="v mono">${esc(t.No_Invoice)}</span></div>
        <div class="kv-row"><span class="k">Waktu transaksi</span><span class="v">${fmtTgl(t.Tanggal)}, ${esc(t.Waktu)} WIB</span></div></div>
    </div>

    <div class="receipt mt-16" id="receipt">
      <div class="kop"><div class="logo">${S.aset.logo ? `<img src="${S.aset.logo}" alt="">` : ic('add', 'fill')}</div>
        <p class="h3" style="text-transform:uppercase">${esc(setting('NAMA_KLINIK'))}</p><p class="tiny muted">${esc(setting('SUBJUDUL_KLINIK'))}</p><p class="tiny muted">${esc(setting('ALAMAT_KLINIK'))}</p>
        <span class="tag-mono gray mt-8" style="display:inline-block">${esc(setting('NO_IZIN'))}</span></div>
      <div class="sep">BUKTI PEMBAYARAN SAH</div>
      <div class="inset"><div class="row between top"><div><p class="eyebrow gray">Nama pasien</p><p class="strong">${esc(namaPasien(p))} <span class="tiny muted">(${umur(p.Tgl_Lahir)} Th)</span></p></div><div class="right"><p class="eyebrow gray">No. RM</p><p class="mono small c-primary">${esc(p.No_RM || '-')}</p></div></div>
        <div class="grid2 mt-8"><div><p class="eyebrow gray">DPJP</p><p class="small">${esc(tn.Nama || '-')}</p></div><div><p class="eyebrow gray">Layanan</p><p class="small c-primary">${j ? (j.Jenis === 'Visit' ? 'Visit Rumah' : 'Klinik') : esc(t.Kategori)}</p></div></div>
        ${p.Diagnosis_Utama ? `<p class="eyebrow gray mt-8">Diagnosis</p><p class="small">${esc(p.Diagnosis_Utama)}</p>` : ''}</div>
      <div class="row between tiny muted strong mt-16" style="border-bottom:1px solid var(--border);padding-bottom:6px"><span>DESKRIPSI LAYANAN / ITEM</span><span>BIAYA (IDR)</span></div>
      ${grup.map(([tp, n]) => { const g = items.filter(i => i.tipe === tp || (tp === undefined && !['tindakan', 'bmhp', 'obat', 'admin'].includes(i.tipe))); if (!g.length) return ''; return `<div class="row between top" style="padding:10px 0;border-bottom:1px solid var(--border)"><div class="grow"><p class="strong small">${tp === 'tindakan' ? esc(g[0].nama) + (g.length > 1 ? ' +' + (g.length - 1) : '') : n}</p><p class="tiny muted">${esc(g.map(i => i.nama + (i.qty > 1 || i.tipe !== 'tindakan' ? ' (' + i.qty + ')' : '')).join(', '))}</p></div><span class="money">${num(subtotal(g)).toLocaleString('id-ID')}</span></div>`; }).join('')}
      ${num(t.Diskon) ? `<div class="alert alert-red mt-8"><div class="row between grow"><span>Diskon${/Diskon: ([^|]+)/.test(t.Catatan) ? ' — ' + esc(t.Catatan.match(/Diskon: ([^|]+)/)[1].trim()) : ''}</span><b class="num">-${num(t.Diskon).toLocaleString('id-ID')}</b></div></div>` : ''}
      <div class="dark-total mt-12"><div class="row between end"><div><p class="lbl">TOTAL BERSIH</p><p class="strong" style="color:${lunas ? '#5EEAD4' : '#FCD34D'}">STATUS: ${lunas ? 'LUNAS' : dp ? 'DP ' + rp(t.Dibayar) : 'BELUM LUNAS'}</p></div><p class="amt" style="font-size:24px">${rp(t.Jumlah)}</p></div>
        <div class="row between mt-12 tiny" style="color:#AEB8D0;border-top:1px solid #334155;padding-top:10px"><span>Metode pembayaran</span><span>${badge(t.Metode_Bayar, 'b-solid-blue')}</span></div></div>
      <div class="grid2 mt-16 center"><div class="stamp ${lunas ? '' : dp ? 'amber' : 'red'}">${lunas ? 'VERIFIED<br><small>LUNAS · RESMI</small>' : dp ? 'DP<br><small>SEBAGIAN</small>' : 'BELUM<br><small>LUNAS</small>'}</div>
        <div class="inset tiny"><p class="strong">e-RM Verify</p><p class="muted">${esc(t.ID_Transaksi)}</p></div></div>
      <div class="grid2 mt-16 center tiny"><div><p class="muted">Kasir / Admin</p><p class="c-primary mt-8" style="font-style:italic">[Digital Signed]</p><p class="strong mt-8" style="text-decoration:underline">${esc(setting('NAMA_ADMIN'))}</p></div>
        <div><p class="muted">Dokter Penanggung Jawab</p><p class="c-primary mt-8" style="font-style:italic">[e-Prescription Valid]</p><p class="strong mt-8" style="text-decoration:underline">${esc(tn.Nama || '-')}</p></div></div>
    </div>

    <div class="card mt-16 no-print"><div class="row between"><h3 class="h3">Distribusi & Arsip</h3>${badge(t.File_Kuitansi_ID ? 'PDF Tersimpan' : 'Belum dibuat', t.File_Kuitansi_ID ? 'b-teal' : '')}</div>
      <div class="inset row mt-12" style="background:var(--success-bg)"><div class="icon-tile sm teal">${ic('chat')}</div><div class="grow"><p class="strong small">WhatsApp Pasien</p><p class="tiny mono muted">${esc(fmtWa(p.No_WA))}</p></div>
        <button class="btn btn-sm btn-wa" data-act="kirimWa">${ic('send', 'sm')} ${t.File_Kuitansi_ID ? 'Kirim Ulang' : 'Kirim'}</button></div>
      ${obat.length && resepInfo.kirim !== false ? `<a class="btn btn-wa-soft btn-block mt-12" target="_blank" rel="noopener" href="${waLink(p.No_WA, 'Salinan e-resep ' + setting('NAMA_KLINIK') + ' (' + fmtTgl(t.Tanggal) + '):\n' + obat.map((o, i) => `R/${i + 1} ${o.nama} — ${o.qty}${o.aturan ? '\n   ' + o.aturan : ''}`).join('\n') + '\n\nSemoga lekas pulih, ' + (p.Sapaan || '') + ' ' + p.Nama + '.')}">${ic('medication', 'sm')} Kirim Salinan e-Resep via WA</a>` : ''}
      ${resepInfo.luar ? `<a class="btn btn-wa-soft btn-block mt-8" target="_blank" rel="noopener" href="${waLink(p.No_WA, 'Resep untuk ditebus di apotek:\n' + resepInfo.luar + '\n— ' + setting('NAMA_KLINIK'))}">${ic('description', 'sm')} Kirim Resep Luar via WA</a>` : ''}
      <div class="row mt-12"><button class="btn btn-secondary btn-sm grow" data-act="unduh">${ic('download', 'sm')} Unduh PDF</button><button class="btn btn-secondary btn-sm grow" data-act="cetak">${ic('print', 'sm')} Cetak Struk</button></div>
      ${!lunas ? `<button class="btn btn-primary btn-block mt-12" data-act="lunasi">${ic('price_check', 'sm')} Catat Pelunasan (${rp(sisa)})</button>` : ''}
      ${t.Link_Bukti_Bayar ? `<a class="row small mt-12" href="${esc(t.Link_Bukti_Bayar)}" target="_blank" rel="noopener">${ic('attach_file', 'sm')} Lihat bukti pembayaran</a>` : ''}
    </div>

    ${p.ID_Pasien ? `<p class="eyebrow gray mt-24 mb-8 no-print">Alur tindak lanjut klinis</p>
    <div class="stack-sm no-print">
      <a class="card tight row gap-12" href="#/jadwal/baru?${qs({ pasien: p.ID_Pasien, tgl: tglKontrol >= todayStr() ? tglKontrol : '', catatan: 'Kontrol lanjutan' })}" style="color:inherit"><div class="icon-tile sm">${ic('event_repeat')}</div><div class="grow"><p class="strong small">Buat Jadwal Kontrol Berikutnya</p><p class="tiny muted">Disarankan: ${fmtTgl(tglKontrol)}</p></div>${ic('chevron_right', 'faint')}</a>
      <a class="card tight row gap-12" target="_blank" rel="noopener" href="${waLink(p.No_WA, fillTpl(setting('WA_TPL_EDUKASI'), { sapaan: p.Sapaan || 'Bapak/Ibu', nama: p.Nama, layanan: t.Deskripsi, tanggal_kontrol: fmtTgl(tglKontrol, 'long'), klinik: setting('NAMA_KLINIK') }))}" style="color:inherit"><div class="icon-tile sm teal">${ic('school')}</div><div class="grow"><p class="strong small">Kirim Edukasi Pasca Tindakan</p><p class="tiny muted">Template WA edukasi & kontrol</p></div>${ic('chevron_right', 'faint')}</a>
      <a class="card tight row gap-12" href="#/keuangan" style="color:inherit"><div class="icon-tile sm gray">${ic('account_balance_wallet')}</div><div class="grow"><p class="strong small">Lihat Rekap Keuangan Harian</p><p class="tiny muted">Kas masuk hari ini: ${rp(sum(S.transaksi.filter(x => x.Tipe === 'Pemasukan' && x.Tanggal === todayStr()), 'Jumlah'))}</p></div>${ic('chevron_right', 'faint')}</a>
    </div>` : ''}`;
  },
  bar: () => `<a class="btn btn-primary grow" href="#/jadwal">${ic('task_alt', 'sm')} Selesai & Kembali ke Jadwal</a>`,
  async siapkanPdf(ctx, btn, share) {
    const res = await run('buatKuitansi', { id: ctx.params[0], share }, { btn, silent: true, loadingText: ' Membuat PDF…' });
    if (res.success) ctx.state.pdf = res.data;
    return res.success ? res.data : null;
  },
  actions: {
    cetak: () => window.print(),
    kirimWa: async (el, e, ctx) => {
      const t = TX(ctx.params[0]), p = P(t.ID_Pasien) || {};
      const data = await Pages.kuitansi.siapkanPdf(ctx, el, setting('MODE_KIRIM_PDF') === 'tautan');
      if (!data) return;
      ctx.rerender();
      kirimPdfSheet({
        judul: 'Kuitansi Siap Dikirim', data, pasien: p,
        pesan: link => fillTpl(setting('WA_TPL_KUITANSI'), { sapaan: p.Sapaan || 'Bapak/Ibu', nama: p.Nama, no_kwitansi: TX(ctx.params[0]).No_Kuitansi || t.No_Invoice, total_bayar: rp(t.Jumlah), link, klinik: setting('NAMA_KLINIK') })
      });
    },
    unduh: async (el, e, ctx) => {
      const t = TX(ctx.params[0]);
      if (ctx.state.pdf) return unduhBase64(ctx.state.pdf.base64, ctx.state.pdf.nama);
      if (t.File_Kuitansi_ID) {
        const r = await run('ambilPdf', { fileId: t.File_Kuitansi_ID }, { btn: el, silent: true });
        if (r.success) return unduhBase64(r.data.base64, (t.No_Kuitansi || t.No_Invoice) + '.pdf');
      }
      const d = await Pages.kuitansi.siapkanPdf(ctx, el, false);
      if (d) { unduhBase64(d.base64, d.nama); ctx.rerender(); }
    },
    lunasi: (el, e, ctx) => {
      const t = TX(ctx.params[0]);
      openSheet({
        title: 'Catat Pelunasan',
        body: `<p class="small muted mb-12">Sisa tagihan <b>${rp(num(t.Jumlah) - num(t.Dibayar))}</b> untuk ${esc(t.No_Invoice)}.</p>
          <div class="seg">${['Tunai', 'Transfer', 'QRIS'].map(m => `<button class="${m === t.Metode_Bayar ? 'active' : ''}" data-sact="m" data-v="${m}">${m}</button>`).join('')}</div>`,
        foot: `<button class="btn btn-primary" data-sact="ok">${ic('check', 'sm')} Tandai Lunas</button>`,
        onAction: async (a, b, sh) => {
          if (a === 'm') { sh.el.querySelectorAll('[data-sact=m]').forEach(x => x.classList.toggle('active', x === b)); return; }
          if (a !== 'ok') return;
          const m = sh.el.querySelector('[data-sact=m].active');
          const r = await run('saveTransaksi', { ID_Transaksi: t.ID_Transaksi, Status_Bayar: 'Lunas', Metode_Bayar: m ? m.dataset.v : t.Metode_Bayar }, { btn: b });
          if (r.success) { sh.close(); ctx.state.pdf = null; ctx.rerender(); }
        }
      });
    }
  }
};
