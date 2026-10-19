/* 隨機委託流程：公告 → 情報與鑑定 → 報價與條款 → 採購 → 旅途事件 → 抵達（情報可能有誤）→ 戰鬥 → 結算 */
const RC_BOARD_SIZE = 3;
const placeName = i => t('place.' + i);
const tagName = k => t('tag.' + k + '.n');
const rcTags = c => RC[c.id].tags.concat(c.hidden ? [c.hidden] : []);

function fillBoard() {
  if (S.progress < 1) return;
  let guard = 0;
  while (S.board.length < RC_BOARD_SIZE && guard++ < 30) {
    const c = genContract();
    if (!S.board.some(x => x.id === c.id)) S.board.push(c); else S.uidSeq--;
  }
}
function rcNotice(c) {
  return notice({
    small: true, title: t(`rc.${c.id}.title`, {place: placeName(c.place)}),
    meta: [t('rc.client', {who: t(`rc.${c.id}.who`)}), t('rc.days', {n: c.days}), t('rc.danger', {n: c.D})],
    bounty: silver(c.bounty), body: t(`rc.${c.id}.body`), btn: B(t('btn.view'), () => rcIntel(c)),
  });
}
function removeFromBoard(c) { S.board = S.board.filter(x => x.uid !== c.uid); }

function rcIntel(c) {
  const T = RC[c.id];
  if (!S.M || S.M.uid !== c.uid) {
    const market = ['repair', 'healmat'];
    T.tags.concat(c.hidden ? [c.hidden] : []).forEach(tag => TAGS[tag].items.forEach(i => { if (!market.includes(i)) market.push(i); }));
    newMission({
      id: 'rc', D: c.D, uid: c.uid, rc: c, nameKey: `rc.${c.id}.title`, place: c.place, bounty: c.bounty, rationDays: c.days,
      rationRate: 5 + Math.max(0, S.members.length - 5), market, clause: false,
      hints: () => {
        const M = S.M;
        M.rationDays = c.days + (T.tags.includes('far') && !M.svc.horses ? 2 : 0);
        const known = T.tags.concat(M.scouted && c.hidden ? [c.hidden] : []);
        return known.map(tag => [tagReady(tag, c.D), t('tag.' + tag + '.h', {n: tagNeed(tag, c.D)}), true]);
      },
      go: rcGo, back: null, cancel: true,
    });
  }
  const M = S.M;
  const target = n => t(`rc.${c.id}.target`, {n});
  const disc = c.trueN > c.stated || !!c.hidden;
  const justified = M.scouted && disc;
  const scoutCost = 10 + 5 * c.D;
  const bids = {low: Math.round(c.bounty * 0.85 / 10) * 10, std: c.bounty, high: Math.round(c.bounty * 1.3 / 10) * 10};
  const accept = kind => () => {
    let p = {low: 1, std: 0.85, high: justified ? 0.85 : 0.3}[kind];
    if (M.clause && !justified) p -= 0.3;
    removeFromBoard(c);
    if (rnd() > p) {
      const keep = M.spent; S.M = null;
      screen(() => `<h2>${t('rc.ref.title')}</h2><p class="lede">${t('rc.ref.body', {n: fmt(c.competitor)})}</p>${keep ? `<p class="muted">${t('rc.ref.sunk', {n: fmt(keep)})}</p>` : ''}<div class="row">${B(t('btn.toBoard'), goHall, {cls: 'pri'})}</div>`);
      return;
    }
    M.bounty = bids[kind]; M.escrow = bids[kind];
    M.priced = kind === 'high' && justified;
    market();
  };
  screen(() => `<div><h2>${t(`rc.${c.id}.title`, {place: placeName(c.place)})}</h2><p class="lede">${t(`rc.${c.id}.body`)}</p></div>
   <div class="split"><div class="panel"><h4>${t('intel.known')}</h4><ul class="intel">
     <li>${t('rc.stated', {target: target(c.stated)})}</li>
     <li>${t('rc.threats', {list: T.tags.map(tagName).join(t('list.sep'))})}</li>
     <li>${t('rc.danger', {n: c.D})}</li>
     <li>${t('rc.compet', {n: fmt(c.competitor)})}</li>
     ${M.scouted ? (disc ? `${c.trueN > c.stated ? `<li class="new">${t('rc.scoutTrue', {target: target(c.trueN)})}</li>` : ''}${c.hidden ? `<li class="new">${t('rc.scoutHidden', {tag: tagName(c.hidden)})}</li>` : ''}` : `<li class="new">${t('rc.scoutClean')}</li>`) : ''}
   </ul>
   ${M.scouted ? '' : B(t('btn.scout'), () => { if (S.chest < scoutCost) return toast(t('toast.noMoney')); spend(scoutCost); M.scouted = true; rcIntel(c); }, {sub: t('rc.scoutSub', {n: scoutCost})})}</div>
   <div class="panel"><h4>${t('rc.bid')}</h4><div class="choices">
     ${B(`${M.clause ? '■' : '□'} ${t('rc.clause')}`, () => { M.clause = !M.clause; rcIntel(c); }, {sub: t('rc.clauseSub')})}
     ${B(t('rc.low', {n: fmt(bids.low)}), accept('low'), {sub: t('rc.lowSub')})}
     ${B(t('rc.std', {n: fmt(bids.std)}), accept('std'), {cls: 'pri', sub: t('rc.stdSub')})}
     ${B(t('rc.high', {n: fmt(bids.high)}), accept('high'), {sub: justified ? t('rc.highSubOk') : t('rc.highSub')})}
     ${B(t('btn.toBoard'), () => { goHall(); })}</div></div></div>`);
}

