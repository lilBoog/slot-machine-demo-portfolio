"""產生金鯉躍門 2026 年 9 月的模擬營運資料庫 jinli.db。

情境：
- 9/01–9/20  v1.2 正常上線
- 9/21–9/24  v1.3 上線，但免費遊戲倍數誤設為 ×3（規格是 ×2），驗收時漏掉
- 9/25–9/30  v1.3.1 修正版
另外刻意放入少量資料品質問題（重複紀錄、押注為 0 的錯誤紀錄），讓資料檢查查詢有東西可抓。
固定亂數種子，重新執行會得到完全相同的資料庫。
"""
import datetime as dt
import os
import sqlite3

import numpy as np

from slot_math import BET_LINES, DEFAULT, SYMBOLS, Machine, analytic, with_changes

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "jinli.db")
rng = np.random.default_rng(20260901)

GAME_ID = "JLYM"
SPEC = DEFAULT
VERSIONS = [
    # version, 上線日, 結束日, 實際使用的配置, 說明
    ("v1.2", "2026-09-01", "2026-09-20", SPEC, "正式版"),
    ("v1.3", "2026-09-21", "2026-09-24", with_changes(SPEC, mult=3), "介面改版；免費遊戲倍數誤設為 ×3（規格 ×2）"),
    ("v1.3.1", "2026-09-25", "2026-09-30", SPEC, "修正免費遊戲倍數"),
]


def version_on(day):
    for v, a, b, cfg, _ in VERSIONS:
        if a <= day <= b:
            return v, cfg
    raise ValueError(day)


# ---------- 理論值（依規格） ----------
spec = analytic(SPEC)
sig_rng = np.random.default_rng(7)
sig_sample = Machine(SPEC).play(sig_rng, 400_000)["win"] / BET_LINES
SIGMA = float(sig_sample.std())

# ---------- 玩家 ----------
N_PLAYERS = 1500
start = dt.date(2026, 8, 1)
reg_offsets = rng.integers(0, 61, N_PLAYERS)                       # 8/1–9/30 註冊
register = [start + dt.timedelta(days=int(o)) for o in reg_offsets]
vip = rng.choice(6, N_PLAYERS, p=[0.45, 0.25, 0.14, 0.09, 0.05, 0.02])
channel = rng.choice(["自然流量", "社群廣告", "聯盟推薦"], N_PLAYERS, p=[0.5, 0.35, 0.15])
activity = rng.beta(1.3, 5.5, N_PLAYERS)                           # 每位玩家的活躍傾向

# ---------- 轉動紀錄 ----------
machines = {v: Machine(cfg) for v, _, _, cfg, _ in VERSIONS}
rows = []
spin_id = 1
session_id = 1
days = [dt.date(2026, 9, 1) + dt.timedelta(days=i) for i in range(30)]
for day in days:
    ver, _ = version_on(day.isoformat())
    m = machines[ver]
    since = np.array([(day - r).days for r in register])
    p_active = np.where(since >= 0, activity * np.exp(-np.maximum(since, 0) / 75), 0)
    active = np.nonzero(rng.random(N_PLAYERS) < p_active)[0]
    for pid in active:
        n = int(min(400, max(5, rng.geometric(1 / 40))))
        line_bet = int(rng.choice([1, 2, 5], p=[0.7, 0.25, 0.05]))
        res = m.play(rng, n)
        hour = int(rng.choice(24, p=np.array([2, 1, 1, 1, 1, 1, 2, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 7, 8, 9, 8, 6, 3]) / 100))
        t = dt.datetime.combine(day, dt.time(hour, int(rng.integers(0, 60)), int(rng.integers(0, 60))))
        gaps = rng.integers(3, 9, n).cumsum()
        for i in range(n):
            ts = min(t + dt.timedelta(seconds=int(gaps[i])), dt.datetime.combine(day, dt.time(23, 59, 59)))
            rows.append((spin_id, session_id, int(pid) + 1, GAME_ID, ver, ts.strftime("%Y-%m-%d %H:%M:%S"),
                         line_bet, BET_LINES * line_bet, int(res["base_win"][i]) * line_bet,
                         int(res["fg_triggered"][i]), int(res["fg_spins"][i]),
                         int(res["fg_win"][i]) * line_bet, int(res["win"][i]) * line_bet))
            spin_id += 1
        session_id += 1

