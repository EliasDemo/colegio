#!/usr/bin/env bash
# Respaldo lógico de la base Off-chain (estructura + datos + vistas) en database/backups/.
#   ./backup.sh                      → backups/nuevo_horizonte_trazabilidad_AAAAMMDD_HHMMSS.sql
set -euo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "${BASH_SOURCE[0]}")"
source .env

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="nuevo_horizonte_trazabilidad_${STAMP}.sql"

# --single-transaction: copia consistente sin bloquear tablas InnoDB.
docker exec mysql-trazabilidad sh -c \
  "mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines --triggers --databases nuevo_horizonte_trazabilidad > /backups/${FILE}"

echo "[OK] Respaldo generado: database/backups/${FILE}"