/* 旅途事件：每趟最多一個 */
const TRAVEL_EVENTS = {
  storm: X => card(t('tv.storm.t'), t('tv.storm.b'), [
    {label: t('tv.storm.a'), sub: t('tv.oneDay', {n: S.M.rationRate}), fn: () => { spend(S.M.rationRate); X.days++; card(t('tv.storm.t'), res([t('tv.storm.aR')]), [cont(X)]); }},
    {label: t('tv.storm.b2'), sub: t('tv.storm.b2Sub'), fn: () => { const m = rnd() < 0.5 ? injure(1) : null; card(t('tv.storm.t'), res([m ? ['w', t('tv.storm.hurt', {name: nm(m)})] : ['g', t('tv.storm.ok')]]), [cont(X)]); }},
  ]),
  horse: X => card(t('tv.horse.t'), t('tv.horse.b'), [
    {label: t('tv.horse.a'), sub: silver(15), fn: () => { spend(15); card(t('tv.horse.t'), res([t('tv.horse.aR')]), [cont(X)]); }},
    {label: t('tv.horse.b2'), sub: t('tv.oneDay', {n: S.M.rationRate}), fn: () => { spend(S.M.rationRate); X.days++; card(t('tv.horse.t'), res([t('tv.horse.bR')]), [cont(X)]); }},
  ]),
  herbs: X => card(t('tv.herbs.t'), t('tv.herbs.b'), [
    {label: t('tv.herbs.a'), sub: t('tv.oneDay', {n: S.M.rationRate}), fn: () => { spend(S.M.rationRate); X.days++; S.M.extraLoot.push([t('tv.herbs.loot'), 40]); card(t('tv.herbs.t'), res([['g', t('tv.herbs.aR')]]), [cont(X)]); }},
    {label: t('tv.herbs.b2'), fn: X.resume},
  ]),
  toll: X => card(t('tv.toll.t'), t('tv.toll.b'), [
    {label: t('tv.toll.a'), sub: silver(10), fn: () => { spend(10); X.resume(); }},
    {label: t('tv.toll.b2'), sub: t('tv.oneDay', {n: S.M.rationRate}), fn: () => { spend(S.M.rationRate); X.days++; X.resume(); }},
  ]),
  traveler: X => card(t('tv.trav.t'), t('tv.trav.b'), [
    {label: t('tv.trav.a'), sub: t('tv.trav.aSub'), dis: !(S.inv.healmat > 0 && (has('heal') || has('appr'))), fn: () => { S.inv.healmat--; S.rep += 5; card(t('tv.trav.t'), res([['g', t('tv.trav.aR')]]), [cont(X)]); }},
    {label: t('tv.trav.b2'), sub: silver(5), fn: () => { spend(5); S.rep += 2; card(t('tv.trav.t'), res([t('tv.trav.bR')]), [cont(X)]); }},
    {label: t('tv.trav.c'), fn: X.resume},
  ]),
};
const cont = X => ({label: t('btn.continue'), fn: X.resume});

