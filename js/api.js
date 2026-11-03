/**
 * API — komunikasi fetch() ke Google Apps Script (REST JSON)
 * POST wajib Content-Type text/plain agar tidak memicu CORS preflight.
 */
const API = {
  get url() { return (window.APP_CONFIG && window.APP_CONFIG.GAS_URL) || ''; },
  get configured() { return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]{20,}\/exec$/.test(this.url) && this.url.indexOf('GANTI_DENGAN') < 0; },
  token: localStorage.getItem('oc_token') || '',

  setToken(t) {
    this.token = t || '';
    if (t) localStorage.setItem('oc_token', t); else localStorage.removeItem('oc_token');
  },

  /** Panggil aksi backend. Selalu mengembalikan objek {success, ...}; tidak pernah throw. */
  async call(action, data = {}) {
    if (!this.configured) return { success: false, message: 'GAS_URL belum diisi di js/config.js' };
    let res;
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data, token: this.token }),
        redirect: 'follow'
      });
    } catch (err) {
      return { success: false, network: true, message: navigator.onLine ? 'Tidak dapat terhubung ke server. Periksa GAS_URL & deployment.' : 'Anda sedang offline.' };
    }
    let json;
    try { json = await res.json(); } catch (e) {
      return { success: false, message: 'Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Anyone".' };
    }
    if (json && json.code === 'AUTH' && action !== 'login') {
      this.setToken('');
      if (window.App) App.showLogin(json.message);
    }
    return json || { success: false, message: 'Respons kosong.' };
  }
};
