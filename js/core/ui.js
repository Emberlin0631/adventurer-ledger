/* 共用介面：按鈕註冊、畫面切換、事件卡、HUD、頭像 */
const $ = s => document.querySelector(s);
const rnd = () => Math.random();
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmt = n => Math.round(n).toLocaleString(LANG === 'en' ? 'en-US' : 'zh-TW');
const silver = n => t('unit', {n: fmt(n)});
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

let REG = {}, RN = 0, EXP = null, CUR = null;
function clearReg() { REG = {}; RN = 0; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b && !b.disabled && REG[b.dataset.a]) REG[b.dataset.a](e);
});
function B(label, fn, o = {}) {
  const id = 'a' + (RN++); REG[id] = fn;
  return `<button class="btn ${o.cls || ''}" data-a="${id}" ${o.dis ? 'disabled' : ''}>${label}${o.sub ? `<small>${o.sub}</small>` : ''}</button>`;
}
/* screen(fn)：fn 只負責組 HTML，所以切換語言時可以安全地再跑一次 */
function screen(fn) {
  if (EXP) { EXP.stop = true; EXP = null; }
  CUR = typeof fn === 'function' ? fn : null;
  clearReg();
  $('#main').innerHTML = CUR ? CUR() : (fn || '');
  renderHUD();
  window.scrollTo({top: 0, behavior: RM ? 'auto' : 'smooth'});
}
function rerender() {
  renderHUD();
  if (CUR) { clearReg(); $('#main').innerHTML = CUR(); }
}
function toast(msg) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg;
  document.body.appendChild(d); setTimeout(() => d.remove(), 2200);
}
function card(title, html, choices = []) {
  // 每張事件卡的選項只能按一次：按下後整張卡的按鈕都停用，避免重複扣款
  let done = false;
  const once = fn => () => {
    if (done) return; done = true;
    document.querySelectorAll('#evbox button').forEach(b => { b.disabled = true; });
    fn();
  };
  const ch = choices.map(c => B(c.label, once(c.fn), {sub: c.sub, dis: c.dis, cls: c.cls})).join('');
  $('#evbox').innerHTML = `<div class="card"><h4>${title}</h4>${html}${ch ? `<div class="choices">${ch}</div>` : ''}</div>`;
  renderHUD();
}
const res = lines => `<div class="res">${lines.map(l => typeof l === 'string' ? `<div>${l}</div>` : `<div class="${l[0]}">${l[1]}</div>`).join('')}</div>`;

function notice(o) {
  return `<article class="notice ${o.small ? 'small' : ''}"><h3>${o.title}</h3><div class="meta">${o.meta.map(x => `<span>${x}</span>`).join('')}</div><div class="bounty">${o.bounty}</div><p>${o.body}</p><div class="row">${o.btn}</div></article>`;
}

function portrait(m) {
  let em = '';
  switch (m.key) {
    case 'cap': em = '<path d="M29 25h8v6q0 5-4 7q-4-2-4-7z" fill="#8a6a2c" stroke="#e8cf8a" stroke-width="1"/>'; break;
    case 'scout': em = '<path d="M31 22q7 8 0 16" fill="none" stroke="#c8a36b" stroke-width="1.6"/><line x1="31" y1="22" x2="31" y2="38" stroke="#eee" stroke-width=".6"/>'; break;
    case 'tank': em = '<path d="M12 15q8-9 16 0v3H12z" fill="#7d8798"/>'; break;
    case 'mage': em = '<path d="M33 38q-5-4-1-10q1 3 3 3q0-4 2-6q3 6-1 13z" fill="#f08a3c"/>'; break;
    case 'heal': case 'appr': em = '<path d="M30 37q0-9 7-11q0 9-7 11z" fill="#7fb77e"/><line x1="30" y1="37" x2="35" y2="29" stroke="#3d6b3c" stroke-width=".8"/>'; break;
    case 'trainee': em = '<line x1="31" y1="38" x2="37" y2="24" stroke="#cfd6df" stroke-width="2"/><line x1="31" y1="33" x2="36" y2="35" stroke="#8a6a2c" stroke-width="2"/>'; break;
    case 'tracker': em = '<circle cx="33" cy="33" r="2.4" fill="#b98d5a"/><circle cx="30" cy="28.5" r="1.3" fill="#b98d5a"/><circle cx="33" cy="27.5" r="1.3" fill="#b98d5a"/><circle cx="36" cy="28.5" r="1.3" fill="#b98d5a"/>'; break;
  }
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#30362b"/><path d="M6 40q14-20 28 0z" fill="${m.color}"/><circle cx="20" cy="17" r="7" fill="#d9b48f"/>${em}</svg>`;
}

function dateText() {
  const d = S.day - 1, y = Math.floor(d / YEAR_DAYS) + 1;
  return t('date', {y, s: t('season.' + (Math.floor(d / SEASON_DAYS) % 4)), d: d % SEASON_DAYS + 1});
}
function renderHUD() {
  $('#date').innerHTML = dateText();
  $('#chest').textContent = silver(S.chest);
  const n = Math.max(0, Math.min(6, Math.ceil(S.chest / 120)));
  $('#coins').innerHTML = Array.from({length: n}, (_, i) => `<i style="bottom:${i * 4}px"></i>`).join('');
  const esc = S.M && S.M.escrow ? S.M.escrow : 0;
  $('#escrow').textContent = silver(esc);
  $('#escrowBox').classList.toggle('off', !esc);
  $('#rep').textContent = S.rep;
  const hpC = ['ok', 'l1', 'l2'];
  $('#roster').innerHTML = S.members.map(m => `<div class="mem ${m.sitting ? 'out' : ''}">${portrait(m)}
    <div class="nm">${nm(m)}</div><div class="rl">${t('roster.share', {role: roleOf(m), s: m.share})}</div>
    <div class="st"><span class="pill ${hpC[m.hp]}">${m.sitting ? t('hp.rest') : t('hp.' + m.hp)}</span>${m.key !== 'cap' ? `<span class="loy" title="${t('roster.loy', {n: m.loy})}"><i style="width:${m.loy}%"></i></span>` : ''}</div></div>`).join('');
}
