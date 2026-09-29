#!/usr/bin/env bash
# Elimina COMPLETAMENTE la red: contenedores, volúmenes (ledgers), identidades generadas,
# artefactos del canal e imagen del chaincode. Úselo para volver a un estado limpio.

source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_docker

if [ "${1:-}" != "--yes" ]; then
  read -r -p "Se borrarán ledgers, identidades y artefactos del canal. ¿Continuar? [s/N] " answer
  [[ "${answer}" =~ ^[sS]$ ]] || { info "Operación cancelada"; exit 0; }
fi

info "Eliminando contenedores y volúmenes..."
[ -f "${CHAINCODE_ENV_FILE}" ] && docker compose -f "${COMPOSE_CHAINCODE}" down --remove-orphans || true
compose down --volumes --remove-orphans

info "Eliminando material generado..."
# Se borra desde un contenedor porque algunos archivos pueden pertenecer a root.
docker run --rm -v "${NETWORK_DIR}:/net" alpine:3.20 sh -c \
  'rm -rf /net/organizations/peerOrganizations /net/organizations/ordererOrganizations /net/channel-artifacts/* && touch /net/channel-artifacts/.gitkeep'

docker image rm -f "${CC_IMAGE}" >/dev/null 2>&1 || true
success "Red limpia. Ejecute ./scripts/network.sh up para crearla nuevamente"
