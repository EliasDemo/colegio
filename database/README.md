# database — Almacenamiento Off-chain (MySQL 8)

Implementa el modelo del Hito 2 (`hito2/H2_04_Modelo_Datos_OffChain.sql`): las 19 tablas con sus 123 columnas,
claves, restricciones e índices, más 3 columnas de extensión. Base: **`nuevo_horizonte_trazabilidad`** (el mismo
nombre que en H2_04).

| Archivo | Contenido |
|---|---|
| `docker-compose.yml` | MySQL 8.4 LTS, utf8mb4, UTC, volumen persistente `mysql_data`, healthcheck |
| `schema.sql` | Esquema generado desde `app-next/prisma/schema.prisma` (idéntico a la migración Prisma) |
| `seed.sql` | 492 filas: dataset seudonimizado del Hito 2 (77 resultados) + complemento sintético (70) |
| `views.sql` | `vw_trazabilidad_resultado` (del Hito 2), `vw_registro_academico`, `vw_estado_vinculo`, `vw_pendientes_anclaje`, `vw_verificaciones`, `vw_resumen_seccion_periodo` |
| `backup.sh` / `restore.sh` | Respaldo lógico (`mysqldump --single-transaction`) y recuperación |

## Extensiones respecto del Hito 2

| Id | Cambio | Justificación |
|---|---|---|
| E1 | `resultado_academico.codigo` (UNIQUE) | Referencia técnica estable (`registro_id` del dataset, p. ej. REG-0001) usada como `objeto_ref`; el `resultado_id` autoincremental cambia entre instalaciones |
| E2 | `evento_trazabilidad.resultado_verificacion` | Resultado explícito de la verificación: íntegro / alterado / no verificable (RF-22) |
| E3 | `evento_trazabilidad.error_detalle` | Diagnóstico de fallos de envío a Fabric (RNF-14, H2-06 §7) |
| E4 | `tipo_actividad` incluye `TRABAJO` | Tipo presente en el dataset H2_02 y ausente en el catálogo de H2_04 |

Además, los valores por defecto de `evidencia_blockchain` usan los nombres exigidos por el Hito 3
(`academicchannel`, `academic-traceability`) en lugar de `academico-channel` / `trazabilidad-cc`.

## Privacidad

Solo tokens seudónimos (`token_estudiante`, `token_docente`, `username`). La correspondencia token ↔ identidad
real **no** se almacena en esta base (RNF-07, H2-05): permanece bajo custodia institucional separada.

## Uso

```bash
cp .env.example .env && docker compose up -d
# Opción A (Prisma):   cd ../app-next && npx prisma migrate deploy && npm run seed
# Opción B (solo SQL):
docker exec -i mysql-trazabilidad mysql -uroot -p nuevo_horizonte_trazabilidad < schema.sql
docker exec -i mysql-trazabilidad mysql -uroot -p --default-character-set=utf8mb4 nuevo_horizonte_trazabilidad < seed.sql
docker exec -i mysql-trazabilidad mysql -uroot -p nuevo_horizonte_trazabilidad < views.sql
```

## Respaldo y recuperación

```bash
./backup.sh
./restore.sh backups/nuevo_horizonte_trazabilidad_<fecha>.sql
cd ../app-next && npm run check && npm run verify -- REG-0001
```
