#!/usr/bin/env bash
# Recuperación de un respaldo en la base Off-chain.
#   ./restore.sh backups/trazabilidad_academica_AAAAMMDD_HHMMSS.sql
# Después de restaurar, ejecute "npm run verify -- <REG>" en app-next para confirmar que los
# registros siguen coincidiendo con las evidencias ancladas en Fabric.
set -euo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "${BASH_SOURCE[0]}")"
source .env

FILE="${1:?Uso: ./restore.sh backups/<archivo>.sql}"
[ -f "${FILE}" ] || { echo "[ERROR] No existe ${FILE}"; exit 1; }

docker exec mysql-trazabilidad sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" < /backups/$(basename "${FILE}")"
echo "[OK] Base trazabilidad_academica restaurada desde ${FILE}"
