"""Compara tabla por tabla y columna por columna el SQL del Hito 2 con el esquema implementado (Hito 3)."""
import re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
root = Path(__file__).resolve().parent.parent

def tables(sql: str, quoted: bool):
    out = {}
    for name, body in re.findall(r"CREATE TABLE\s+`?(\w+)`?\s*\((.*?)\)\s*(?:ENGINE|DEFAULT)", sql, re.S):
        cols = []
        for line in body.split("\n"):
            m = re.match(r"\s*`?(\w+)`?\s+(\w+)", line)
            if m and m.group(1).upper() not in ("CONSTRAINT", "PRIMARY", "UNIQUE", "INDEX", "KEY", "FOREIGN", "REFERENCES"):
                cols.append((m.group(1), m.group(2).upper()))
        out[name] = cols
    return out

h2 = tables((root / "hito2/H2_04_Modelo_Datos_OffChain.sql").read_text(encoding="utf-8"), False)
h3 = tables((root / "database/schema.sql").read_text(encoding="utf-8"), True)
print(f"Tablas en H2_04: {len(h2)} · tablas en schema.sql (Hito 3): {len(h3)}\n")
total = same = 0
for t, cols in h2.items():
    if t not in h3:
        print(f"[FALTA] tabla {t}"); continue
    h3cols = dict(h3[t]); missing = [c for c, _ in cols if c not in h3cols]
    extra = [c for c, _ in h3[t] if c not in dict(cols)]
    total += len(cols); same += len(cols) - len(missing)
    status = "OK " if not missing else "DIF"
    print(f"[{status}] {t:24} columnas H2: {len(cols):2}  implementadas: {len(cols)-len(missing):2}" + (f"  faltan: {missing}" if missing else "") + (f"  añadidas: {extra}" if extra else ""))
extra_tables = [t for t in h3 if t not in h2]
print(f"\nColumnas del Hito 2 implementadas: {same}/{total}")
print("Tablas adicionales:", extra_tables or "ninguna")
