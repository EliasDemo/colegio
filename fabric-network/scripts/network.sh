#!/usr/bin/env bash
# Gestión de la red Hyperledger Fabric del prototipo.
#   ./scripts/network.sh up        genera identidades (si faltan) y levanta orderer, peers, CAs y cli
#   ./scripts/network.sh down      detiene y elimina contenedores (los ledgers se conservan en volúmenes)
#   ./scripts/network.sh restart   reinicia los contenedores sin borrar datos
#   ./scripts/network.sh status    muestra el estado de los servicios

source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

generate_crypto() {
  if [ -d "${NETWORK_DIR}/organizations/peerOrganizations" ]; then
    info "Material criptográfico existente: se reutiliza"
    return
  fi
  info "Generando identidades (MSP y TLS) con cryptogen..."
  compose run --rm --no-deps -T cli cryptogen generate \
    --config=/opt/network/organizations/cryptogen/crypto-config.yaml \
    --output=/opt/network/organizations
  success "Identidades generadas en fabric-network/organizations"
}

start_chaincode_if_deployed() {
  if [ -f "${CHAINCODE_ENV_FILE}" ] && docker image inspect "${CC_IMAGE}" >/dev/null 2>&1; then
    info "Iniciando contenedor del chaincode (${CC_IMAGE})"
    docker compose -f "${COMPOSE_CHAINCODE}" up -d
  fi
}

network_up() {
  require_docker
  generate_crypto
  info "Levantando orderer, peers, CAs y cli..."
  compose up -d
  for c in orderer.example.com peer0.nuevohorizonte.example.com peer0.validator.example.com \
           ca.nuevohorizonte.example.com ca.validator.example.com cli; do
    wait_running "${c}"
  done
  start_chaincode_if_deployed
  success "Red Fabric en ejecución"
  network_status
}

network_down() {
  require_docker
  info "Deteniendo la red (los volúmenes de ledger se conservan)..."
  [ -f "${CHAINCODE_ENV_FILE}" ] && docker compose -f "${COMPOSE_CHAINCODE}" down || true
  compose down
  success "Red detenida. Para borrar todo use ./scripts/cleanNetwork.sh"
}

network_restart() {
  require_docker
  info "Reiniciando contenedores..."
  compose restart
  [ -f "${CHAINCODE_ENV_FILE}" ] && docker compose -f "${COMPOSE_CHAINCODE}" restart || true
  success "Red reiniciada"
}

network_status() {
  docker ps -a --filter network=fabric_academic --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
}

case "${1:-}" in
  up) network_up ;;
  down) network_down ;;
  restart) network_restart ;;
  status) network_status ;;
  *) echo "Uso: $0 {up|down|restart|status}"; exit 1 ;;
esac
