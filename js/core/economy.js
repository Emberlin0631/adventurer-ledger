/* 市場：每季重擲價格與庫存，偶有缺貨或盛產；庫存可以賣回（打折）；骨材等戰利品看季節出價 */
const BASE_STOCK = {antidote: 6, antipetri: 4, mirror: 3, crystal: 8, healmat: 4};
const SELL_RATE = 0.6;          // 賣回價 = 當季價格 × 60%
const NEWS_WHY = 4;             // 缺貨／盛產原因各有幾種說法

function rollMarket() {
  const m = {price: {}, stock: {}, news: [], bones: 0};
  INVKEYS.forEach(k => {
    m.price[k] = Math.round((0.85 + rnd() * 0.3) * 100) / 100;
    m.stock[k] = BASE_STOCK[k];
  });
  // 一到兩則市場消息
  const n = rnd() < 0.5 ? 1 : 2, pool = INVKEYS.slice();
  for (let i = 0; i < n; i++) {
    const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    if (rnd() < 0.6) { m.price[k] = 1.5; m.stock[k] = 2; m.news.push({k, kind: 'short', why: Math.floor(rnd() * NEWS_WHY)}); }
    else { m.price[k] = 0.75; m.stock[k] += 4; m.news.push({k, kind: 'glut', why: Math.floor(rnd() * NEWS_WHY)}); }
  }
  // 骨材：冬季軍需採購出價最高，其他季節看運氣
  const winter = Math.floor((S.day - 1) / SEASON_DAYS) % 4 === 3;
  m.bones = winter ? 1.05 : Math.round((0.55 + rnd() * 0.3) * 100) / 100;
  S.mkt = m;
}
const inflation = () => 1 + 0.05 * ((S.year || 1) - 1);
function priceOf(k) {
  const it = ITEMS[k];
  if (it.svc) return Math.round(it.price * inflation());
  return Math.round(it.price * (S.mkt ? S.mkt.price[k] : 1) * inflation());
}
const sellPriceOf = k => Math.round(priceOf(k) * SELL_RATE);
const shopStock = k => (S.mkt && S.mkt.stock[k] != null) ? S.mkt.stock[k] : 99;
function trendMark(k) {
  if (ITEMS[k].svc || !S.mkt) return '';
  const f = S.mkt.price[k];
  if (f >= 1.2) return ` <span class="trend up" title="${t('mk.up')}">▲</span>`;
  if (f <= 0.85) return ` <span class="trend down" title="${t('mk.down')}">▼</span>`;
  return '';
}

/* 大廳：市場消息與倉庫（賣回） */
function marketPanel() {
  const m = S.mkt; if (!m) return '';
  const news = m.news.map(n => `<li class="${n.kind === 'short' ? 'up' : 'down'}">${t('news.' + n.kind, {item: t('item.' + n.k + '.name'), why: t(`why.${n.kind}.${n.why}`)})}</li>`).join('');
  const sellable = INVKEYS.filter(k => S.inv[k] > 0);
  const winter = m.bones >= 1;
  const bonesOffer = Math.round(S.bones * m.bones);
  return `<div class="split">
    <div class="panel"><h4>${t('news.title')}</h4><ul class="news">${news}</ul>
      <p class="muted">${t('news.prices')}</p>
      <div class="pricegrid num">${INVKEYS.map(k => `<span>${t('inv.' + k)}${trendMark(k)}</span><span>${silver(priceOf(k))}</span><span class="muted">${t('news.stock', {n: shopStock(k)})}</span>`).join('')}</div></div>
    <div class="panel"><h4>${t('wh.title')}</h4>
      ${sellable.length || S.bones ? `<p class="muted">${t('wh.body', {p: Math.round(SELL_RATE * 100)})}</p><div class="row">${sellable.map(k => B(t('wh.sell', {item: t('inv.' + k), n: S.inv[k]}), () => {
        S.inv[k]--; S.chest += sellPriceOf(k); if (S.mkt.stock[k] != null) S.mkt.stock[k]++; goHall();
      }, {sub: t('wh.each', {n: fmt(sellPriceOf(k))})})).join('')}
      ${S.bones ? B(t('wh.bones', {n: fmt(bonesOffer)}), () => { S.chest += bonesOffer; S.bones = 0; goHall(); }, {sub: t(winter ? 'wh.bonesWinter' : 'wh.bonesSub', {v: fmt(S.bones)}), cls: winter ? 'pri' : ''}) : ''}</div>`
      : `<p class="muted">${t('wh.empty')}</p>`}</div>
  </div>`;
}
