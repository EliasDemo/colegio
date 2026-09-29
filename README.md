# Prototipo de trazabilidad académica — Hitos 1, 2 y 3

> Repositorio **colegio** · proyecto 2026-2

**Proyecto:** Arquitectura híbrida basada en blockchain permisionada para la trazabilidad microcurricular de registros académicos
**Caso de estudio:** Institución Educativa Nuevo Horizonte — Juliaca, Puno, Perú
**Grupo 7:** Abdul Quispe Condori · Franck Coaquira Justo · Julmer Quispe Apaza

| Hito | Fecha | Contenido | Carpeta |
|---|---|---|---|
| 1 | 15-sep-2026 | Levantamiento y especificación de requerimientos | [`hito1/`](hito1/) |
| 2 | 22-sep-2026 | Depuración, seudonimización, matriz On/Off-chain, modelo de datos, arquitectura, flujo | [`hito2/`](hito2/) |
| 3 | 29-sep-2026 | **Blockchain y almacenamiento Off-chain operan de forma integrada** | este README |

> Estado del Hito 3: **cumplido y verificado con ejecuciones reales** sobre el dataset seudonimizado del Hito 2
> (ver `evidencias/`, `informes/` y `H3_07_Matriz_Cumplimiento_Hito3.pdf`).

---

## 1. Qué hace el prototipo

Implementa el flujo de trazabilidad diseñado en el Hito 2 (`hito2/H2_06_Flujo_Trazabilidad.pdf`):

```text
resultado_academico (MySQL) → payload canónico → HMAC-SHA-256 → evento_trazabilidad PENDIENTE (UUID)
  → Fabric Gateway → chaincode academic-traceability (endoso de 2 organizaciones) → ledger
  → TX_ID → evidencia_blockchain + evento CONFIRMADO
  → verificación: nuevo HMAC ↔ último compromiso On-chain → ÍNTEGRO / ALTERADO / NO_VERIFICABLE
```

- **Off-chain (MySQL 8, modelo del Hito 2):** 19 tablas de `H2_04_Modelo_Datos_OffChain.sql`, con 123/123 columnas
  implementadas y 3 extensiones justificadas. Solo tokens seudónimos (`STU-…`, `DOC-…`): la correspondencia con la
  identidad real **no** se guarda en el prototipo (RNF-07).
- **On-chain (Hyperledger Fabric 2.5, payload de H2-03):** `eventId` (UUID), `objectType`, `objectRef` (REG-0001),
  `eventType` (CREACION / RECTIFICACION / VERIFICACION / REVOCACION), `version`, `commitment` (HMAC),
  `previousCommitment` (encadena versiones), `actorRole`, `timestamp`, MSP y TX_ID. Ni notas ni tokens ni nombres.

```text
                   NEXT.JS (servidor)
        +-----------------+-----------------+
   Prisma ORM                         Fabric Gateway
     MySQL 8                  Hyperledger Fabric 2.5
 nuevo_horizonte_       OrdererOrg · NuevoHorizonteOrg · AcademicValidatorOrg
  trazabilidad                chaincode academic-traceability
                                  ledger (academicchannel)
```

## 2. Datos

| Conjunto | Registros | Origen |
|---|---|---|
| Dataset del Hito 2 | **77** resultados `REG-0001…REG-0080` · 20 estudiantes · 4 docentes · 4 áreas · 3.º A/B · 2026-B3 | `hito2/H2_02_Seudonimizacion_Dataset.xlsx` → `app-next/prisma/data/h2_02_dataset_seudonimizado.json` |
| Complemento de validación (sintético) | 70 resultados `REG-V001…` · 10 estudiantes `STU-VAL…` · 1 docente `DOC-VAL…` · 3.º C · 2026-B2 y B3 | `app-next/prisma/seed.ts` (para alcanzar los mínimos del Hito 3) |

Hallazgo en el dataset del Hito 2: **REG-0011** figura con área MAT, pero su evaluación (`EV-CTA-301`,
"Informe de laboratorio"), su docente y su tipo corresponden a CTA; se cargó en CTA y requiere confirmación del equipo.
Además, el tipo `TRABAJO` del dataset no estaba en el catálogo `tipo_actividad` de H2_04 y se añadió.

## 3. Estructura

```text
├── hito1/                     Hito 1: requerimientos (RF, RNF, reglas, casos de uso)
├── hito2/                     Hito 2: dataset depurado/seudonimizado, matriz, modelo SQL + ER, arquitectura, flujo
├── app-next/                  Next.js 15 + TypeScript: Prisma, Fabric Gateway, criptografía, servicios, scripts, pruebas
├── fabric-network/            Red Fabric: compose, cryptogen, configtx, scripts
├── chaincode/academic-traceability/   Chaincode TypeScript (fabric-contract-api), ejecutado como servicio (CCaaS)
├── database/                  schema.sql, seed.sql, views.sql, docker-compose de MySQL, respaldo/recuperación
├── diagramas/ · informes/ · evidencias/ · docs-src/
└── H3_07_Matriz_Cumplimiento_Hito3.pdf
```

