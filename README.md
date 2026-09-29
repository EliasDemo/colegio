# Hito 3 — Blockchain y almacenamiento Off-chain integrados

> Repositorio **colegio** · proyecto 2026-2

**Proyecto:** Arquitectura híbrida basada en blockchain permisionada para la trazabilidad microcurricular de registros académicos
**Caso de estudio:** Institución Educativa Nuevo Horizonte — Juliaca, Puno, Perú
**Grupo 7:** Abdul · Franck · Julmer
**Fecha del hito:** martes 29 de septiembre de 2026 (actividades 13 a 18 del cronograma)

> Criterio de cumplimiento del hito: **"Blockchain y almacenamiento Off-chain operan de forma integrada"**.
> Estado: **cumplido y verificado con ejecuciones reales** (ver `evidencias/` e `informes/`).

---

## 1. Qué hace este prototipo

```text
REGISTRO ACADÉMICO → MySQL (Off-chain) → lectura → normalización canónica → HMAC-SHA-256
  → Fabric Gateway → peer → chaincode academic-traceability → ledger → TX_ID → MySQL
  → consulta posterior → nuevo HMAC → comparación con la blockchain → ÍNTEGRO / ALTERADO
```

- **Off-chain (MySQL 8):** estudiantes, matrículas, áreas, docentes, actividades, resultados, historial, asistencia.
  Los datos personales están separados en `student_identity` y nunca salen de MySQL.
- **On-chain (Hyperledger Fabric 2.5):** solo la evidencia mínima: HMAC del registro, referencia técnica
  (`REG-000001`), tipo de evento, versión, actor seudónimo (`ADM-PSE-001`), rol, timestamp, estado y TX_ID.

```text
                   NEXT.JS (servidor)
                          |
        +-----------------+-----------------+
        |                                   |
   Prisma ORM                         Fabric Gateway
        |                                   |
     MySQL 8                      Hyperledger Fabric 2.5
    OFF-CHAIN              OrdererOrg · NuevoHorizonteOrg · AcademicValidatorOrg
                                            |
                             chaincode academic-traceability
                                            |
                                  ledger (academicchannel)
```

## 2. Estructura

```text
Hito3_Grupo7/
├── app-next/                  Next.js 15 + TypeScript (App Router), Prisma, Fabric Gateway, scripts y pruebas
├── fabric-network/            Red Fabric: compose, cryptogen, configtx y scripts (up/canal/deploy/limpieza)
├── chaincode/academic-traceability/   Chaincode TypeScript (fabric-contract-api), ejecutado como servicio (CCaaS)
├── database/                  schema.sql, seed.sql, views.sql, docker-compose de MySQL, respaldo/recuperación
├── diagramas/                 H3_02_Diagrama_Red_Fabric.png, H3_05_Secuencia_Integracion.png, H3_Arquitectura_Implementada.png
├── informes/                  H3_01 … H3_06 (PDF)
├── evidencias/                Salidas reales de terminal de cada prueba (logs)
├── docs-src/                  Fuentes HTML y generador de los PDF/PNG
├── H3_07_Matriz_Cumplimiento_Hito3.pdf
└── README.md
```

## 3. Requisitos

| Herramienta | Versión probada | Notas |
|---|---|---|
| Docker Desktop / Docker Engine | 29.4 (Compose 5.1) | Debe estar **en ejecución** |
| Node.js | 24.14 (mínimo 20) | Para Next.js, Prisma y scripts |
| npm | 11.9 | |
| Git + Bash | Git 2.53 | En Windows usar **Git Bash** para los scripts `.sh` |
| Espacio en disco | ~4 GB | Imágenes de Fabric, MySQL y Node |

Imágenes usadas: `hyperledger/fabric-peer:2.5` (v2.5.16), `fabric-orderer:2.5`, `fabric-tools:2.5`,
`fabric-ca:1.5` (v1.5.22), `mysql:8.4` (8.4.11), `node:20-alpine`.

