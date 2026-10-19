# 冒險者小隊帳本（暫名） / The Party Ledger (working title)

瀏覽器經營模擬遊戲：把冒險者小隊當成一門生意來經營。接委託、議約、採購、出征，賞金由公會托管，驗收後結算分帳。
A browser management sim about running an adventurer party as a business.

- 狀態：原型 v0.2（中英雙語、自動存檔）
- 免安裝，直接開 `index.html` 即可遊玩；無建置步驟

## 檔案結構

```
index.html            頁面骨架與載入順序
css/style.css         樣式
js/lang/zh-Hant.js    繁中文字（所有畫面文字都在這裡）
js/lang/en.js         英文文字（鍵名與繁中相同）
js/core/              引擎：i18n、介面、狀態與存檔、採購、遠征畫面、結算、大廳
js/data/items.js      物品價格、成員範本
js/data/jobs.js       可重複小委託（數值與結果）
js/contracts/         主線委託（c1、c2、c3）與季中事件
js/main.js            啟動
```

## 加內容的方式

- 新文字：兩個語言檔各加一個同名鍵，程式裡用 `t('鍵名', {參數})`
- 新小委託：在 `js/data/jobs.js` 加一筆 `JOBS.<id>`，並在語言檔加 `job.<id>.*`
- 新主線：在 `js/contracts/` 新增檔案，用 `registerContract({id, progress, notice})` 註冊，再加進 `index.html`
- 存檔格式改變時，把 `js/core/state.js` 的 `SAVE_VERSION` 加一
