/* 主線委託二：葡萄園地窖的石化蜥蜴（教：情報的價值、撤退與重新定價條款） */
registerContract({
  id: 'c2', progress: 1,
  notice: () => notice({title: t('c2.n.title'), meta: [t('c2.n.client'), t('c2.n.days')], bounty: t('c2.n.bounty'), body: t('c2.n.body'), btn: B(t('btn.view'), c2Intel)}),
});

function c2Intel() {
  if (!S.M || S.M.id !== 'c2') newMission({
    id: 'c2', D: 2, nameKey: 'c2.name', bounty: 600, rationDays: 3, market: ['repair', 'antipetri', 'mirror', 'mapper', 'crystal', 'healmat'], stock: {antipetri: 4},
    hints: () => [[S.inv.antipetri >= 3, 'c2.h1'], [S.inv.mirror >= 2, 'c2.h2'], [S.M.svc.mapper, 'c2.h3'], [S.inv.crystal >= 2, 'c2.h4'], [has('heal') && S.inv.healmat >= 1, 'c2.h5']],
    go: c2Go, back: null, cancel: true,
  });
  const M = S.M;
  const accept = b => () => { M.bounty = b; M.escrow = b; M.clause = false; market(); };
  screen(() => `<div><h2>${t('c2.name')}</h2><p class="lede">${t('c2.lede')}</p></div>
   <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
     <li>${t('c2.i1')}</li><li>${t('c2.i2')}</li><li>${t('c2.i3')}</li><li>${t('c2.i4')}</li>
     ${M.scouted ? `<li class="new">${t('c2.iScout')}</li>` : ''}</ul></div>
   <div class="panel"><h4>${t('c2.quote')}</h4>
     <div class="choices">${M.scouted ? '' : B(t('btn.scout'), () => { if (S.chest < 15) return toast(t('toast.noMoney')); spend(15); M.scouted = true; c2Intel(); }, {sub: t('c2.scoutSub')})}
     ${B(t('c2.q600'), accept(600))}
     ${B(t('c2.q480'), accept(480), {sub: t('c2.q480Sub')})}
     ${B(t('c2.q800'), c2Refused, {sub: t('c2.q800Sub')})}${B(t('btn.toBoard'), goHall)}</div></div></div>`);
}
function c2Refused() {
  screen(() => `<h2>${t('c2.ref.title')}</h2><p class="lede">${t('c2.ref.body')}</p><div class="row">${B(t('c2.wait'), () => { S.day += 3; c2Return(); }, {cls: 'pri', sub: t('c2.waitSub')})}</div>`);
}
function c2Return() {
  const M = S.M;
  screen(() => `<h2>${t('c2.ret.title')}</h2><p class="lede">${t('c2.ret.body')}</p>
    <div class="panel"><p>${t('c2.ret.p1')}</p><p class="muted">${t('c2.ret.p2')}</p></div>
    <div class="choices">${B(t('c2.adv'), () => { M.bounty = 1200; M.escrow = 1200; M.clause = true; M.advance = 80; S.chest += 80; market(); }, {cls: 'pri', sub: t('c2.advSub')})}
    ${B(t('c2.noAdv'), () => { M.bounty = 1200; M.escrow = 1200; M.clause = true; market(); })}</div>`);
}
function c2Go() {
  expedition({biome: 'cellar', monster: 'lizard', days: 1, events: {}, onArrive: X => c2Cellar(X)});
}
function c2Cellar(X) {
  const M = S.M;
  const intro = `<p>${M.clause ? t('c2.cellar.a') : t('c2.cellar.b')}${t('c2.cellar.body')}</p>`;
  const opts = [];
  if (M.clause) opts.push({label: t('c2.o.pause'), sub: t('c2.o.pauseSub'), cls: 'pri', fn: () => c2Renego(X)});
  opts.push({label: t('c2.o.push'), sub: t('c2.o.pushSub'), fn: () => battle(X, () => c2Fight(X, 'push'))});
  opts.push({label: t('c2.o.fire'), sub: has('mage') ? t('c2.o.fireSub') : t('c2.o.fireNo'), dis: !has('mage'), fn: () => battle(X, () => c2Fight(X, 'fire'))});
  if (!M.clause) opts.push({label: t('c2.o.quit'), sub: t('c2.o.quitSub'), fn: c2Forfeit});
  card(t('c2.cellar.title'), intro, opts);
}
function c2Renego(X) {
  card(t('c2.pause.title'), t('c2.pause.body'), [{label: t('c2.pause.btn'), cls: 'pri', sub: t('c2.pause.btnSub'), fn: () => {
    spend(10); S.day += 2; renderHUD(); battle(X, () => c2Fight(X, 'renego'));
  }}]);
}
function needCrystal(n, L) {
  if (S.inv.crystal < n) {
    const lack = n - S.inv.crystal, c = lack * 35;
    spend(c); S.inv.crystal += lack; L.push(['w', t('c2.crystalBuy', {n: lack, c})]);
  }
  S.inv.crystal -= n;
}
function c2Fight(X, mode) {
  const M = S.M, L = []; let hits, unresolved = 0, dmg = 0;
  if (mode === 'push') {
    hits = 3;
    if (S.inv.mirror >= 2) { hits--; L.push(t('c2.f.mirrors')); }
    if (S.inv.mirror > 0) { hits++; L.push(['w', t('c2.f.reflect')]); }
    if (M.svc.mapper) { hits--; L.push(t('c2.f.mapper')); }
    hits = Math.max(1, hits);
  } else {
    hits = M.svc.mapper ? 0 : 1; needCrystal(2, L);
    L.push(mode === 'renego' ? t('c2.f.ctrlfire') : t('c2.f.badfire'));
  }
  for (let i = 0; i < hits; i++) {
    const v = pick(participants().filter(m => m.hp < 2)); if (!v) break;
    const name = nm(v);
    if (S.inv.antipetri > 0) { S.inv.antipetri--; L.push(t('c2.f.potion', {name})); }
    else if (has('heal') && S.inv.healmat > 0) { S.inv.healmat--; v.hp = Math.max(v.hp, 1); L.push(['w', t('c2.f.healmat', {name})]); }
    else { hurt(v, 2); unresolved++; L.push(['b', t('c2.f.stone', {name})]); }
  }
  if (S.inv.mirror > 0 && (mode === 'renego' || rnd() < 0.6)) { S.inv.mirror--; L.push(t('c2.f.mirrorBreak')); }
  if (mode === 'fire') { dmg = 300; S.rep -= 10; L.push(['b', t('c2.f.fine')]); }
  if (mode === 'renego') L.push(t('c2.f.lossOk'));
  const ok = mode !== 'push' || unresolved < 2;
  const finish = () => { S.progress = 2; queueMidEvents(); };
  if (ok) {
    L.push(['g', t('c2.f.win')]);
    card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => {
      finish();
      settle({titleKey: 'c2.s.title', bounty: M.bounty, ded: dmg ? [[t('c2.s.dmg'), dmg]] : [],
        note: S.inv.antipetri ? t('c2.s.noteInv', {n: S.inv.antipetri}) : (M.clause ? t('c2.s.noteClause') : '')});
    }}]);
  } else {
    L.push(['b', t('c2.f.retreat')]);
    card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => {
      S.rep -= 10; finish();
      settle({titleKey: 'c2.fail.title', bounty: 0, resultKey: 'res.fail', introKey: 'c2.fail.intro', note: M.clause ? '' : t('c2.fail.note')});
    }}]);
  }
}
function c2Forfeit() {
  S.rep -= 15; S.progress = 2; queueMidEvents();
  card(t('c2.forf.title'), res([['b', t('c2.forf.r1')], t('c2.forf.r2')]), [{label: t('btn.back'), cls: 'pri', fn: () =>
    settle({titleKey: 'c2.forf.stitle', bounty: 0, resultKey: 'res.forfeit', introKey: 'c2.forf.intro'})}]);
}