Puertos: 3000 (Next.js), 3306 (MySQL), 7050/7053/9443 (orderer), 7051/9444 (peer NH), 9051/9445 (peer validador), 7054/8054 (CAs).

## 4. Instalación desde cero (paso a paso)

Todos los comandos se ejecutan desde la carpeta `Hito3_Grupo7/` en **Git Bash** (Windows) o una terminal (Linux/macOS).

### Paso 1-3. Clonar, variables de entorno y dependencias

```bash
# 1. Clonar el repositorio y entrar
git clone <url-del-repositorio> Hito3_Grupo7 && cd Hito3_Grupo7

# 2. Variables de entorno
cp database/.env.example database/.env          # definir MYSQL_ROOT_PASSWORD
cp app-next/.env.example app-next/.env          # definir DATABASE_URL (misma contraseña) y HMAC_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # valor para HMAC_SECRET

# 3. Dependencias
(cd app-next && npm install)
(cd chaincode/academic-traceability && npm install)
```

> `HMAC_SECRET` es la clave de la evidencia: todo el grupo debe usar **la misma** para verificar evidencias
> ya ancladas. Compartirla por un canal privado, nunca en el repositorio.

### Paso 4-6. MySQL, migraciones y seed

```bash
# 4. Iniciar MySQL 8
(cd database && docker compose up -d)

# 5. Migraciones Prisma (crea las 18 tablas)
cd app-next
npx prisma generate
npx prisma migrate deploy        # en desarrollo también: npx prisma migrate dev

# 6. Datos de validación (24 estudiantes, 120 resultados)
npm run seed
cd ..
```

Alternativa sin Prisma: `schema.sql` → `seed.sql` → `views.sql` (ver `database/README.md`).

### Paso 7-9. Red Hyperledger Fabric

```bash
./fabric-network/scripts/network.sh up            # 7. identidades (cryptogen) + orderer, 2 peers, 2 CAs, cli
./fabric-network/scripts/createChannel.sh          # 8. canal academicchannel + unión de ambos peers
./fabric-network/scripts/deployChaincode.sh        # 9. chaincode academic-traceability (install/approve/commit)
```

### Paso 10-11. Comprobación y Next.js

```bash
cd app-next
npm run check        # 10. HMAC_SECRET, MySQL, registros, Fabric Gateway → chaincode
npm run dev          # 11. http://localhost:3000  y  http://localhost:3000/api/health
```

### Paso 12-15. Flujo de trazabilidad

```bash
npm run record -- REG-000001     # 12. MySQL → HMAC → Fabric → TX_ID → MySQL
npm run verify -- REG-000001     # 13. RESULTADO: INTEGRO
npm run tamper -- REG-000001     # 14. (prueba) modifica la nota directamente en MySQL
npm run verify -- REG-000001     #     RESULTADO: ALTERADO
npm run tamper -- REG-000001 --restore
npm run rectify -- REG-000002 A 16.00 "Corrección autorizada"   # nueva versión On-chain
npm run trace -- REG-000002      # 15. eventos Off-chain + versiones On-chain
npm test                         # pruebas unitarias
npm run test:integration         # prueba real contra MySQL + Fabric (requiere la red arriba)
```

### Paso 16. Apagado y limpieza

```bash
./fabric-network/scripts/network.sh down        # detiene la red; los ledgers se conservan
(cd database && docker compose stop)             # detiene MySQL; los datos se conservan
./fabric-network/scripts/cleanNetwork.sh         # (opcional) borra ledgers, identidades y artefactos
```

> Si se ejecuta `cleanNetwork.sh`, el ledger se pierde: las filas de `blockchain_evidence` en MySQL quedarían
> apuntando a transacciones inexistentes. Para empezar de cero también: `cd app-next && npm run db:reset`.

## 5. Comandos disponibles (`app-next/`)

