# Chaincode `academic-traceability`

Contrato inteligente independiente (TypeScript + `fabric-contract-api` 2.5.8) que registra los **eventos de
trazabilidad** definidos en el Hito 2 (H2-03). No se ejecuta dentro de Next.js: se despliega en Hyperledger Fabric
como servicio externo (Chaincode-as-a-Service).

## Modelo On-chain (payload de H2-03)

```text
AcademicEvent {
  docType: "academicEvent"
  eventId            UUID v4 generado por el middleware (clave del estado; = evento_trazabilidad.evento_id)
  objectType         RESULTADO | ACTIVIDAD | ASISTENCIA
  objectRef          referencia técnica (REG-0001)
  eventType          CREACION | RECTIFICACION | VERIFICACION | REVOCACION
  version            versión del dato
  commitment         HMAC-SHA-256 del payload canónico (64 hex)
  previousCommitment compromiso de la versión anterior (null en CREACION)
  algorithm          HMAC-SHA-256
  actorRole          rol técnico del actor (ADMIN, DOCENTE, AUDITOR)
  submitterMspId     MSP del cliente que firmó (del certificado)
  timestamp          hora de la propuesta (determinista)
  status             REGISTRADO
  txId               transacción de Fabric
}
```

**No se almacena:** identidad del actor, tokens de estudiante o docente, notas, actividades ni texto libre. El
contrato valida con expresiones regulares cada campo y rechaza cualquier otro valor.

## Reglas

- Un `eventId` solo puede registrarse una vez (reintentos idempotentes).
- **CREACION**: versión 1, sin compromiso anterior.
- **RECTIFICACION / REVOCACION**: versión n > 1; debe existir la versión n-1 y `previousCommitment` debe ser
  exactamente su compromiso → las versiones forman una cadena verificable.
- **VERIFICACION**: no ocupa versión; exige que el objeto tenga al menos la versión 1.
- Índices compuestos: `object~ref~version` (versiones de datos) y `object~ref~event` (todos los eventos).

## Funciones

| Función | Tipo | Descripción |
|---|---|---|
| `academicEvidenceExists(eventId)` | consulta | `true` / `false` |
| `createAcademicEvidence(eventId, objectType, objectRef, eventType, version, commitment, previousCommitment, actorRole)` | transacción | Registra el evento aplicando las reglas anteriores |
| `readAcademicEvidence(eventId)` | consulta | JSON del evento |
| `getAcademicEvidenceHistory(objectType, objectRef)` | consulta | Todos los eventos del objeto, en orden cronológico |
| `getAcademicEvidenceKeyHistory(eventId)` | consulta | Historial de escrituras de la clave (debe ser una) |

La transacción emite el evento `AcademicEventRegistered`.

## Desarrollo y despliegue

```bash
npm install && npm run build && npm test     # 9 pruebas con un stub en memoria del ledger
../../fabric-network/scripts/deployChaincode.sh
```
