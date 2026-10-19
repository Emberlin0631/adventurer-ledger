/* 物品與服務。svc = 只對本次任務有效的服務；其餘是會留在庫存的消耗品。名稱與說明在語言檔 item.<key>.name / .desc */
const ITEMS = {
  repair:   {price: 60,  svc: true},
  horses:   {price: 30,  svc: true},
  guide:    {price: 20,  svc: true},
  antidote: {price: 35},
  antipetri:{price: 60},
  mirror:   {price: 40},
  crystal:  {price: 25},
  healmat:  {price: 50},
  mapper:   {price: 70,  svc: true},
  processor:{price: 80,  svc: true},
  saltbox:  {price: 120, svc: true},
  porters:  {price: 60,  svc: true},
};
const INVKEYS = ['antidote', 'antipetri', 'mirror', 'crystal', 'healmat'];

/* 成員範本。nk = 名字的語言鍵；角色名稱用 r.<key> */
const MEMBER_TEMPLATES = {
  cap:     {nk: 'm.cap',    share: 1.3,  color: '#d4a84e', loy: 100},
  scout:   {nk: 'm.lynn',   share: 1,    color: '#6fae7b', loy: 70},
  tank:    {nk: 'm.bauer',  share: 1,    color: '#8f9bb0', loy: 70},
  mage:    {nk: 'm.ess',    share: 1.25, color: '#d8693f', loy: 70},
  heal:    {nk: 'm.martin', share: 1.5,  color: '#ece4cc', loy: 70},
  appr:    {nk: 'm.he',     share: 0.75, color: '#c8d6b0', loy: 65},
  trainee: {nk: 'm.yue',    share: 0.5,  color: '#9fb4c8', loy: 75},
  tracker: {nk: 'm.grey',   share: 1,    color: '#a98a64', loy: 70},
};
const STARTING_ROSTER = ['cap', 'scout', 'tank', 'mage', 'heal'];
