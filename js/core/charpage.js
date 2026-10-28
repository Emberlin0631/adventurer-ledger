/* 角色資訊頁：點名冊上的人物卡進入。隊長（玩家）可以自己選天賦、手動升級裝備。
   天賦：每升一級得 1 點（Lv2 起，最多 4 點），重新分配要付 60 銀 */
const CAP_SKILLS = ['lead', 'haggle', 'thrift', 'tactics', 'medic', 'eye'];
const RESPEC_COST = 60;
const capSkill = k => { const c = mem('cap'); return !!(c && c.skills && c.skills.includes(k)); };
const skillPoints = c => Math.max(0, lvOf(c) - 1 - (c.skills || []).length);
let CHAR_OPEN = null;

document.addEventListener('click', e => {
  const el = e.target.closest('.mem[data-nk]');
  if (!el || S.M) return;
  const m = S.members.find(x => x.nk === el.dataset.nk);
  if (m) charScreen(m);
});

function charScreen(m) {
  CHAR_OPEN = m;
  migrateMember(m);
  const isCap = m.key === 'cap';
  if (isCap && !m.skills) m.skills = [];
  screen(() => {
    const nx = nextXP(m), c = gearCost(m);
    const base = XP_LEVELS[lvOf(m) - 1];
    const pct = nx == null ? 100 : Math.round((m.xp - base) / (nx - base) * 100);
    const kv = (k, v) => `<div class="kv num"><span>${k}</span><span>${v}</span></div>`;
    const info = `<div class="panel charinfo"><div class="charhead">${portrait(m)}<div><h2>${nm(m)}</h2><p class="muted">${roleOf(m)}${traitOf(m) ? '・' + t('tr.' + traitOf(m)) : ''}</p></div></div>
      ${traitOf(m) ? `<p class="muted">${t('tr.' + traitOf(m) + '.d')}</p>` : ''}
      ${kv(t('ms.level'), `Lv${lvOf(m)}${nx == null ? ` ${t('ms.max')}` : `（${m.xp} / ${nx}）`}`)}
      <div class="xpbar"><i style="width:${pct}%"></i></div>
      ${kv(t('cp.status'), t('hp.' + m.hp))}
      ${isCap ? '' : kv(t('cp.loy'), `${m.loy} / 100`)}
      ${kv(t('ms.share'), `${m.share}・${t('ms.earned', {n: fmt(m.earned)})}`)}
      ${kv(t('ms.purse'), silver(m.purse))}
      ${kv(t('ms.gear'), `${gearName(m)}${m.gear ? `＋${t('mem.gear')}` : ''}${m.ptier ? ` <span class="muted">${t('ms.party', {n: m.ptier})}</span>` : ''}`)}
      ${kv(t('ms.perk'), `<span>${perkLine(m)}</span>`)}</div>`;

    // 裝備：隊長手動決定用自己的錢還是錢箱升級；其他成員自動用自己的分紅買
    const gear = `<div class="panel"><h4>${t('cp.gearT')}</h4>
      <p class="muted">${isCap ? t('cp.gearCap') : t('cp.gearOther')}</p>
      ${c == null ? `<p>${t('cp.gearMax')}</p>` : `<p>${t('cp.gearNext', {name: t('gear.' + m.key + '.' + (tierOf(m) + 1)), n: fmt(c)})}</p><div class="choices">
        ${isCap ? B(t('cp.gearPurse', {n: fmt(c)}), () => { if (m.purse < c) return toast(t('toast.noMoney')); m.purse -= c; m.tier++; charScreen(m); }, {cls: 'pri', dis: m.purse < c, sub: t('cp.gearPurseSub', {n: fmt(m.purse)})}) : ''}
        ${B(t('ms.fund', {n: fmt(c)}), () => partyFundGear(m), {cls: isCap ? '' : 'pri', sub: t('ms.fundSub'), dis: S.chest < c})}</div>`}</div>`;

    // 天賦：只有隊長
    let skills = '';
    if (isCap) {
      const pts = skillPoints(m), have = m.skills;
      skills = `<div class="panel"><h4>${t('cp.skillT')}</h4><p class="muted">${t('cp.skillLede', {n: pts})}</p>
        <div class="skills">${CAP_SKILLS.map(k => {
          const on = have.includes(k);
          return `<div class="skill ${on ? 'on' : ''}"><b>${t('sk.' + k)}</b><span class="muted">${t('sk.' + k + '.d')}</span>${on ? `<span class="pill ok">${t('cp.learned')}</span>` : B(t('cp.learn'), () => { if (skillPoints(m) < 1) return toast(t('cp.noPoint')); m.skills.push(k); charScreen(m); }, {cls: 'sq', dis: pts < 1})}</div>`;
        }).join('')}</div>
        ${have.length ? B(t('cp.respec', {n: RESPEC_COST}), () => { if (S.chest < RESPEC_COST) return toast(t('toast.noMoney')); S.chest -= RESPEC_COST; m.skills = []; charScreen(m); }, {cls: 'ghost', dis: S.chest < RESPEC_COST}) : ''}</div>`;
    }
    return `<div class="row" style="justify-content:flex-end">${B(t('cp.all'), membersScreen, {cls: 'ghost'})}${B(t('btn.backHall'), goHall)}</div>
      <div class="split">${info}<div style="display:grid;gap:14px;align-content:start">${skills}${specPanel(m, charScreen)}${gear}</div></div>`;
  });
}
