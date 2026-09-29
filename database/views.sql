-- =============================================================================
-- Vistas de consulta del almacenamiento Off-chain (MySQL 8)
-- Prototipo de trazabilidad microcurricular - I.E. Nuevo Horizonte (Hito 3)
--
-- Ninguna vista expone student_identity: trabajan solo con códigos seudónimos.
-- Aplicar con:  mysql -u root -p trazabilidad_academica < views.sql
-- =============================================================================

-- Registro académico seudonimizado: la "copia de trabajo" que se canonicaliza y firma.
CREATE OR REPLACE VIEW v_registro_academico AS
SELECT
  r.code               AS registro,
  s.pseudonym_code     AS estudiante,
  e.code               AS matricula,
  sec.code             AS seccion,
  sub.code             AS area,
  a.code               AS actividad,
  a.type               AS tipo_actividad,
  p.code               AS periodo,
  t.pseudonym_code     AS docente,
  r.qualitative_grade  AS calificacion,
  r.numeric_score      AS nota,
  r.recorded_at        AS registrado_en,
  r.version            AS version
FROM academic_result r
JOIN enrollment e           ON e.id = r.enrollment_id
JOIN student s              ON s.id = e.student_id
JOIN section sec            ON sec.id = e.section_id
JOIN academic_activity a    ON a.id = r.activity_id
JOIN academic_period p      ON p.id = a.period_id
JOIN teaching_assignment ta ON ta.id = a.teaching_assignment_id
JOIN subject sub            ON sub.id = ta.subject_id
JOIN teacher t              ON t.id = r.recorded_by_teacher_id;

-- Estado del vínculo On-chain / Off-chain de la versión vigente de cada registro.
CREATE OR REPLACE VIEW v_estado_vinculo AS
SELECT
  r.code                               AS registro,
  r.version                            AS version_actual,
  be.evidence_id                       AS evidencia,
  COALESCE(be.status, 'SIN_ANCLAR')    AS estado_vinculo,
  be.tx_id                             AS tx_id,
  be.block_number                      AS bloque,
  be.confirmed_at                      AS confirmado_en
FROM academic_result r
LEFT JOIN blockchain_evidence be ON be.result_id = r.id AND be.version = r.version;

-- Registros cuya versión vigente todavía no tiene evidencia confirmada en Fabric
-- (pendientes, fallidos o nunca anclados): insumo para reintentos y reconciliación.
CREATE OR REPLACE VIEW v_pendientes_anclaje AS
SELECT registro, version_actual, evidencia, estado_vinculo
FROM v_estado_vinculo
WHERE estado_vinculo <> 'CONFIRMADO';

-- Bitácora de trazabilidad (Off-chain) con referencias seudónimas.
CREATE OR REPLACE VIEW v_trazabilidad AS
SELECT
  r.code            AS registro,
  te.occurred_at    AS fecha,
  te.event_type     AS evento,
  te.version        AS version,
  te.status         AS estado,
  te.actor_reference AS actor,
  te.actor_role     AS rol,
  te.evidence_id    AS evidencia,
  te.tx_id          AS tx_id,
  te.detail         AS detalle
FROM traceability_event te
JOIN academic_result r ON r.id = te.result_id;

-- Resumen de resultados por sección, área y periodo.
CREATE OR REPLACE VIEW v_resumen_seccion_periodo AS
SELECT
  seccion,
  area,
  periodo,
  COUNT(*)                                    AS resultados,
  ROUND(AVG(nota), 2)                         AS promedio,
  SUM(calificacion = 'AD')                    AS logro_destacado,
  SUM(calificacion = 'A')                     AS logro_esperado,
  SUM(calificacion = 'B')                     AS en_proceso,
  SUM(calificacion = 'C')                     AS en_inicio
FROM v_registro_academico
GROUP BY seccion, area, periodo;
