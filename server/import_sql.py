#!/usr/bin/env python3
import json, sqlite3, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('Usage: import_sql.py BACKUP.sql workout.json')
sql_path, out_path = map(Path, sys.argv[1:])
con = sqlite3.connect(':memory:')
con.executescript(sql_path.read_text(encoding='utf-8'))
con.row_factory = sqlite3.Row
out = {'users': [], 'data': []}
for row in con.execute('SELECT id,email,password_hash,created_at FROM users ORDER BY id'):
    out['users'].append(dict(row))
for row in con.execute('SELECT user_id,payload,updated_at FROM data ORDER BY user_id'):
    out['data'].append(dict(row))
out_path.parent.mkdir(parents=True, exist_ok=True)
tmp = out_path.with_suffix(out_path.suffix + '.tmp')
tmp.write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
tmp.replace(out_path)
print(f'imported users={len(out["users"])} data={len(out["data"])} to {out_path}')
