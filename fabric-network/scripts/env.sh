#!/usr/bin/env bash
# Variables y funciones comunes de los scripts de la red Fabric.
# Funciona en Linux, macOS y Windows (Git Bash) con Docker Desktop.

set -euo pipefail

# En Git Bash evita que las rutas /opt/... se conviertan a rutas de Windows.
export MSYS_NO_PATHCONV=1

# pwd -W devuelve la ruta Windows en Git Bash; en Linux/macOS se usa pwd.
NETWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && (pwd -W 2>/dev/null || pwd))"
PROJECT_DIR="$(cd "${NETWORK_DIR}/.." && (pwd -W 2>/dev/null || pwd))"
COMPOSE_NETWORK="${NETWORK_DIR}/compose/compose-network.yaml"
COMPOSE_CHAINCODE="${NETWORK_DIR}/compose/compose-chaincode.yaml"
CHAINCODE_ENV_FILE="${NETWORK_DIR}/channel-artifacts/chaincode.env"

export FABRIC_VERSION="${FABRIC_VERSION:-2.5}"
export FABRIC_CA_VERSION="${FABRIC_CA_VERSION:-1.5}"

CHANNEL_NAME="${CHANNEL_NAME:-academicchannel}"
CC_NAME="${CC_NAME:-academic-traceability}"
export CC_VERSION="${CC_VERSION:-1.0}"
CC_SEQUENCE="${CC_SEQUENCE:-1}"
CC_SRC_DIR="${PROJECT_DIR}/chaincode/academic-traceability"
CC_IMAGE="academic-traceability-ccaas:${CC_VERSION}"
CC_SERVICE_ADDRESS="academic-traceability-cc:9999"

# Rutas dentro del contenedor cli
CLI_ORGS=/opt/network/organizations
ORDERER_ADDRESS=orderer.example.com:7050
ORDERER_ADMIN_ADDRESS=orderer.example.com:7053
ORDERER_CA=${CLI_ORGS}/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem
ORDERER_ADMIN_TLS_CERT=${CLI_ORGS}/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
ORDERER_ADMIN_TLS_KEY=${CLI_ORGS}/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key
NH_PEER_TLS=${CLI_ORGS}/peerOrganizations/nuevohorizonte.example.com/peers/peer0.nuevohorizonte.example.com/tls/ca.crt
VAL_PEER_TLS=${CLI_ORGS}/peerOrganizations/validator.example.com/peers/peer0.validator.example.com/tls/ca.crt

info()    { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
success() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
warn()    { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
fatal()   { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

compose() { docker compose -f "${COMPOSE_NETWORK}" "$@"; }

require_docker() {
  command -v docker >/dev/null 2>&1 || fatal "Docker no está instalado"
  docker info >/dev/null 2>&1 || fatal "El motor de Docker no está en ejecución (inicie Docker Desktop)"
}

# Ejecuta un comando en el contenedor cli con la identidad Admin de una organización.
#   as_org nuevohorizonte peer channel list
as_org() {
  local org="$1"; shift
  local msp address tls domain
  case "${org}" in
    nuevohorizonte) msp=NuevoHorizonteMSP;   domain=nuevohorizonte.example.com; address=peer0.nuevohorizonte.example.com:7051; tls=${NH_PEER_TLS} ;;
    validator)      msp=AcademicValidatorMSP; domain=validator.example.com;      address=peer0.validator.example.com:9051;      tls=${VAL_PEER_TLS} ;;
    *) fatal "Organización desconocida: ${org}" ;;
  esac
  docker exec \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_LOCALMSPID="${msp}" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="${tls}" \
    -e CORE_PEER_MSPCONFIGPATH="${CLI_ORGS}/peerOrganizations/${domain}/users/Admin@${domain}/msp" \
    -e CORE_PEER_ADDRESS="${address}" \
    cli "$@"
}

# Espera a que un contenedor esté en ejecución.
wait_running() {
  local name="$1" tries=30
  until [ "$(docker inspect -f '{{.State.Running}}' "${name}" 2>/dev/null)" = "true" ]; do
    tries=$((tries - 1)); [ "${tries}" -le 0 ] && fatal "El contenedor ${name} no inició"
    sleep 1
  done
}
