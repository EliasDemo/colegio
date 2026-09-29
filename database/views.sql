-- =============================================================================
-- Vistas de consulta del almacenamiento Off-chain (MySQL 8)
-- Prototipo de trazabilidad microcurricular - I.E. Nuevo Horizonte (Hito 3)
--
-- vw_trazabilidad_resultado es la vista del Hito 2 (H2_04) adaptada a la referencia técnica
-- resultado_academico.codigo (extensión E1). Todas las vistas trabajan solo con tokens seudónimos.
-- Aplicar con:  mysql -u root -p nuevo_horizonte_trazabilidad < views.sql
-- =============================================================================

-- Vista operativa del Hito 2: resultado + evento vigente + evidencia en el ledger.
CREATE OR REPLACE VIEW vw_trazabilidad_resultado AS
SELECT
    r.resultado_id,
    r.codigo,
    e.token_estudiante,
    ac.codigo AS actividad_codigo,
    ac.titulo AS actividad_titulo,
    ar.codigo AS area_codigo,
    ar.nombre AS area_nombre,
    r.version_actual,
    r.puntaje_obtenido,
    r.estado,
    r.registrado_en,
    et.evento_id,
    et.evento_tipo,
    et.compromiso_hmac,
    eb.tx_id,
    eb.block_number,
    eb.validacion AS validacion_blockchain
FROM resultado_academico r
JOIN matricula m ON m.matricula_id = r.matricula_id
JOIN estudiante e ON e.estudiante_id = m.estudiante_id
JOIN actividad_academica ac ON ac.actividad_id = r.actividad_id
JOIN asignacion_docente ad ON ad.asignacion_id = ac.asignacion_id
JOIN area_curricular ar ON ar.area_id = ad.area_id
LEFT JOIN evento_trazabilidad et
    ON et.objeto_tipo = 'RESULTADO'
   AND et.objeto_ref = r.codigo
   AND et.version = r.version_actual
   AND et.evento_tipo IN ('CREACION', 'RECTIFICACION', 'REVOCACION')
LEFT JOIN evidencia_blockchain eb ON eb.evento_id = et.evento_id;

-- Registro académico completo (payload canónico) con referencias seudónimas.
CREATE OR REPLACE VIEW vw_registro_academico AS
SELECT
    r.codigo            AS registro,
    e.token_estudiante  AS estudiante,
    p.codigo            AS periodo,
    g.numero            AS grado,
    s.codigo            AS seccion,
    ar.codigo           AS area,
    ac.codigo           AS actividad,
    ta.codigo           AS tipo_actividad,
    ac.fecha_actividad,
    ac.puntaje_maximo,
    r.puntaje_obtenido,
    r.estado,
    u.username          AS registrado_por,
    r.registrado_en,
    r.version_actual,
    CASE WHEN r.codigo LIKE 'REG-V%' THEN 'COMPLEMENTO' ELSE 'DATASET_H2' END AS origen
FROM resultado_academico r
JOIN matricula m ON m.matricula_id = r.matricula_id
JOIN estudiante e ON e.estudiante_id = m.estudiante_id
JOIN periodo_academico p ON p.periodo_id = m.periodo_id
JOIN seccion s ON s.seccion_id = m.seccion_id
JOIN grado g ON g.grado_id = s.grado_id
JOIN actividad_academica ac ON ac.actividad_id = r.actividad_id
JOIN tipo_actividad ta ON ta.tipo_actividad_id = ac.tipo_actividad_id
JOIN asignacion_docente ad ON ad.asignacion_id = ac.asignacion_id
JOIN area_curricular ar ON ar.area_id = ad.area_id
JOIN usuario u ON u.usuario_id = r.registrado_por;

-- Estado del vínculo On-chain de la versión vigente de cada resultado.
CREATE OR REPLACE VIEW vw_estado_vinculo AS
SELECT
    r.codigo                                   AS registro,
    r.version_actual,
    et.evento_id,
    COALESCE(et.estado_evento, 'SIN_EVENTO')   AS estado_evento,
    eb.tx_id,
    eb.block_number,
    eb.committed_at
FROM resultado_academico r
LEFT JOIN evento_trazabilidad et
    ON et.objeto_tipo = 'RESULTADO' AND et.objeto_ref = r.codigo AND et.version = r.version_actual
   AND et.evento_tipo IN ('CREACION', 'RECTIFICACION', 'REVOCACION')
LEFT JOIN evidencia_blockchain eb ON eb.evento_id = et.evento_id;

-- Versiones vigentes aún no confirmadas en Fabric (pendientes, con error o sin evento): cola de reintentos.
CREATE OR REPLACE VIEW vw_pendientes_anclaje AS
SELECT registro, version_actual, evento_id, estado_evento
FROM vw_estado_vinculo
WHERE estado_evento <> 'CONFIRMADO';

-- Historial de verificaciones de integridad.
CREATE OR REPLACE VIEW vw_verificaciones AS
SELECT
    et.objeto_ref            AS registro,
    et.creado_en             AS fecha,
    et.version,
    et.resultado_verificacion,
    et.actor_rol_codigo      AS rol,
    et.estado_evento,
    eb.tx_id
FROM evento_trazabilidad et
LEFT JOIN evidencia_blockchain eb ON eb.evento_id = et.evento_id
WHERE et.evento_tipo = 'VERIFICACION';

-- Resumen académico por sección, área y periodo.
CREATE OR REPLACE VIEW vw_resumen_seccion_periodo AS
SELECT
    periodo,
    CONCAT(grado, seccion)        AS seccion,
    area,
    origen,
    COUNT(*)                      AS resultados,
    ROUND(AVG(puntaje_obtenido), 2) AS promedio,
    MIN(puntaje_obtenido)         AS minimo,
    MAX(puntaje_obtenido)         AS maximo
FROM vw_registro_academico
GROUP BY periodo, grado, seccion, area, origen;
