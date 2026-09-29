"""Genera H3_05_Secuencia_Integracion.html (diagrama de secuencia en SVG)."""
from pathlib import Path
from html import escape

LANES = [
    ("Script CLI /\nNext.js", "#34495e"),
    ("Traceability\nService", "#1b3a5c"),
    ("Repositories\nPrisma → MySQL", "#2e8b57"),
    ("Crypto\n(canónico + HMAC)", "#b0662b"),
    ("Fabric Gateway\n(cliente SDK)", "#1f6fb2"),
    ("peer0\nnuevohorizonte", "#2e8b57"),
    ("peer0\nvalidator", "#1f6fb2"),
    ("orderer", "#d89b2b"),
    ("Chaincode /\nLedger", "#7a4fb0"),
]
W, LEFT, GAP = 1800, 110, 197
X = [LEFT + i * GAP for i in range(len(LANES))]

# (desde, hasta, texto, estilo)  estilo: call | ret | self | section
STEPS = [
    ("section", "REGISTRO (CREACION)  ·  npm run record -- REG-0001"),
    (0, 1, "1. registerAcademicRecordEvidence(REG-0001)", "call"),
    (1, 2, "2. findByCode: resultado_academico + matrícula, actividad, asignación", "call"),
    (2, 1, "3. resultado v1 (solo tokens seudónimos)", "ret"),
    (1, 3, "4. payload canónico v2 + HMAC-SHA-256", "call"),
    (3, 1, "5. compromiso (64 hex)", "ret"),
    (1, 2, "6. evento_trazabilidad PENDIENTE (UUID)", "call"),
    (1, 4, "7. academicEvidenceExists(eventId)", "call"),
    (4, 1, "8. false", "ret"),
    (1, 4, "9. createAcademicEvidence(eventId, CREACION, v1, commitment)", "call"),
    (4, 5, "10. propuesta firmada (User1@NuevoHorizonteMSP)", "call"),
    (5, 8, "11. simula y valida reglas y encadenamiento", "call"),
    (5, 6, "12. solicita endoso (descubrimiento)", "call"),
    (6, 8, "13. simula y endosa", "call"),
    (4, 7, "14. envía tx endosada por ambas organizaciones", "call"),
    (7, 5, "15. bloque", "ret"),
    (7, 6, "15. bloque", "ret"),
    (5, 4, "16. commit VALID · TX_ID · número de bloque", "ret"),
    (4, 1, "17. { txId, blockNumber }", "ret"),
    (1, 2, "18. evidencia_blockchain(TX_ID) + evento CONFIRMADO", "call"),
    (1, 0, "19. PROCESO COMPLETADO · TX_ID", "ret"),
    ("section", "VERIFICACIÓN  ·  npm run verify -- REG-0001"),
    (0, 1, "20. verifyAcademicRecord(REG-0001)", "call"),
    (1, 2, "21. findByCode (estado actual en MySQL)", "call"),
    (1, 3, "22. recalcula canónico + HMAC", "call"),
    (1, 4, "23. getAcademicEvidenceHistory(RESULTADO, REG-0001)", "call"),
    (4, 8, "24. consulta el estado del ledger (vía peer0.nuevohorizonte)", "call"),
    (4, 1, "25. eventos: última versión + cadena de compromisos", "ret"),
    (1, 1, "26. compara HMAC y previousCommitment", "self"),
    (1, 2, "27. evento VERIFICACION (UUID), anclado como en 6-18", "call"),
    (1, 0, "28. RESULTADO: INTEGRO / ALTERADO", "ret"),
]

ROW = 34
top = 190
H = top + ROW * len(STEPS) + 90
out = []
a = out.append
a(f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">')
a('<defs>'
  '<marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#1b2a3a"/></marker>'
  '<marker id="mr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10" fill="none" stroke="#5b6b7c" stroke-width="1.6"/></marker>'
  '</defs>')
a(f'<rect width="{W}" height="{H}" fill="#fff"/>')
a(f'<text x="{W/2}" y="44" text-anchor="middle" font-size="29" font-weight="700" fill="#1b3a5c">Secuencia de integración On-chain / Off-chain</text>')
a(f'<text x="{W/2}" y="74" text-anchor="middle" font-size="16" fill="#5b6b7c">Registro y verificación de un registro académico · Next.js → TraceabilityService → Prisma/MySQL → Crypto → Fabric Gateway → Peers → Chaincode → Ledger → TX_ID → MySQL</text>')

for (name, color), x in zip(LANES, X):
    a(f'<rect x="{x-88}" y="100" width="176" height="62" rx="9" fill="#fff" stroke="{color}" stroke-width="2.2"/>')
    for i, line in enumerate(name.split("\n")):
        a(f'<text x="{x}" y="{126 + i*20}" text-anchor="middle" font-size="14.5" font-weight="600" fill="{color}">{escape(line)}</text>')
    a(f'<line x1="{x}" y1="162" x2="{x}" y2="{H-40}" stroke="#b8c4d2" stroke-width="1.5" stroke-dasharray="5 5"/>')

y = top
for step in STEPS:
    if step[0] == "section":
        a(f'<rect x="20" y="{y-18}" width="{W-40}" height="28" rx="6" fill="#1b3a5c" opacity="0.92"/>')
        a(f'<text x="36" y="{y+1}" font-size="14.5" font-weight="700" fill="#fff">{escape(step[1])}</text>')
        y += ROW
        continue
    src, dst, label, style = step
    x1, x2 = X[src], X[dst]
    if style == "self":
        a(f'<path d="M{x1} {y-8} h46 v18 h-40" fill="none" stroke="#1b2a3a" stroke-width="1.6" marker-end="url(#m)"/>')
        a(f'<text x="{x1+54}" y="{y+4}" font-size="13" fill="#1b2a3a" paint-order="stroke" stroke="#fff" stroke-width="5">{escape(label)}</text>')
    else:
        dash = ' stroke-dasharray="6 4"' if style == "ret" else ""
        marker = "mr" if style == "ret" else "m"
        color = "#5b6b7c" if style == "ret" else "#1b2a3a"
        d = 1 if x2 > x1 else -1
        a(f'<line x1="{x1}" y1="{y}" x2="{x2 - d*2}" y2="{y}" stroke="{color}" stroke-width="1.6"{dash} marker-end="url(#{marker})"/>')
        tx = min(x1, x2) + 8
        a(f'<text x="{tx}" y="{y-6}" font-size="13" fill="{color}" paint-order="stroke" stroke="#fff" stroke-width="5">{escape(label)}</text>')
    y += ROW

a(f'<text x="20" y="{H-14}" font-size="13" fill="#5b6b7c">Línea continua: llamada · línea discontinua: respuesta. Si Fabric falla (pasos 9-17) el evento queda en ERROR; si falla el paso 18 queda PENDIENTE. El reintento usa el mismo UUID: si el paso 7 devuelve true, reconcilia el TX_ID sin reenviar (H2-06 §7).</text>')
a("</svg>")

html = ('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Secuencia</title>'
        '<style>html,body{margin:0;background:#fff}svg{display:block;font-family:"Segoe UI",Arial,sans-serif}</style></head><body>'
        + "\n".join(out) + "</body></html>")
Path(__file__).with_name("H3_05_Secuencia_Integracion.html").write_text(html, encoding="utf-8")
print(W, H)
