"""金鯉躍門數學引擎（Python 版，與 assets/slot-engine.js 相同的規則與預設配置）。

用 numpy 向量化同時處理大量轉動，供資料生成與數學驗收使用。
"""
import itertools
import numpy as np

SYMBOLS = ["鯉", "門", "寶", "意", "燈", "錢", "A", "K", "Q", "J"]  # 0 = 百搭, 1 = 分散
W, S = 0, 1
NL = 20      # 連線數
BET_LINES = NL

LINES = np.array([
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
    [1, 2, 1, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
    [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0],
])

DEFAULT = {
    "cnt": [[0, 2, 3, 3, 2], [1, 2, 2, 2, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4], [5, 5, 5, 5, 5], [5, 5, 5, 5, 5], [6, 6, 6, 6, 6], [6, 6, 6, 6, 6]],
    # pay[symbol][k]，k = 連線數 0..5（3 連以下為 0）
    "pay": [[0, 0, 0, 60, 250, 1250], [0] * 6, [0, 0, 0, 50, 200, 1000], [0, 0, 0, 30, 125, 500],
            [0, 0, 0, 20, 75, 300], [0, 0, 0, 15, 60, 250], [0, 0, 0, 10, 30, 125],
            [0, 0, 0, 10, 25, 100], [0, 0, 0, 8, 20, 75], [0, 0, 0, 6, 20, 60]],
    "sc": [0, 0, 0, 2, 10, 50],   # 分散符號賠付（× 總押注）
    "fs": 10,                      # 每次觸發的免費場次
    "mult": 2,                     # 免費遊戲倍數
}


def with_changes(cfg, **kw):
    c = {k: (v.copy() if isinstance(v, list) else v) for k, v in cfg.items()}
    c.update(kw)
    return c


def lengths(cfg):
    return [sum(row[r] for row in cfg["cnt"]) for r in range(5)]


def eval_line_scalar(b, pay):
    kw = 0
    while kw < 5 and b[kw] == W:
        kw += 1
    pw = pay[W][kw] if kw >= 3 else 0
    if kw == 5:
        return pw
    s = b[kw]
    if s == S:
        return pw
    k = kw
    while k < 5 and (b[k] == s or b[k] == W):
        k += 1
    ps = pay[s][k] if k >= 3 else 0
    return max(ps, pw)


def analytic(cfg):
    """精確 RTP：單線全組合窮舉 + 分散符號卜瓦松二項 + 免費遊戲重觸發封閉解。"""
    L = lengths(cfg)
    nz = [[(i, cfg["cnt"][i][r] / L[r]) for i in range(10) if cfg["cnt"][i][r] > 0] for r in range(5)]
    ev = 0.0
    for combo in itertools.product(*nz):
        p = 1.0
        for _, q in combo:
            p *= q
        x = eval_line_scalar([c[0] for c in combo], cfg["pay"])
        if x:
            ev += p * x
    dist = [1.0, 0, 0, 0, 0, 0]
    for r in range(5):
        q = 3 * cfg["cnt"][S][r] / L[r]
        nd = [0.0] * 6
        for i in range(6):
            nd[i] += dist[i] * (1 - q)
            if i < 5:
                nd[i + 1] += dist[i] * q
        dist = nd
    sc_ev = sum(dist[n] * cfg["sc"][n] for n in range(3, 6))
    pt = sum(dist[3:])
    r0 = ev + sc_ev
    e_fg = cfg["fs"] / (1 - cfg["fs"] * pt)
    fg = pt * e_fg * r0 * cfg["mult"]
    return {"line": ev, "scatter": sc_ev, "pt": pt, "e_fg": e_fg, "fg": fg, "total": r0 + fg}


def build_strips(cfg, seed=20261007):
    rng = np.random.default_rng(seed)
    strips = []
    for r, n in enumerate(lengths(cfg)):
        arr = np.full(n, -1)
        n_s = cfg["cnt"][S][r]
        for i in range(n_s):
            arr[i * n // n_s] = S
        rest = [i for i in range(10) if i != S for _ in range(cfg["cnt"][i][r])]
        rng.shuffle(rest)
        arr[arr == -1] = rest
        strips.append(arr)
    return strips


class Machine:
    def __init__(self, cfg, seed=20261007):
        self.cfg = cfg
        self.strips = build_strips(cfg, seed)
        self.pay = np.array(cfg["pay"])
        self.sc = np.array(cfg["sc"])

    def _lines_pay(self, win_sym):
        """win_sym: (N, 5, 3) 視窗符號 → (N,) 連線總贏分（每線押 1）。"""
        n = win_sym.shape[0]
        total = np.zeros(n, dtype=np.int64)
        idx = np.arange(n)
        for line in LINES:
            b = win_sym[:, np.arange(5), line]                      # (N, 5)
            is_w = b == W
            kw = np.cumprod(is_w, axis=1).sum(axis=1)               # 開頭百搭數
            pw = self.pay[W][kw]
            s = b[idx, np.minimum(kw, 4)]
            match = (b == s[:, None]) | is_w
            k = np.cumprod(match, axis=1).sum(axis=1)
            ps = np.where(kw == 5, 0, self.pay[s, k])
            total += np.maximum(ps, pw)
        return total

    def spin(self, rng, n):
        """n 次轉動 → (連線 + 分散贏分, 分散符號數)。"""
        win_sym = np.empty((n, 5, 3), dtype=np.int64)
        for r, strip in enumerate(self.strips):
            st = rng.integers(0, len(strip), n)
            for row in range(3):
                win_sym[:, r, row] = strip[(st + row) % len(strip)]
        n_sc = (win_sym == S).any(axis=2).sum(axis=1)
        return self._lines_pay(win_sym) + self.sc[n_sc] * BET_LINES, n_sc

    def play(self, rng, n):
        """n 次付費遊戲（含免費遊戲與重觸發）。贏分單位：點數，每線 1 點、總押注 20 點。"""
        base, n_sc = self.spin(rng, n)
        trig = n_sc >= 3
        fg_win = np.zeros(n, dtype=np.int64)
        fg_spins = np.zeros(n, dtype=np.int64)
        left = np.where(trig, self.cfg["fs"], 0)
        while left.any():
            act = np.nonzero(left)[0]
            w, k = self.spin(rng, len(act))
            fg_win[act] += w * self.cfg["mult"]
            fg_spins[act] += 1
            left[act] -= 1
            left[act[k >= 3]] += self.cfg["fs"]
        return {"base_win": base, "fg_triggered": trig.astype(int), "fg_spins": fg_spins,
                "fg_win": fg_win, "win": base + fg_win}


if __name__ == "__main__":
    a = analytic(DEFAULT)
    print({k: round(v, 6) for k, v in a.items()})
    rng = np.random.default_rng(1)
    r = Machine(DEFAULT).play(rng, 300_000)
    m = r["win"] / BET_LINES
    print("sim RTP", m.mean(), "sigma", m.std(), "trigger 1/", 1 / r["fg_triggered"].mean())
