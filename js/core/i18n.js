/* 語言：t('鍵名', {參數}) 取字串；缺的鍵先退回繁中，再退回鍵名本身。 */
const LANGS = {'zh-Hant': window.LANG_ZH, 'en': window.LANG_EN};
let LANG = (() => {
  try { const v = localStorage.getItem('al-lang'); if (v && LANGS[v]) return v; } catch (e) {}
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en';
})();
function t(k, p) {
  let s = (LANGS[LANG] && LANGS[LANG][k]) ?? LANGS['zh-Hant'][k] ?? k;
  if (p) s = s.replace(/\{(\w+)\}/g, (m, x) => (p[x] ?? m));
  return s;
}
function setLang(l) {
  LANG = l;
  try { localStorage.setItem('al-lang', l); } catch (e) {}
  applyLang();
  rerender();
}
function applyLang() {
  document.documentElement.lang = LANG;
  document.title = t('title');
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-t-title]').forEach(el => { el.title = t(el.dataset.tTitle); });
  const b = document.getElementById('langBtn'); if (b) b.textContent = t('lang.switch');
}
