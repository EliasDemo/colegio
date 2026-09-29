# database — Almacenamiento Off-chain (MySQL 8)

| Archivo | Contenido |
|---|---|
| `docker-compose.yml` | MySQL 8.4 LTS, utf8mb4, zona UTC, volumen persistente `mysql_data`, healthcheck |
| `schema.sql` | 18 tablas, claves, índices y FK. Generado desde `app-next/prisma/schema.prisma` (misma migración) |
| `seed.sql` | Datos de validación ficticios (378 filas): 24 estudiantes, 5 docentes, 10 áreas, 3 secciones, 2 periodos, 15 actividades, 120 resultados, 120 asistencias, 7 usuarios |
| `views.sql` | Vistas seudonimizadas: `v_registro_academico`, `v_estado_vinculo`, `v_pendientes_anclaje`, `v_trazabilidad`, `v_resumen_seccion_periodo` |
| `backup.sh` / `restore.sh` | Respaldo lógico (`mysqldump --single-transaction`) y recuperación |
| `backups/` | Respaldos generados (no se versionan) |

## Iniciar

```bash
cp .env.example .env        # definir MYSQL_ROOT_PASSWORD
docker compose up -d
```

## Crear el esquema

Opción A (recomendada, Prisma):

```bash
cd ../app-next && npx prisma migrate deploy && npm run seed
```

Opción B (solo SQL, sin Node.js):

```bash
docker exec -i mysql-trazabilidad mysql -uroot -p trazabilidad_academica < schema.sql
docker exec -i mysql-trazabilidad mysql -uroot -p --default-character-set=utf8mb4 trazabilidad_academica < seed.sql
docker exec -i mysql-trazabilidad mysql -uroot -p trazabilidad_academica < views.sql
```

Ambas opciones producen datos idénticos: la evidencia de `REG-000001` calculada sobre una base cargada solo con SQL
coincide con la anclada en Fabric (ver `evidencias/20_coherencia_sql_prisma.log`).

## Modelo

```text
institution ─┬─ academic_period ─────────────┐
             ├─ grade ── section ─┬─ enrollment ─┬─ academic_result ─┬─ academic_result_history
             ├─ teacher ──────────┤              │                   ├─ blockchain_evidence   (TX_ID)
             └─ student ─┬────────┘              └─ attendance       └─ traceability_event
                         └─ student_identity (datos personales, 1:1)
subject ── teaching_assignment (docente × área × sección) ── academic_activity ── academic_result
role ── app_user (actor seudónimo, opcionalmente vinculado a teacher)
```

Seudonimización: `student.pseudonym_code` (EST-PSE-xxx) y `teacher.pseudonym_code` (DOC-PSE-xxx) son los únicos
identificadores que salen hacia Fabric. Los datos personales están en `student_identity` (y nombres de `teacher`)
y ninguna vista los incluye.

## Consultas útiles

```sql
SELECT * FROM v_registro_academico WHERE registro = 'REG-000001';
SELECT * FROM v_estado_vinculo WHERE estado_vinculo = 'CONFIRMADO';
SELECT * FROM v_pendientes_anclaje LIMIT 10;
SELECT * FROM v_trazabilidad WHERE registro = 'REG-000002' ORDER BY fecha;
SELECT * FROM v_resumen_seccion_periodo;
```

## Respaldo y recuperación

```bash
./backup.sh                                             # backups/trazabilidad_academica_<fecha>.sql
./restore.sh backups/trazabilidad_academica_<fecha>.sql
cd ../app-next && npm run check && npm run verify -- REG-000001
```

Tras restaurar, la verificación contra el ledger confirma que los datos recuperados son los originales.
