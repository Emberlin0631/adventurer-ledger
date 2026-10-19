/* 啟動：套用語言、讀檔、進大廳 */
(function boot() {
  applyLang();
  document.getElementById('langBtn').addEventListener('click', () => setLang(LANG === 'en' ? 'zh-Hant' : 'en'));
  const r = loadGame();
  if (r !== 'ok') newGame();
  goHall();
  if (r === 'old') toast(t('save.old'));
})();