function rcGo() {
  const M = S.M, c = M.rc, T = RC[c.id];
  M.extraLoot = [];
  const events = {};
  if (M.rationDays >= 2 && rnd() < 0.6) {
    const pool = Object.keys(TRAVEL_EVENTS).filter(k => k !== 'horse' || M.svc.horses);
    events[1 + Math.floor(rnd() * (M.rationDays - 1))] = TRAVEL_EVENTS[pick(pool)];
  }
  expedition({biome: T.biome, monster: T.monster, days: M.rationDays, extras: (M.svc.porters ? 2 : 0) + (M.svc.processor ? 1 : 0), events,
    onArrive: X => rcArrive(X)});
}
function rcArrive(X) {
  const M = S.M, c = M.rc;
  const target = n => t(`rc.${c.id}.target`, {n});
  const disc = c.trueN > c.stated || !!c.hidden;
  if (!disc || M.priced) {
    card(t('rc.arrive'), `<p>${t('rc.arriveB', {target: target(c.trueN)})}</p>`, [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => rcFight(X, 0))}]);
    return;
  }
  const parts = [];
  if (c.trueN > c.stated) parts.push(t('rc.wrong.count', {a: target(c.stated), b: target(c.trueN)}));
  if (c.hidden) parts.push(t('rc.wrong.hidden', {tag: tagName(c.hidden)}));
  const opts = [];
  if (M.clause) opts.push({label: t('rc.o.reneg'), sub: t('rc.o.renegSub', {n: M.rationRate * 2}), cls: 'pri', fn: () => {
    spend(M.rationRate * 2); S.day += 2;
    M.bounty = Math.round(M.bounty * 1.5 / 10) * 10; M.escrow = M.bounty; renderHUD();
    card(t('rc.o.reneg'), res([['g', t('rc.reneg.res', {n: fmt(M.bounty)})]]), [{label: t('btn.fight'), cls: 'pri', fn: () => battle(X, () => rcFight(X, 0.1))}]);
  }});
  opts.push({label: t('rc.o.push'), sub: t('rc.o.pushSub'), fn: () => battle(X, () => rcFight(X, 0))});
  opts.push({label: t('rc.o.quit'), sub: M.clause ? t('rc.o.quitSubC') : t('rc.o.quitSubN'), fn: () => {
    if (!M.clause) S.rep -= 10;
    rcFinish();
    settle({title: t(M.clause ? 'rc.s.withdraw' : 'rc.s.forf', {name: missionName(M)}), bounty: 0, resultKey: M.clause ? 'res.withdraw' : 'res.forfeit',
      introKey: M.clause ? 'rc.withdrawIntro' : 'rc.forfIntro', loot: M.extraLoot});
  }});
  card(t('rc.wrong.title'), `<p>${parts.join(' ')}</p>`, opts);
}
function rcFight(X, bonus) {
  const M = S.M, c = M.rc, L = [];
  let unc = 0; const used = {};
  rcTags(c).filter(tag => tag !== 'loot').forEach(tag => {
    const r = tagResolve(tag, c.D);
    r.used.forEach(([k, n]) => { used[k] = (used[k] || 0) + n; });
    if (r.ok) L.push(['g', t('rc.f.ok', {tag: tagName(tag)})]);
    else {
      unc++; L.push(['w', t('rc.f.bad', {tag: tagName(tag)})]);
      const lvl = rnd() < 0.15 * c.D ? 2 : rnd() < 0.6 ? 1 : 0;
      if (lvl) { const m = injure(lvl); if (m) L.push(['b', t(lvl === 2 ? 'rc.f.hurt2' : 'rc.f.hurt', {name: nm(m)})]); }
    }
  });
  if (rnd() < 0.08 * c.D) { const m = injure(1); if (m) L.push(['w', t('rc.f.hurt', {name: nm(m)})]); }
  const ratio = Math.max(0, (c.trueN - c.stated) / c.stated);
  const healer = has('heal') || has('appr');
  const p = Math.max(0.15, Math.min(0.97, 0.97 - 0.13 * unc - 0.12 * ratio - 0.04 * (c.D - 1) + (healer ? 0.04 : 0) + bonus));
  const usedTxt = Object.entries(used).map(([k, n]) => `${t('inv.' + k)}×${n}`).join(t('list.sep'));
  if (usedTxt) L.push(t('rc.f.used', {list: usedTxt}));
  const loot = M.extraLoot.slice(), ded = [];
  if (rnd() < p) {
    L.push(['g', t('rc.f.win')]);
    if (RC[c.id].tags.includes('loot')) {
      const base = RC[c.id].base * (1 + 0.3 * (S.year - 1)) * 0.5;
      if (M.svc.processor) { const v = Math.round(base / 10) * 10; loot.push([t('rc.lootProc'), v]); ded.push([t('rc.d.proc'), Math.round(v * 0.1)]); }
      else if (M.svc.porters) loot.push([t('rc.lootPort'), Math.round(base * 0.35 / 10) * 10]);
      else L.push(['w', t('rc.lootNone')]);
    }
    card(t('fight.over'), res(L), [{label: t('btn.verify'), cls: 'pri', fn: () => {
      rcFinish();
      settle({title: t('rc.s.title', {name: missionName(M)}), bounty: M.bounty, loot, ded, noteKey: 'rc.note'});
    }}]);
  } else {
    L.push(['b', t('rc.f.lose')]);
    card(t('fight.retreat'), res(L), [{label: t('btn.back'), cls: 'pri', fn: () => {
      S.rep -= 5; rcFinish();
      settle({title: t('rc.s.fail', {name: missionName(M)}), bounty: 0, resultKey: 'res.fail', introKey: 'rc.failIntro', loot});
    }}]);
  }
}
function rcFinish() { S.day += 1; }
