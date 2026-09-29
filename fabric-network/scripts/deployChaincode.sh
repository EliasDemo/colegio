#!/usr/bin/env bash
# Despliega el chaincode academic-traceability como servicio externo (CCaaS) con el ciclo de vida de Fabric 2.x:
#   build imagen → package → install (2 peers) → approve (2 orgs) → commit → iniciar contenedor → verificar.
# Variables opcionales: CC_VERSION (1.0), CC_SEQUENCE (1).

source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_docker
wait_running cli

CC_LABEL="${CC_NAME}_${CC_VERSION}"
PKG_DIR="${NETWORK_DIR}/channel-artifacts/chaincode"
PKG_FILE="${CC_LABEL}.tar.gz"
CLI_PKG=/opt/network/channel-artifacts/chaincode/${PKG_FILE}

info "1/7 Construyendo imagen ${CC_IMAGE} desde chaincode/academic-traceability..."
docker build -q -t "${CC_IMAGE}" "${CC_SRC_DIR}"

info "2/7 Empaquetando chaincode (tipo ccaas, dirección ${CC_SERVICE_ADDRESS})..."
mkdir -p "${PKG_DIR}"
# El paquete se arma dentro del contenedor cli para no depender de tar en el host.
docker exec cli bash -c "set -e
  work=\$(mktemp -d)
  cat > \$work/connection.json <<JSON
{ \"address\": \"${CC_SERVICE_ADDRESS}\", \"dial_timeout\": \"10s\", \"tls_required\": false }
JSON
  cat > \$work/metadata.json <<JSON
{ \"type\": \"ccaas\", \"label\": \"${CC_LABEL}\" }
JSON
  tar -C \$work -czf \$work/code.tar.gz connection.json
  tar -C \$work -czf ${CLI_PKG} metadata.json code.tar.gz
  rm -rf \$work"

PACKAGE_ID=$(docker exec cli peer lifecycle chaincode calculatepackageid "${CLI_PKG}")
info "Package ID: ${PACKAGE_ID}"

info "3/7 Instalando en los peers de ambas organizaciones..."
for org in nuevohorizonte validator; do
  if as_org "${org}" peer lifecycle chaincode queryinstalled 2>/dev/null | grep -q "${PACKAGE_ID}"; then
    info "peer0.${org}: paquete ya instalado"
  else
    as_org "${org}" peer lifecycle chaincode install "${CLI_PKG}"
  fi
done

info "4/7 Iniciando el contenedor del chaincode..."
printf 'CHAINCODE_ID=%s\n' "${PACKAGE_ID}" > "${CHAINCODE_ENV_FILE}"
docker compose -f "${COMPOSE_CHAINCODE}" up -d --force-recreate
wait_running academic-traceability-cc

COMMON_ORDERER=(-o "${ORDERER_ADDRESS}" --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${ORDERER_CA}")

if as_org nuevohorizonte peer lifecycle chaincode querycommitted -C "${CHANNEL_NAME}" -n "${CC_NAME}" 2>/dev/null \
     | grep -q "Sequence: ${CC_SEQUENCE},"; then
  info "La definición ${CC_NAME} (secuencia ${CC_SEQUENCE}) ya está confirmada en el canal"
else
  info "5/7 Aprobando la definición por cada organización..."
  for org in nuevohorizonte validator; do
    as_org "${org}" peer lifecycle chaincode approveformyorg "${COMMON_ORDERER[@]}" \
      --channelID "${CHANNEL_NAME}" --name "${CC_NAME}" --version "${CC_VERSION}" \
      --package-id "${PACKAGE_ID}" --sequence "${CC_SEQUENCE}"
  done

  as_org nuevohorizonte peer lifecycle chaincode checkcommitreadiness --channelID "${CHANNEL_NAME}" \
    --name "${CC_NAME}" --version "${CC_VERSION}" --sequence "${CC_SEQUENCE}" --output json

  info "6/7 Confirmando (commit) la definición en ${CHANNEL_NAME}..."
  as_org nuevohorizonte peer lifecycle chaincode commit "${COMMON_ORDERER[@]}" \
    --channelID "${CHANNEL_NAME}" --name "${CC_NAME}" --version "${CC_VERSION}" --sequence "${CC_SEQUENCE}" \
    --peerAddresses peer0.nuevohorizonte.example.com:7051 --tlsRootCertFiles "${NH_PEER_TLS}" \
    --peerAddresses peer0.validator.example.com:9051 --tlsRootCertFiles "${VAL_PEER_TLS}"
fi

info "7/7 Verificando el despliegue..."
as_org nuevohorizonte peer lifecycle chaincode querycommitted --channelID "${CHANNEL_NAME}" --name "${CC_NAME}"
sleep 3
as_org nuevohorizonte peer chaincode query -C "${CHANNEL_NAME}" -n "${CC_NAME}" \
  -c '{"function":"academicEvidenceExists","Args":["EVD-REG-000000-V1"]}'
success "Chaincode ${CC_NAME} ${CC_VERSION} desplegado en ${CHANNEL_NAME}"
