"""執行 queries.sql 中的每一段查詢並印出結果。

用法：
    python run_queries.py          執行全部
    python run_queries.py Q04 Q06  只執行指定的查詢
"""
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load_queries():
    text = open(os.path.join(HERE, "queries.sql"), encoding="utf-8").read()
    parts = re.split(r"^-- \[(Q\d+)\] (.*?)-*$", text, flags=re.M)
    out = []
    for i in range(1, len(parts), 3):
        qid, title, body = parts[i], parts[i + 1].strip(), parts[i + 2]
        sql = "\n".join(l for l in body.splitlines() if not l.strip().startswith("--")).strip()
        out.append((qid, title, sql))
    return out


def show(cur, qid, title, sql, limit=40):
    cur.execute(sql)
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    print(f"\n=== {qid} {title}（{len(rows)} 列）")
    cells = [cols] + [["" if v is None else str(v) for v in r] for r in rows[:limit]]
    width = [max(len(r[c]) for r in cells) for c in range(len(cols))]
    for j, r in enumerate(cells):
        print("  ".join(v.ljust(width[c]) for c, v in enumerate(r)))
        if j == 0:
            print("  ".join("-" * w for w in width))
    if len(rows) > limit:
        print(f"... 另有 {len(rows) - limit} 列")


if __name__ == "__main__":
    want = set(a.upper() for a in sys.argv[1:])
    con = sqlite3.connect(os.path.join(HERE, "jinli.db"))
    for qid, title, sql in load_queries():
        if not want or qid in want:
            show(con.cursor(), qid, title, sql)
