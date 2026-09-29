# Chaincode `academic-traceability`

Contrato inteligente independiente (TypeScript + `fabric-contract-api` 2.5.8) que almacena la **evidencia mínima**
de cada versión de un registro académico. No se ejecuta dentro de Next.js: se despliega en Hyperledger Fabric
como servicio externo (Chaincode-as-a-Service).

## Modelo On-chain

```text
AcademicEvidence {
  docType: "academicEvidence"
  evidenceId       EVD-REG-000001-V1        (clave del estado)
  recordReference  REG-000001
  eventType        REGISTRO | RECTIFICACION
  version          1, 2, ...
  evidence         HMAC-SHA-256 hexadecimal (64)
  algorithm        HMAC-SHA-256
  actorReference   ADM-PSE-001 / DOC-PSE-003 ...
  actorRole        ADMINISTRADOR / DOCENTE ...
  submitterMspId   MSP del cliente que firmó (tomado del certificado)
  timestamp        hora de la propuesta de transacción (determinista)
  status           REGISTRADO
  txId             identificador de la transacción
}
```

Índice compuesto `record~version` → permite recorrer todas las versiones de un registro.

**No se almacena:** nombres, DNI, dirección, teléfono, notas, documentos ni datos familiares. El contrato valida
con expresiones regulares que cada campo sea una referencia seudónima o un HMAC, y rechaza cualquier otro valor.

## Funciones

| Función | Tipo | Descripción |
|---|---|---|
| `academicEvidenceExists(evidenceId)` | consulta | `true` / `false` |
| `createAcademicEvidence(evidenceId, recordReference, eventType, version, evidence, actorReference, actorRole)` | transacción | Inmutable: falla si ya existe; la versión *n* exige la *n-1* |
| `readAcademicEvidence(evidenceId)` | consulta | JSON de la evidencia |
| `getAcademicEvidenceHistory(recordReference)` | consulta | Todas las versiones del registro |
| `getAcademicEvidenceKeyHistory(evidenceId)` | consulta | Historial de escrituras de la clave (debe ser una) |

La transacción emite el evento `AcademicEvidenceCreated`.

## Desarrollo

```bash
npm install
npm run build
npm test          # 8 pruebas con un stub en memoria del ledger
```

## Despliegue

`fabric-network/scripts/deployChaincode.sh` construye la imagen `academic-traceability-ccaas:1.0` con el `Dockerfile`
de esta carpeta, crea el paquete `ccaas` (dirección `academic-traceability-cc:9999`), lo instala en ambos peers,
lo aprueba por ambas organizaciones y confirma la definición en `academicchannel`.
