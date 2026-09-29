# app-next — Capa de aplicación (Next.js + TypeScript)

Aplicación Next.js 15 (App Router) que integra el almacenamiento Off-chain (MySQL 8 vía Prisma) con
Hyperledger Fabric (vía `@hyperledger/fabric-gateway`). En el Hito 3 no incluye interfaz completa: expone la
página `/`, el endpoint `/api/health` y scripts de línea de comandos que ejecutan el flujo de trazabilidad.

## Arquitectura interna

```text
scripts/ (CLI)   app/api/health (Route Handler)
        \              /
      services/  ── traceability.service.ts  (orquesta el flujo y la recuperación de fallos)
         |       └─ academicRecord.service.ts (proyección a referencias seudónimas)
         |
   ┌─────┴───────────────┬───────────────────────┐
repositories/        lib/crypto/              lib/fabric/  (server-only)
 (Prisma → MySQL)    canonicalize.ts          config · connection · gateway
                     generateEvidence.ts      submitTransaction · evaluateTransaction
                     verifyEvidence.ts        academicLedger · errors
```

- Todo lo que toca Prisma o Fabric importa `server-only`: no puede llegar a un Client Component.
- `next.config.ts` declara `@hyperledger/fabric-gateway`, `@grpc/grpc-js` y `@prisma/client` como paquetes externos del servidor.
- Los servicios reciben sus dependencias (`createTraceabilityService(deps)`), lo que permite probarlos con un ledger en memoria.

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `mysql://root:<password>@localhost:3306/trazabilidad_academica` |
| `HMAC_SECRET` | Clave HMAC (≥ 32 caracteres). La misma para todo el equipo |
| `FABRIC_CHANNEL_NAME` / `FABRIC_CHAINCODE_NAME` | `academicchannel` / `academic-traceability` |
| `FABRIC_MSP_ID` | `NuevoHorizonteMSP` |
| `FABRIC_PEER_ENDPOINT` / `FABRIC_PEER_HOST_ALIAS` | `localhost:7051` / `peer0.nuevohorizonte.example.com` |
| `FABRIC_TLS_CERT_PATH` | CA TLS del peer |
| `FABRIC_CERT_PATH` / `FABRIC_PRIVATE_KEY_PATH` | Certificado y clave de `User1@nuevohorizonte` (se aceptan directorios `signcerts/` y `keystore/`) |
| `ACTOR_REFERENCE` / `ACTOR_ROLE` | Actor seudónimo que firma las operaciones de los scripts |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` |

## Uso

```bash
npm install
npx prisma generate && npx prisma migrate deploy && npm run seed
npm run check
npm run record -- REG-000001
npm run verify -- REG-000001
npm run trace  -- REG-000001
npm run dev            # http://localhost:3000/api/health
npm test               # unitarias (no requieren infraestructura)
npm run test:integration   # MySQL + Fabric reales
```

Los scripts se ejecutan con `tsx --conditions=react-server` para que el paquete `server-only` se resuelva igual que en el servidor de Next.js.

## Evidencia criptográfica

`canonicalizeAcademicRecord()` produce un JSON compacto con **orden de campos fijo**:

```text
canonicalVersion, academicRecordId, studentReference, enrollmentReference, sectionReference,
subjectReference, activityReference, periodReference, teacherReference, qualitativeGrade,
numericScore, observation, recordedAt, version
```

Reglas: UTF-8 y Unicode NFC · espacios recortados y colapsados · códigos en mayúsculas · `numericScore` con 2 decimales
como texto · fechas ISO 8601 UTC con milisegundos · `null` explícito. `generateEvidence()` calcula
`HMAC-SHA-256(HMAC_SECRET, canónico)` en hexadecimal; `verifyEvidence()` compara en tiempo constante.

## Manejo de fallos (resumen)

| Caso | Comportamiento |
|---|---|
| Fabric / peer / orderer no responde | Vínculo `FALLIDO` + evento `FALLIDO` en MySQL; se puede reintentar |
| Fabric confirma pero falla MySQL | `EvidenceLinkError` con el TX_ID; el reintento detecta la evidencia en el ledger y **reconcilia** sin duplicar |
| Registro inexistente | `RecordNotFoundError`, no se contacta a Fabric |
| Evidencia no coincide | `verify` → `ALTERADO` (código de salida 3); `record` → `EvidenceConflictError` |
| Certificado inválido · canal incorrecto · chaincode no desplegado · endosos insuficientes | `FabricError` con código `IDENTITY_INVALID`, `CHANNEL_NOT_FOUND`, `CHAINCODE_NOT_DEPLOYED`, `ENDORSEMENT_FAILED` |

## Pruebas

```text
tests/crypto/        canonicalización, HMAC, verificación
tests/database/      validaciones Zod, AcademicRecordRepository
tests/fabric/        clasificación de errores reales de Fabric
tests/integration/   TraceabilityService (ledger en memoria) y E2E real (RUN_INTEGRATION=1)
```