# 資料品質問題：9/12 有 3 筆重複寫入、9/17 有 2 筆押注為 0 的錯誤紀錄
dup = [r for r in rows if r[5].startswith("2026-09-12")][:3]
rows.extend(dup)
bad_src = [r for r in rows if r[5].startswith("2026-09-17")][:2]
for i, r in enumerate(bad_src):
    rows.append((spin_id + i, r[1], r[2], r[3], r[4], r[5], r[6], 0, 0, 0, 0, 0, 0))
rows.sort(key=lambda r: (r[5], r[0]))

# ---------- 寫入資料庫 ----------
if os.path.exists(DB):
    os.remove(DB)
con = sqlite3.connect(DB)
cur = con.cursor()
cur.executescript("""
CREATE TABLE games (
  game_id TEXT, game_name TEXT, version TEXT, release_date TEXT, end_date TEXT,
  theoretical_rtp REAL, sigma REAL, trigger_rate REAL, avg_fg_spins REAL, fg_mult_spec INTEGER, note TEXT,
  PRIMARY KEY (game_id, version));
CREATE TABLE players (
  player_id INTEGER PRIMARY KEY, register_date TEXT, vip_level INTEGER, channel TEXT);
CREATE TABLE spins (
  spin_id INTEGER, session_id INTEGER, player_id INTEGER, game_id TEXT, version TEXT, spin_time TEXT,
  line_bet INTEGER, bet INTEGER, base_win INTEGER, fg_triggered INTEGER, fg_spins INTEGER,
  fg_win INTEGER, win INTEGER);
CREATE TABLE config_par (param TEXT PRIMARY KEY, value REAL, description TEXT);
CREATE TABLE config_build (version TEXT, param TEXT, value REAL, PRIMARY KEY (version, param));
CREATE INDEX idx_spins_time ON spins(spin_time);
CREATE INDEX idx_spins_player ON spins(player_id);
-- 報表一律使用這個乾淨的檢視表：去除重複紀錄與押注為 0 的錯誤紀錄
CREATE VIEW v_spins AS SELECT DISTINCT * FROM spins WHERE bet > 0;
""")
for v, a, b, cfg, note in VERSIONS:
    cur.execute("INSERT INTO games VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (GAME_ID, "金鯉躍門", v, a, b, spec["total"], SIGMA, spec["pt"], spec["e_fg"], SPEC["mult"], note))
cur.executemany("INSERT INTO players VALUES (?,?,?,?)",
                [(i + 1, register[i].isoformat(), int(vip[i]), str(channel[i])) for i in range(N_PLAYERS)])
cur.executemany("INSERT INTO spins VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)


def params(cfg):
    out = []
    for i, s in enumerate(SYMBOLS):
        for r in range(5):
            out.append((f"reel{r + 1}_{s}", cfg["cnt"][i][r], f"第 {r + 1} 軸「{s}」停點數"))
    for i, s in enumerate(SYMBOLS):
        if i == 1:
            continue
        for k in (3, 4, 5):
            out.append((f"pay_{s}_{k}", cfg["pay"][i][k], f"「{s}」{k} 連賠率（× 線注）"))
    for k in (3, 4, 5):
        out.append((f"scatter_{k}", cfg["sc"][k], f"{k} 個「門」賠付（× 總押注）"))
    out.append(("fg_spins", cfg["fs"], "每次觸發免費場次"))
    out.append(("fg_mult", cfg["mult"], "免費遊戲贏分倍數"))
    return out


cur.executemany("INSERT INTO config_par VALUES (?,?,?)", params(SPEC))
for v, _, _, cfg, _ in VERSIONS:
    cur.executemany("INSERT INTO config_build VALUES (?,?,?)", [(v, p, val) for p, val, _ in params(cfg)])
con.commit()
n = cur.execute("SELECT COUNT(*) FROM spins").fetchone()[0]
con.execute("VACUUM")
con.close()
print(f"spec RTP {spec['total']:.6f}  sigma {SIGMA:.4f}  rows {n:,}  size {os.path.getsize(DB)/1e6:.1f} MB")
