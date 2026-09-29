# app-next — Capa de aplicación (Next.js + TypeScript)

Aplicación Next.js 15 (App Router) que implementa el middleware diseñado en el Hito 2 (H2-05): integra el
almacenamiento Off-chain (MySQL 8, modelo H2_04, vía Prisma) con Hyperledger Fabric (vía `@hyperledger/fabric-gateway`).
En el Hito 3 expone la página `/`, el endpoint `/api/health` y scripts de línea de comandos para el flujo de trazabilidad.

## Correspondencia con la arquitectura del Hito 2

| Componente H2-05 | Implementación |
|---|---|
| Servicio de trazabilidad (UUID + versionado + orquestación) | `src/services/traceability.service.ts` |
| Servicio criptográfico (canonicaliza, HMAC-SHA-256) | `src/lib/crypto/` |
| MySQL Off-chain | `prisma/schema.prisma` (19 tablas de H2_04) + `src/repositories/` |
| Fabric Gateway SDK | `src/lib/fabric/` (solo servidor, `import 'server-only'`) |
| Autenticación + RBAC | Estructura `usuario` / `rol` / `usuario_rol`; el actor de los scripts sale de `ACTOR_USERNAME` (autenticación: Hito 5) |
| API REST | Pendiente para el Hito 4 (hoy: `/api/health` y scripts) |

```text
scripts/ (CLI)   app/api/health
        \              /
   services/traceability.service.ts ── academicRecord.service.ts
         |
   ┌─────┴───────────────┬────────────────────┐
repositories/          lib/crypto/          lib/fabric/ (server-only)
 academicRecord         canonicalize         config · connection · gateway
 traceabilityEvent      generateEvidence     submit/evaluateTransaction
 blockchainEvidence     verifyEvidence       academicLedger · errors
 usuario
```

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `mysql://root:<password>@localhost:3306/nuevo_horizonte_trazabilidad` |
| `HMAC_SECRET` | Clave HMAC (≥ 32 caracteres). La misma para todo el equipo |
| `FABRIC_*` | Canal, chaincode, MSP, endpoint del peer y rutas de TLS, certificado y clave de `User1@nuevohorizonte` |
| `ACTOR_USERNAME` | Usuario del prototipo con el que actúan los scripts (por defecto `admin.prototipo`) |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` |

## Flujo implementado (H2-06)

1. **Registro:** carga el resultado con sus relaciones → payload canónico v2 → HMAC → evento `PENDIENTE` con UUID →
   `createAcademicEvidence` (CREACION si versión 1; RECTIFICACION encadenada con `previousCommitment`) →
   `evidencia_blockchain` + evento `CONFIRMADO` en una transacción MySQL.
2. **Reintentos idempotentes:** una versión CONFIRMADA no se reenvía; un evento `PENDIENTE`/`ERROR` se reintenta con el
   **mismo UUID** y, si ya está en el ledger, se reconcilia su TX_ID sin reenviar ("commit confirmado pero respuesta perdida").
3. **Verificación:** recalcula el HMAC y lo compara con la última versión On-chain; comprueba la cadena de compromisos
   y registra un evento `VERIFICACION` con `resultado_verificacion` (INTEGRO / ALTERADO / NO_VERIFICABLE).
4. **Rectificación:** `historial_resultado` (puntaje anterior/nuevo, motivo) + `version_actual + 1` + estado `RECTIFICADO`
   + evento RECTIFICACION. Si la versión vigente no estaba anclada, la ancla primero.

## Payload canónico v2

Orden fijo: `canonicalVersion, objectType, objectRef, studentToken, periodCode, gradeNumber, sectionCode, areaCode,
activityCode, activityType, activityDate, maxScore, score, status, registeredBy, registeredAt, version`.
Reglas: UTF-8/NFC, espacios colapsados, códigos en mayúsculas, puntajes con 2 decimales, fechas `YYYY-MM-DD`,
marcas de tiempo ISO 8601 UTC, `null` explícito, JSON compacto.

## Uso

```bash
npm install
npx prisma generate && npx prisma migrate deploy && npm run seed
npm run check
npm run record -- REG-0001 && npm run verify -- REG-0001 && npm run trace -- REG-0001
npm test                   # unitarias (sin infraestructura)
npm run test:integration   # MySQL + Fabric reales
```

## Manejo de fallos

| Caso | Comportamiento |
|---|---|
| Fabric / peer / orderer no responde | Evento `ERROR` con `error_detalle`; el dato académico se conserva; reintento con el mismo UUID |
| Fabric confirma pero falla MySQL | `EvidenceLinkError` con el TX_ID; el reintento consulta el ledger por `eventId` y reconcilia |
| Registro inexistente / actor inexistente | `RecordNotFoundError` / `ActorNotFoundError`, sin contactar a Fabric |
| Compromiso distinto al anclado | `verify` → ALTERADO (código 3); `record` → `EvidenceConflictError` |
| Certificado, canal, chaincode, endosos | `FabricError`: `IDENTITY_INVALID`, `CHANNEL_NOT_FOUND`, `CHAINCODE_NOT_DEPLOYED`, `ENDORSEMENT_FAILED`, `ORDERER_UNAVAILABLE` |
