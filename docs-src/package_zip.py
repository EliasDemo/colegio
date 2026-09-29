"""Crea ../Hito3_Entregables_Grupo7.zip sin dependencias, secretos ni material criptográfico generado.

Uso (desde Hito3_Grupo7/):  python docs-src/package_zip.py
"""
import fnmatch
import sys
import os
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parent / "Hito3_Entregables_Grupo7.zip"

SKIP_DIRS = {"node_modules", ".next", ".git", ".tamper", "dist", "out"}
SKIP_PATHS = ("fabric-network/organizations/peerOrganizations", "fabric-network/organizations/ordererOrganizations")
SKIP_FILES = (".env", "*.tsbuildinfo", "*_sk", "chaincode.env", "*.block", "*.tar.gz", "~$*")

count = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as archive:
    for current, dirs, files in os.walk(ROOT):
        rel_dir = Path(current).relative_to(ROOT).as_posix()
        dirs[:] = [
            d for d in dirs
            if d not in SKIP_DIRS and not f"{rel_dir}/{d}".lstrip("./").startswith(SKIP_PATHS)
        ]
        for name in files:
            if any(fnmatch.fnmatch(name, pattern) for pattern in SKIP_FILES):
                continue
            if rel_dir.startswith("database/backups") and name.endswith(".sql"):
                continue
            full = Path(current) / name
            archive.write(full, "Hito3_Grupo7/" + full.relative_to(ROOT).as_posix())
            count += 1

print(f"{count} archivos · {OUT.stat().st_size / 1024 / 1024:.2f} MB → {OUT}")

with zipfile.ZipFile(OUT) as archive:
    names = archive.namelist()
    leaked = [n for n in names if n.endswith("/.env") or n.endswith("_sk") or "peerOrganizations" in n or "node_modules" in n]
    print("Secretos o material generado en el ZIP:", leaked or "ninguno")
    required = [
        "README.md", "H3_07_Matriz_Cumplimiento_Hito3.pdf", "app-next/.env.example", "app-next/package.json",
        "database/schema.sql", "database/seed.sql", "database/views.sql",
        "diagramas/H3_02_Diagrama_Red_Fabric.png", "diagramas/H3_05_Secuencia_Integracion.png",
        "diagramas/H3_Arquitectura_Implementada.png",
        "chaincode/academic-traceability/src/academicTraceabilityContract.ts", "fabric-network/scripts/network.sh",
    ]
    for item in required:
        print(("OK    " if f"Hito3_Grupo7/{item}" in names else "FALTA ") + item)
    pdfs = [n for n in names if n.startswith("Hito3_Grupo7/informes/") and n.endswith(".pdf")]
    logs = [n for n in names if n.startswith("Hito3_Grupo7/evidencias/")]
    print(f"Informes PDF: {len(pdfs)} · evidencias: {len(logs)}")
