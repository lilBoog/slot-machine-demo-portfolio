# 機率與統計作品集


主軸專案用一台虛構老虎機，走完一個機率產品從設計、認證、上線到營運的完整數據流程；四個基礎專案則把同樣的方法放在通用情境裡。所有頁面都可以直接在瀏覽器操作，模擬結果都會跟理論值對照，並附上自動化的結果檢查。


## 主軸專案：金鯉躍門，一台老虎機的數據生命週期

5 軸 × 3 列、20 線視訊老虎機。五個章節共用同一台機台，在第 1 章調整輪帶或賠率，第 2–5 章會自動套用新配置。

| 章 | 頁面 | 內容 | 方法 |
|---|---|---|---|
| 1 設計 | [PAR 表](slot-par-sheet.html) | 輪帶與賠率表、精確 RTP 拆解、波動度、敏感度分析、目標 RTP 校準、試玩機台 | 期望值、全組合窮舉、蒙地卡羅 |
| 2 驗證 | [送審前的三道關卡](slot-verify.html) | RNG 均勻性與序列相關檢定、確認 RTP 所需轉數、免費遊戲場次分布 | 卡方配適度、中央極限定理、吸收型馬可夫鏈 |
| 3 玩家體驗 | [帶 1,000 點能玩多久](slot-player.html) | 破產機率、存活曲線、押注大小比較、連續未中獎長度 | 賭徒破產、存活分析 |
| 4 上線監控 | [RTP 偏了要不要報警](slot-monitor.html) | 30 天營運報表、z 檢定警示 vs 固定區間、多重檢定誤報、觸發次數卜瓦松檢定 | z 檢定、大數法則、多重檢定 |
| 5 營運分析 | [RTP 調低比較賺嗎](slot-ops.html) | 數學版本 A/B 測試、遊玩時長迴歸、留存與 LTV、外掛帳號偵測 | Welch t、雙比例 z、OLS／VIF、馬可夫鏈基本矩陣、單純貝氏 |

## 基礎方法

| # | 類型 | 專案 | 內容 |
|---|---|---|---|
| 01 | Probability & Simulation | [蒙地卡羅模擬實驗室](monte-carlo.html) | 估算 π、蒙提霍爾問題、賭徒破產 |
| 02 | EDA & Hypothesis Testing | [A/B 測試與迴歸分析](ab-testing.html) | 雙比例 z 檢定、檢定力、偷看的代價、房價迴歸與 VIF |
| 03 | Distributions & Inference | [機率分布與統計推論](distributions.html) | 來客數卜瓦松配適與排班、保險理賠尾部、VaR／TVaR、拔靴法 |
| 04 | ML / AI Math Foundations | [手刻貝氏分類器與馬可夫鏈](ml-foundations.html) | 垃圾訊息過濾器、市場狀態馬可夫鏈 |

## 技術說明

- 純 HTML / CSS / JavaScript，不需要安裝或建置，直接開 `index.html` 即可
- 不使用統計或機器學習套件：常態／卡方／t 分布函數、矩陣反運算、最小平方法、貝氏分類器都是手寫（`assets/lib.js`）
- 老虎機的數學引擎集中在 `assets/slot-engine.js`，五個章節共用；第 1 章的配置透過瀏覽器 localStorage 傳給其他章節
- 模擬使用可重現的 mulberry32 亂數產生器（固定種子）
- 示範資料由程式依已知分布生成或自行撰寫；玩家行為與回訪模型為示範假設，不代表實際營運數據
- 老虎機的預設參數另以 Python 原型交叉驗算（理論 RTP 96.97%）

## 檔案結構

```
index.html              作品集首頁
slot-par-sheet.html     金鯉躍門 第 1 章 設計
slot-verify.html        金鯉躍門 第 2 章 驗證
slot-player.html        金鯉躍門 第 3 章 玩家體驗
slot-monitor.html       金鯉躍門 第 4 章 上線監控
slot-ops.html           金鯉躍門 第 5 章 營運分析
monte-carlo.html        基礎 01
ab-testing.html         基礎 02
distributions.html      基礎 03
ml-foundations.html     基礎 04
assets/site.css         共用樣式
assets/lib.js           共用數學函數與圖表
assets/slot-engine.js   老虎機數學引擎
```
