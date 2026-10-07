# 機率與統計作品集

用數據說故事，把抽象的數學變成可以操作的東西。

五個可以直接在瀏覽器操作的專案，涵蓋機率模擬、假設檢定、分布推論、機器學習的數學底層，以及一個完整的產業應用。每個專案都把模擬結果跟理論值對照，並附上自動化的結果檢查。

**線上瀏覽：** 啟用 GitHub Pages 後，網址為 `https://<帳號>.github.io/portfolio-demos/`

## 專案

| # | 類型 | 專案 | 內容 |
|---|---|---|---|
| 01 | Probability & Simulation | [蒙地卡羅模擬實驗室](monte-carlo.html) | 估算 π、蒙提霍爾問題、賭徒破產（期望值、變異數、破產機率、押注策略） |
| 02 | EDA & Hypothesis Testing | [A/B 測試與迴歸分析](ab-testing.html) | 雙比例 z 檢定、檢定力與樣本數、型一／型二錯誤、偷看造成的誤判膨脹、房價多元迴歸與 VIF |
| 03 | Distributions & Inference | [機率分布與統計推論](distributions.html) | 來客數卜瓦松配適與卡方檢定、排班建議；保險理賠對數常態 vs 帕雷托尾部、VaR / TVaR、拔靴信賴區間 |
| 04 | ML / AI Math Foundations | [手刻貝氏分類器與馬可夫鏈](ml-foundations.html) | 單純貝氏垃圾訊息過濾器與留一法評估；市場狀態馬可夫鏈、穩態分布、從資料反推轉移矩陣 |
| 05 | 產業應用 | [金鯉躍門 PAR 表](slot-par-sheet.html) | 5×3 視訊老虎機：精確 RTP 拆解、30 萬局模擬、波動度、輪帶敏感度分析、送審檢查、試玩機台 |

## 技術說明

- 純 HTML / CSS / JavaScript，不需要安裝或建置，直接開 `index.html` 即可
- 不使用統計或機器學習套件：常態／卡方／t 分布函數、矩陣反運算、最小平方法、貝氏分類器都是手寫（見 `assets/lib.js`）
- 模擬使用可重現的 mulberry32 亂數產生器（固定種子）
- 示範資料由程式依已知分布生成或自行撰寫，因此可以直接對照估計值與真實值
- 老虎機的預設參數另以 Python 原型交叉驗算

## 檔案結構

```
index.html            作品集首頁
monte-carlo.html      專案 01
ab-testing.html       專案 02
distributions.html    專案 03
ml-foundations.html   專案 04
slot-par-sheet.html   專案 05
assets/site.css       共用樣式
assets/lib.js         共用數學函數與圖表
```
