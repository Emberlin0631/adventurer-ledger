/* 遊戲狀態、成員工具、存讀檔 */
const SAVE_KEY = 'adventurer-ledger-save';
const SAVE_VERSION = 2;
const SEASON_DAYS = 30, YEAR_DAYS = 120;
const S = {};

function makeMember(key) {
  const tp = MEMBER_TEMPLATES[key];
  return {key, nk: tp.nk, share: tp.share, color: tp.color, hp: 0, loy: tp.loy, earned: 0, earnedY: 0, sitting: false};
}
function newGame() {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    day: 1, chest: 500, rep: 50, inv: {antidote: 0, antipetri: 0, mirror: 0, crystal: 0, healmat: 0},
    bones: 0, progress: 0, flags: {}, records: [], yours: 0, yoursY: 0, M: null, pending: [], started: false,
    year: 1, seasonIdx: 0, board: [], uidSeq: 1, duesNote: 0,
    members: STARTING_ROSTER.map(makeMember),
  });
}

/* 存檔只在大廳發生，那時沒有進行中的任務（S.M 為 null） */
function saveGame() {
  try {
    const data = {...S, M: null};
    localStorage.setItem(SAVE_KEY, JSON.stringify({v: SAVE_VERSION, at: Date.now(), s: data}));
  } catch (e) {}
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return 'none';
    const d = JSON.parse(raw);
    if (!d || d.v !== SAVE_VERSION || !d.s) return 'old';
    newGame(); Object.assign(S, d.s, {M: null});
    S.members.forEach(m => { m.sitting = false; });
    return 'ok';
  } catch (e) { return 'old'; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

const has = k => S.members.some(m => m.key === k && !m.sitting && m.hp < 2);
const mem = k => S.members.find(m => m.key === k);
const participants = () => S.members.filter(m => !m.sitting);
const nm = m => m ? t(m.nk) : t('someone');
const missionName = M => t(M.nameKey, M.place != null ? {place: t('place.' + M.place)} : undefined);
const roleOf = m => t('r.' + m.key);
function injure(level, prefer) {
  let pool = participants().filter(m => m.hp < 2);
  if (prefer) { const p = pool.filter(m => prefer.includes(m.key)); if (p.length) pool = p; }
  if (!pool.length) return null;
  const m = pick(pool); m.hp = Math.max(m.hp, level); return m;
}
function spend(n, M = S.M) { S.chest -= n; if (M) M.spent += n; }
function addLoy(m, d) { if (m) m.loy = Math.max(0, Math.min(100, m.loy + d)); }