## 4. Requisitos

| Herramienta | Versión probada | Notas |
|---|---|---|
| Docker Desktop / Engine | 29.4 (Compose 5.1) | Debe estar **en ejecución** |
| Node.js / npm | 24.14 (mínimo 20) / 11.9 | |
| Git + Bash | 2.53 | En Windows usar **Git Bash** para los `.sh` |

Imágenes: `hyperledger/fabric-peer|orderer|tools:2.5` (v2.5.16), `hyperledger/fabric-ca:1.5` (v1.5.22), `mysql:8.4`, `node:20-alpine`.
Puertos: 3000, 3306, 7050, 7053, 9443, 7051, 9444, 9051, 9445, 7054, 8054.

## 5. Instalación desde cero

Desde la raíz del repositorio, en Git Bash o una terminal Linux/macOS:

```bash
# 1-3. Variables de entorno y dependencias
cp database/.env.example database/.env          # MYSQL_ROOT_PASSWORD
cp app-next/.env.example app-next/.env          # DATABASE_URL (misma contraseña) y HMAC_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # valor para HMAC_SECRET
(cd app-next && npm install)
(cd chaincode/academic-traceability && npm install)

# 4-6. MySQL, migraciones y datos
(cd database && docker compose up -d)
cd app-next && npx prisma generate && npx prisma migrate deploy && npm run seed && cd ..

# 7-9. Red Fabric
./fabric-network/scripts/network.sh up
./fabric-network/scripts/createChannel.sh
./fabric-network/scripts/deployChaincode.sh

# 10-15. Aplicación y flujo
cd app-next
npm run check                    # MySQL, usuario actor y Fabric
npm run dev                      # http://localhost:3000/api/health
npm run record -- REG-0001       # ancla la versión vigente (CREACION)
npm run verify -- REG-0001       # RESULTADO: INTEGRO
npm run tamper -- REG-0001 && npm run verify -- REG-0001   # prueba: ALTERADO (código de salida 3)
npm run tamper -- REG-0001 --restore
npm run rectify -- REG-V001 17 ERROR_DIGITACION "Corrección autorizada por coordinación"
npm run trace -- REG-V001        # línea de tiempo Off-chain + On-chain
npm test && npm run test:integration

# 16. Apagado
cd .. && ./fabric-network/scripts/network.sh down && (cd database && docker compose stop)
```

> `HMAC_SECRET` debe ser el mismo para todo el equipo; si cambia, las evidencias ya ancladas dejan de poder
> verificarse. Compartirlo por un canal privado, nunca en el repositorio.

## 6. Comandos (`app-next/`)

| Comando | Función |
|---|---|
| `npm run check` | Configuración, MySQL, usuario actor y Fabric |
| `npm run record -- REG-xxxx` | Ancla la versión vigente (CREACION / RECTIFICACION / REVOCACION) |
| `npm run verify -- REG-xxxx` | Compara con la última versión On-chain y registra un evento VERIFICACION |
| `npm run trace -- REG-xxxx` | Línea de tiempo Off-chain y On-chain |
| `npm run rectify -- REG-xxxx <puntaje> <MOTIVO> "detalle"` | Rectificación autorizada (nueva versión encadenada) |
| `npm run tamper -- REG-xxxx [--restore]` | Solo pruebas: alteración directa en MySQL |
| `npm run demo:evidence -- REG-xxxx` | Demostración criptográfica (SHA-256 vs HMAC) |
| `npm run seed` · `npm test` · `npm run test:integration` | Datos · pruebas unitarias · integración real |

El usuario con el que actúan los scripts se define en `ACTOR_USERNAME` (por defecto `admin.prototipo`, rol ADMIN).

## 7. Informes y diagramas

Los PDF de `informes/` y los PNG de `diagramas/` se generan desde `docs-src/` e incrustan las salidas reales de `evidencias/`:

```bash
node docs-src/build.mjs                       # informes (requiere Chrome o Edge)
python docs-src/reports/build_h3_06.py        # fuente de H3_06
python docs-src/diagrams/build_sequence.py    # fuente del diagrama de secuencia
python docs-src/compare_models.py             # comparación del modelo con H2_04
python docs-src/package_zip.py                # ZIP de entrega
```

## 8. Seguridad

- No se versionan `.env`, claves privadas ni material criptográfico generado.
- El logger redacta campos sensibles; `HMAC_SECRET` nunca se imprime.
- El chaincode rechaza cualquier valor que no sea una referencia técnica, un UUID o un HMAC.
- Configuración de **desarrollo**: contraseña por defecto de las CAs, peer → chaincode sin TLS dentro de la red Docker, un solo orderer.

## 9. Pendientes para el Hito 4

API REST, revocación/supresión (el chaincode ya admite `REVOCACION`), autenticación por rol (las cuentas del seed
no pueden iniciar sesión), carga por lote (RF-09) y confirmación del hallazgo REG-0011 con el equipo del Hito 2.
