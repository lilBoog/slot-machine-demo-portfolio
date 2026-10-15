-- =====================================================================
-- 金鯉躍門 營運資料 SQL 查詢集（SQLite 語法）
-- 資料庫：jinli.db　｜　執行方式：python run_queries.py，或用 DB Browser for SQLite 開啟
--
-- 資料表
--   games         各版本的理論值（RTP、單局標準差 sigma、觸發率）
--   players       玩家：註冊日、VIP 等級、來源管道
--   spins         每一次付費轉動（win 已含該轉觸發的免費遊戲贏分）
--   config_par    PAR 表規格（輪帶停點數、賠率、免費遊戲設定）
--   config_build  各版本遊戲實際使用的設定（由開發匯出）
--   v_spins       檢視表：去除重複與錯誤紀錄後的乾淨資料，報表一律用它
--
-- 注意：SQLite 預設沒有 SQRT()、POWER()，所以 z 檢定改用 z² 判斷（z² > 9 等同 |z| > 3），
--       平方用 d × d 計算，z 值本身交給 Excel 日報。SQL Server、MySQL 可直接用 SQRT()、POWER()。
-- =====================================================================


-- [Q01] 資料品質檢查：重複紀錄 -----------------------------------------
-- 同一個 spin_id 出現多次，代表寫入重複，加總時會重複計算
SELECT spin_id, spin_time, COUNT(*) AS copies
FROM   spins
GROUP  BY spin_id
HAVING COUNT(*) > 1
ORDER  BY spin_id;


-- [Q02] 資料品質檢查：不合理數值 ---------------------------------------
-- 押注必須大於 0；贏分不能為負，也不應超過押注的 5,000 倍
SELECT spin_id, spin_time, bet, win,
       CASE WHEN bet <= 0 THEN '押注 <= 0'
            WHEN win < 0  THEN '贏分為負'
            ELSE '贏分超過 5,000 倍' END AS issue
FROM   spins
WHERE  bet <= 0 OR win < 0 OR win > bet * 5000;


-- [Q03] 資料品質檢查：每日筆數（檢查有沒有缺日期或筆數異常） -----------
SELECT date(spin_time)                AS report_date,
       COUNT(*)                       AS raw_rows,
       (SELECT COUNT(*) FROM v_spins v WHERE date(v.spin_time) = date(s.spin_time)) AS clean_rows
FROM   spins s
GROUP  BY date(spin_time)
ORDER  BY report_date;


-- [Q04] 日報：每日 RTP 與 z² 警示（日報 Excel 的資料來源） -------------
-- 先用 CTE 算出每日彙總，再算 z²；SQLite 沒有 POWER()，所以用 d × d 取平方
-- RTP 以「總押注」為分母，押注大小不同時，用 總押注 ÷ 20 換算成等效的單位轉數
WITH daily AS (
  SELECT date(s.spin_time)                  AS report_date,
         s.version,
         COUNT(*)                           AS spins,
         COUNT(DISTINCT s.player_id)        AS players,
         SUM(s.bet)                         AS total_bet,
         SUM(s.win)                         AS total_win,
         SUM(s.fg_triggered)                AS fg_triggers,
         MAX(s.win * 1.0 / s.bet)           AS max_multiple,
         SUM(s.win) * 1.0 / SUM(s.bet) - g.theoretical_rtp AS d,
         g.theoretical_rtp,
         g.sigma
  FROM   v_spins s
  JOIN   games g ON g.game_id = s.game_id AND g.version = s.version
  GROUP  BY date(s.spin_time), s.version
)
SELECT report_date, version, spins, players, total_bet, total_win, fg_triggers,
       ROUND(max_multiple, 1)                                   AS max_multiple,
       ROUND(total_win * 1.0 / total_bet, 4)                    AS actual_rtp,
       ROUND(theoretical_rtp, 4)                                AS theoretical_rtp,
       ROUND(d * d * (total_bet / 20.0) / (sigma * sigma), 2)   AS z_squared,
       CASE WHEN d * d * (total_bet / 20.0) / (sigma * sigma) > 9 THEN '警示' ELSE '正常' END AS status
FROM   daily
ORDER  BY report_date;


-- [Q05] 版本比較：各版本累計 RTP 與 z² -------------------------------
WITH by_version AS (
  SELECT s.version,
         MIN(date(s.spin_time))             AS first_day,
         MAX(date(s.spin_time))             AS last_day,
         COUNT(*)                           AS spins,
         SUM(s.bet)                         AS total_bet,
         SUM(s.win)                         AS total_win,
         g.theoretical_rtp,
         g.sigma
  FROM   v_spins s
  JOIN   games g ON g.game_id = s.game_id AND g.version = s.version
  GROUP  BY s.version
)
SELECT version, first_day, last_day, spins,
       ROUND(total_win * 1.0 / total_bet, 4)                     AS actual_rtp,
       ROUND(theoretical_rtp, 4)                                 AS theoretical_rtp,
       ROUND((total_win * 1.0 / total_bet - theoretical_rtp) * (total_win * 1.0 / total_bet - theoretical_rtp)
             * (total_bet / 20.0) / (sigma * sigma), 2)          AS z_squared
