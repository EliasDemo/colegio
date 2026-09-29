#!/usr/bin/env bash
# Crea el canal academicchannel y une los peers de ambas organizaciones.
#   1. configtxgen genera el bloque génesis del canal (incluye anchor peers).
#   2. osnadmin une el orderer al canal (channel participation API, sin canal de sistema).
#   3. peer channel join une peer0.nuevohorizonte y peer0.validator.

source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_docker
wait_running cli

BLOCK=/opt/network/channel-artifacts/${CHANNEL_NAME}.block

if [ ! -f "${NETWORK_DIR}/channel-artifacts/${CHANNEL_NAME}.block" ]; then
  info "Generando bloque génesis de ${CHANNEL_NAME}..."
  docker exec -e FABRIC_CFG_PATH=/opt/network/configtx cli \
    configtxgen -profile AcademicChannelProfile -outputBlock "${BLOCK}" -channelID "${CHANNEL_NAME}"
fi

if docker exec cli osnadmin channel list -o "${ORDERER_ADMIN_ADDRESS}" --ca-file "${ORDERER_CA}" \
     --client-cert "${ORDERER_ADMIN_TLS_CERT}" --client-key "${ORDERER_ADMIN_TLS_KEY}" | grep -q "\"${CHANNEL_NAME}\""; then
  info "El orderer ya participa en ${CHANNEL_NAME}"
else
  info "Uniendo el orderer al canal..."
  docker exec cli osnadmin channel join --channelID "${CHANNEL_NAME}" --config-block "${BLOCK}" \
    -o "${ORDERER_ADMIN_ADDRESS}" --ca-file "${ORDERER_CA}" \
    --client-cert "${ORDERER_ADMIN_TLS_CERT}" --client-key "${ORDERER_ADMIN_TLS_KEY}"
fi

join_peer() {
  local org="$1"
  if as_org "${org}" peer channel list 2>/dev/null | grep -qx "${CHANNEL_NAME}"; then
    info "peer0.${org} ya está unido a ${CHANNEL_NAME}"
    return
  fi
  local attempt
  for attempt in 1 2 3 4 5; do
    if as_org "${org}" peer channel join -b "${BLOCK}"; then
      success "peer0.${org} unido a ${CHANNEL_NAME}"
      return
    fi
    warn "Reintentando unión de peer0.${org} (${attempt}/5)..."
    sleep 3
  done
  fatal "No se pudo unir peer0.${org} al canal"
}

join_peer nuevohorizonte
join_peer validator

info "Canales de cada peer:"
as_org nuevohorizonte peer channel list
as_org validator peer channel list
as_org nuevohorizonte peer channel getinfo -c "${CHANNEL_NAME}"
success "Canal ${CHANNEL_NAME} creado con NuevoHorizonteMSP y AcademicValidatorMSP"
