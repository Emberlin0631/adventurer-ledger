/* 遊戲狀態、成員工具、存讀檔 */
const SAVE_KEY = 'adventurer-ledger-save';
const SAVE_VERSION = 4;
const SEASON_DAYS = 30, YEAR_DAYS = 120;
const S = {};

/* 難度：起始錢箱、季度開銷倍率、重傷致死基礎機率、隊長會不會死 */
const DIFFS = {
  easy: {chest: 600, dues: 0.8,  death: 0.04, capDies: false},
  std:  {chest: 500, dues: 1,    death: 0.12, capDies: false},
  hard: {chest: 420, dues: 1.25, death: 0.22, capDies: true},
};
const NAME_POOL = 10;
function makeMember(key, nk) {
  const tp = MEMBER_TEMPLATES[key];
  return {key, nk: nk || tp.nk, share: tp.share, color: tp.color, hp: 0, loy: tp.loy, earned: 0, earnedY: 0, sitting: false, trait: START_TRAITS[key] || null, lv: key === 'heal' ? 2 : 1, xp: key === 'heal' ? 60 : 0, tier: 0, purse: 0};
}
function newGame(diff = 'std') {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    diff, fallen: [], deadPending: [], namesUsed: [],
    day: 1, chest: DIFFS[diff].chest, rep: 50, inv: {antidote: 0, antipetri: 0, mirror: 0, crystal: 0, healmat: 0},
    bones: 0, progress: 0, flags: {}, records: [], yours: 0, yoursY: 0, M: null, pending: [], started: false,
    year: 1, seasonIdx: 0, board: [], uidSeq: 1, duesNote: 0,
    members: STARTING_ROSTER.map(k => makeMember(k)),
  });
  rollMarket();
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
    S.members.forEach(m => { m.sitting = false; migrateMember(m); });
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
/* 所有受傷都經過 hurt()：重傷者記進本次任務，結算前做致死判定 */
function hurt(m, level) {
  if (!m) return m;
  if (level === 2 && m.hp < 2 && gearSaves(m)) { level = 1; if (S.M) (S.M.saves = S.M.saves || []).push(m); }   // 好裝備擋下致命一擊
  if (level === 2 && m.hp < 2 && S.M) (S.M.serious = S.M.serious || []).push(m);
  m.hp = Math.max(m.hp, level);
  return m;
}
function injure(level, prefer) {
  let pool = participants().filter(m => m.hp < 2);
  if (prefer) { const p = pool.filter(m => prefer.includes(m.key)); if (p.length) pool = p; }
  if (!pool.length) return null;
  return hurt(weightedPick(pool), level);
}
function spend(n, M = S.M) { S.chest -= n; if (M) M.spent += n; }
function addLoy(m, d) { if (m) m.loy = Math.max(0, Math.min(100, m.loy + d)); }