FROM   by_version
ORDER  BY first_day;


-- [Q06] 找原因：免費遊戲表現依版本比較 --------------------------------
-- 觸發率正常、但每次免費遊戲平均贏分倍數明顯變高 → 問題在免費遊戲本身（倍數或賠率）
SELECT version,
       SUM(fg_triggered)                                         AS triggers,
       ROUND(COUNT(*) * 1.0 / NULLIF(SUM(fg_triggered), 0), 1)   AS one_in_n,
       ROUND(AVG(CASE WHEN fg_triggered = 1 THEN fg_spins END), 2)        AS avg_fg_spins,
       ROUND(AVG(CASE WHEN fg_triggered = 1 THEN fg_win * 1.0 / bet END), 2) AS avg_fg_win_x_bet,
       ROUND(SUM(fg_win) * 1.0 / SUM(bet), 4)                    AS fg_rtp,
       ROUND(SUM(base_win) * 1.0 / SUM(bet), 4)                  AS base_rtp
FROM   v_spins
GROUP  BY version
ORDER  BY MIN(spin_time);


-- [Q07] 驗收：PAR 表規格 vs 各版本實際設定，列出不一致的參數 ------------
SELECT b.version, b.param, p.description,
       p.value AS par_value,
       b.value AS build_value
FROM   config_build b
JOIN   config_par  p ON p.param = b.param
WHERE  b.value <> p.value
ORDER  BY b.version, b.param;


-- [Q08] 風控：單局大獎（贏分 >= 100 倍押注） --------------------------
SELECT spin_time, player_id, version, bet, win,
       ROUND(win * 1.0 / bet, 1) AS multiple,
       fg_spins
FROM   v_spins
WHERE  win >= bet * 100
ORDER  BY multiple DESC
LIMIT  20;


-- [Q09] 每日贏分最高的前 3 名玩家（視窗函數） ------------------------
SELECT report_date, player_id, total_bet, total_win, net_win, rn AS rank
FROM (
  SELECT date(spin_time)                AS report_date,
         player_id,
         SUM(bet)                       AS total_bet,
         SUM(win)                       AS total_win,
         SUM(win) - SUM(bet)            AS net_win,
         ROW_NUMBER() OVER (PARTITION BY date(spin_time)
                            ORDER BY SUM(win) - SUM(bet) DESC) AS rn
  FROM   v_spins
  GROUP  BY date(spin_time), player_id
) t
WHERE  rn <= 3
ORDER  BY report_date, rn;


-- [Q10] 週報：每週營運摘要 ------------------------------------------
-- strftime('%W') 以週一為一週開始；週別欄位方便直接貼進週報
SELECT strftime('%Y-W%W', spin_time)         AS week,
       MIN(date(spin_time))                  AS week_start,
       COUNT(*)                              AS spins,
       COUNT(DISTINCT player_id)             AS players,
       SUM(bet)                              AS total_bet,
       SUM(win)                              AS total_win,
       SUM(bet) - SUM(win)                   AS house_net,
       ROUND(SUM(win) * 1.0 / SUM(bet), 4)   AS actual_rtp,
       ROUND(SUM(bet) * 1.0 / COUNT(DISTINCT player_id), 1) AS bet_per_player
FROM   v_spins
GROUP  BY strftime('%Y-W%W', spin_time)
ORDER  BY week;


-- [Q11] 七日回訪率：依註冊週別（LEFT JOIN 保留沒回來的玩家） ------------
-- 只計算 9/1–9/23 註冊的玩家，確保每個人都有完整的 7 天觀察期
SELECT strftime('%Y-W%W', p.register_date)      AS register_week,
       COUNT(DISTINCT p.player_id)              AS new_players,
       COUNT(DISTINCT CASE WHEN date(s.spin_time) BETWEEN date(p.register_date, '+1 day')
                                                     AND date(p.register_date, '+7 day')
                           THEN p.player_id END) AS returned_d1_d7,
       ROUND(COUNT(DISTINCT CASE WHEN date(s.spin_time) BETWEEN date(p.register_date, '+1 day')
                                                           AND date(p.register_date, '+7 day')
                                 THEN p.player_id END) * 1.0
             / COUNT(DISTINCT p.player_id), 3)  AS d7_return_rate
FROM   players p
LEFT   JOIN v_spins s ON s.player_id = p.player_id
WHERE  p.register_date BETWEEN '2026-09-01' AND '2026-09-23'
GROUP  BY strftime('%Y-W%W', p.register_date)
ORDER  BY register_week;


-- [Q12] 玩家分群：依 VIP 等級的投注與輸贏 ----------------------------
SELECT p.vip_level,
       COUNT(DISTINCT s.player_id)                 AS players,
       SUM(s.bet)                                  AS total_bet,
       ROUND(SUM(s.bet) * 1.0 / COUNT(DISTINCT s.player_id), 0) AS bet_per_player,
       ROUND(SUM(s.win) * 1.0 / SUM(s.bet), 4)     AS actual_rtp
FROM   v_spins s
JOIN   players p ON p.player_id = s.player_id
GROUP  BY p.vip_level
ORDER  BY p.vip_level;
