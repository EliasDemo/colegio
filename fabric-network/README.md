# fabric-network — Red Hyperledger Fabric 2.5

Red permisionada mínima pero representativa del prototipo.

| Organización | MSP | Nodos | Puertos (host) |
|---|---|---|---|
| OrdererOrg | `OrdererMSP` | `orderer.example.com` (Raft, 1 nodo) | 7050 (servicio), 7053 (admin), 9443 (operaciones) |
| NuevoHorizonteOrg — I.E. Nuevo Horizonte | `NuevoHorizonteMSP` | `peer0.nuevohorizonte.example.com`, `ca.nuevohorizonte.example.com` | 7051, 9444 · CA 7054 |
| AcademicValidatorOrg — validación del prototipo (neutral, no es una entidad pública) | `AcademicValidatorMSP` | `peer0.validator.example.com`, `ca.validator.example.com` | 9051, 9445 · CA 8054 |

- Canal: `academicchannel` (ambas organizaciones, anchor peers definidos en el bloque génesis).
- Chaincode: `academic-traceability` 1.0, ejecutado como servicio externo (**CCaaS**) en el contenedor `academic-traceability-cc`.
- Política de endorsement: `MAJORITY Endorsement` → con dos organizaciones, **ambas** deben endosar.
- Estado: LevelDB con base de historial habilitada. Ledgers en volúmenes Docker con nombre (persisten entre reinicios).

## Estructura

```text
fabric-network/
├── compose/
│   ├── compose-network.yaml     orderer, peers, CAs y contenedor cli (herramientas)
│   └── compose-chaincode.yaml   contenedor del chaincode (CCaaS)
├── configtx/configtx.yaml       organizaciones, políticas, Raft y perfil AcademicChannelProfile
├── organizations/
│   └── cryptogen/crypto-config.yaml   definición de identidades (MSP y TLS)
│   (peerOrganizations/ y ordererOrganizations/ se generan; no se versionan)
├── channel-artifacts/           bloque génesis, paquete del chaincode y chaincode.env (generados)
└── scripts/
    ├── env.sh                   variables y funciones comunes
    ├── network.sh               up | down | restart | status
    ├── createChannel.sh         canal + unión de peers
    ├── deployChaincode.sh       build → package → install → approve → commit → iniciar → verificar
    └── cleanNetwork.sh          borrado total (ledgers, identidades, artefactos)
```

## Uso

```bash
./scripts/network.sh up           # genera identidades si faltan y levanta la red
./scripts/createChannel.sh        # idempotente
./scripts/deployChaincode.sh      # idempotente; CC_VERSION=1.1 CC_SEQUENCE=2 para actualizar
./scripts/network.sh status
./scripts/network.sh down         # conserva ledgers
./scripts/cleanNetwork.sh --yes   # borra todo
```

Consulta manual desde el contenedor `cli` (en Git Bash anteponer `MSYS_NO_PATHCONV=1`):

```bash
docker exec -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID=NuevoHorizonteMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/network/organizations/peerOrganizations/nuevohorizonte.example.com/peers/peer0.nuevohorizonte.example.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/network/organizations/peerOrganizations/nuevohorizonte.example.com/users/Admin@nuevohorizonte.example.com/msp \
  -e CORE_PEER_ADDRESS=peer0.nuevohorizonte.example.com:7051 \
  cli peer chaincode query -C academicchannel -n academic-traceability \
  -c '{"function":"getAcademicEvidenceHistory","Args":["RESULTADO","REG-0001"]}'
```

## Notas de compatibilidad

- Windows: ejecutar los scripts en **Git Bash**. `env.sh` exporta `MSYS_NO_PATHCONV=1` y usa `pwd -W` para pasar rutas válidas a Docker.
- Los `.sh` deben conservar finales de línea LF (`.gitattributes` lo fuerza).
- El peer no necesita el socket de Docker: el chaincode se ejecuta como servicio (builder `ccaas_builder` incluido en la imagen del peer 2.5).

## Configuración de desarrollo (no apta para producción)

- CAs con usuario de arranque `admin:adminpw` (sobrescribible con `CA_ADMIN_USER` / `CA_ADMIN_PASSWORD`).
- Conexión peer → chaincode sin TLS (solo dentro de la red Docker `fabric_academic`).
- Un único orderer: no tolera fallos del servicio de ordenamiento.