| Comando | Función |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run check` | Verifica configuración, MySQL y Fabric |
| `npm run record -- REG-xxxxxx` | Registra la evidencia de la versión vigente del registro |
| `npm run verify -- REG-xxxxxx` | Compara el HMAC actual con la última versión On-chain (sale con código 3 si ALTERADO) |
| `npm run trace -- REG-xxxxxx` | Trazabilidad Off-chain + On-chain, sin datos personales |
| `npm run rectify -- REG-xxxxxx <AD\|A\|B\|C> <nota> "motivo"` | Rectificación autorizada (nueva versión) |
| `npm run tamper -- REG-xxxxxx [--restore]` | Solo pruebas: alteración directa en MySQL |
| `npm run demo:evidence -- REG-xxxxxx` | Demostración: forma canónica, SHA-256 vs HMAC, determinismo, avalancha |
| `npm run seed` · `npm run db:reset` | Datos de validación · reinicio de la base |
| `npm test` · `npm run test:integration` | Pruebas Jest |

## 6. Resultados verificados

| Verificación | Resultado | Evidencia |
|---|---|---|
| Red Fabric: orderer, 2 peers, 2 CAs | En ejecución | `evidencias/01_network_up.log` |
| Canal `academicchannel` con ambas organizaciones | Creado, altura inicial 1 | `02_create_channel.log` |
| Chaincode `academic-traceability` 1.0, secuencia 1 | Aprobado por ambas organizaciones y confirmado | `03_deploy_chaincode.log` |
| Next.js ↔ MySQL ↔ Fabric | `npm run check` y `/api/health` OK | `04_…`, `18_nextjs_health.log` |
| Registro REG-000001 | TX_ID `ff57bd47…` bloque 4 | `05_record_REG-000001.log` |
| Verificación íntegra / alteración detectada | INTEGRO / ALTERADO | `06_…`, `07_…` |
| 8 casos de fallo | Comportamiento esperado | `11_…`, `12_…`, `13_…`, `23_…` |
| Persistencia tras recrear contenedores | Altura 18 idéntica en ambos peers; INTEGRO | `14_reinicio_contenedores.log` |
| Pruebas Jest | 49 unitarias + 3 integración real + 8 chaincode | `16_…`, `17_…`, `24_…` |
| Datos personales On-chain | 0 coincidencias en 20 bloques | `22_privacidad_onchain.log` |

## 7. Informes y diagramas

Los PDF de `informes/` y los PNG de `diagramas/` se generan desde `docs-src/` e incrustan las salidas reales de `evidencias/`:

```bash
node docs-src/build.mjs                       # todos los informes (requiere Chrome o Edge)
python docs-src/reports/build_h3_06.py        # regenera la fuente de H3_06 antes del build
python docs-src/diagrams/build_sequence.py    # regenera la fuente del diagrama de secuencia
```

## 8. Seguridad

- No se versionan `.env`, claves privadas ni material criptográfico (`.gitignore` en cada módulo).
- El logger redacta campos sensibles y nunca imprime `HMAC_SECRET`.
- El chaincode rechaza cualquier valor que no sea una referencia seudónima o un HMAC hexadecimal.
- Configuración de **desarrollo**: contraseña por defecto de las CAs (`adminpw`), servidor del chaincode sin TLS
  dentro de la red Docker, orderer Raft de un solo nodo. Se documentan como pendientes para producción.

## 9. Limitaciones y pendientes (Hito 4)

- Los artefactos del Hito 2 no estaban disponibles en el entorno de trabajo; el modelo se implementó a partir de las
  entidades exigidas en el enunciado del Hito 3. Si difieren, conviene conciliarlos al inicio del Hito 4.
- Los datos son de validación (ficticios); la carga del conjunto real autorizado corresponde al Hito 6.
- Pendiente para el Hito 4: API REST, revocación/supresión sobre la copia de investigación y autenticación por rol.
