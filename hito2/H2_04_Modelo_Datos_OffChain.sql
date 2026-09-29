-- HITO 2 - MODELO DE DATOS OFF-CHAIN
-- Proyecto: Arquitectura híbrida basada en blockchain permisionada para trazabilidad microcurricular
-- Caso de estudio: I.E. Nuevo Horizonte - Juliaca
-- Motor objetivo: MySQL 8.0+
-- Versión: 1.0
--
-- Principio de diseño:
-- 1) Los datos académicos detallados y cualquier dato personal permanecen OFF-CHAIN.
-- 2) La blockchain almacena únicamente evidencia mínima: referencia seudónima, tipo de evento,
--    versión, compromiso criptográfico y metadatos de auditoría no identificables directamente.
-- 3) La tabla evidencia_blockchain es un índice local de referencias a transacciones del ledger;
--    NO sustituye al ledger de Hyperledger Fabric.

CREATE DATABASE IF NOT EXISTS nuevo_horizonte_trazabilidad
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE nuevo_horizonte_trazabilidad;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS evidencia_blockchain;
DROP TABLE IF EXISTS evento_trazabilidad;
DROP TABLE IF EXISTS historial_resultado;
DROP TABLE IF EXISTS resultado_academico;
DROP TABLE IF EXISTS actividad_academica;
DROP TABLE IF EXISTS tipo_actividad;
DROP TABLE IF EXISTS asistencia;
DROP TABLE IF EXISTS matricula;
DROP TABLE IF EXISTS asignacion_docente;
DROP TABLE IF EXISTS usuario_rol;
DROP TABLE IF EXISTS rol;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS docente;
DROP TABLE IF EXISTS estudiante;
DROP TABLE IF EXISTS seccion;
DROP TABLE IF EXISTS grado;
DROP TABLE IF EXISTS area_curricular;
DROP TABLE IF EXISTS periodo_academico;
DROP TABLE IF EXISTS institucion;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE institucion (
    institucion_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo                VARCHAR(30) NOT NULL UNIQUE,
    nombre                VARCHAR(180) NOT NULL,
    ciudad                VARCHAR(100) NOT NULL,
    estado                ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    creado_en             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Entidad educativa participante del prototipo.';

CREATE TABLE periodo_academico (
    periodo_id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institucion_id        BIGINT UNSIGNED NOT NULL,
    codigo                VARCHAR(30) NOT NULL,
    nombre                VARCHAR(100) NOT NULL,
    fecha_inicio          DATE NOT NULL,
    fecha_fin             DATE NOT NULL,
    estado                ENUM('PLANIFICADO','ABIERTO','CERRADO') NOT NULL DEFAULT 'ABIERTO',
    CONSTRAINT uq_periodo UNIQUE (institucion_id, codigo),
    CONSTRAINT fk_periodo_institucion FOREIGN KEY (institucion_id)
        REFERENCES institucion(institucion_id)
) ENGINE=InnoDB COMMENT='Bimestres, trimestres u otros periodos académicos.';

CREATE TABLE area_curricular (
    area_id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institucion_id        BIGINT UNSIGNED NOT NULL,
    codigo                VARCHAR(30) NOT NULL,
    nombre                VARCHAR(120) NOT NULL,
    estado                ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT uq_area UNIQUE (institucion_id, codigo),
    CONSTRAINT fk_area_institucion FOREIGN KEY (institucion_id)
        REFERENCES institucion(institucion_id)
) ENGINE=InnoDB COMMENT='Áreas curriculares normalizadas.';

CREATE TABLE grado (
    grado_id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institucion_id        BIGINT UNSIGNED NOT NULL,
    nivel                 VARCHAR(40) NOT NULL DEFAULT 'SECUNDARIA',
    numero                TINYINT UNSIGNED NOT NULL,
    nombre                VARCHAR(60) NOT NULL,
    CONSTRAINT uq_grado UNIQUE (institucion_id, nivel, numero),
    CONSTRAINT chk_grado_numero CHECK (numero BETWEEN 1 AND 6),
    CONSTRAINT fk_grado_institucion FOREIGN KEY (institucion_id)
        REFERENCES institucion(institucion_id)
) ENGINE=InnoDB COMMENT='Grados académicos de la institución.';

CREATE TABLE seccion (
    seccion_id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    grado_id              BIGINT UNSIGNED NOT NULL,
    codigo                VARCHAR(10) NOT NULL,
    nombre                VARCHAR(40) NULL,
    CONSTRAINT uq_seccion UNIQUE (grado_id, codigo),
    CONSTRAINT fk_seccion_grado FOREIGN KEY (grado_id)
        REFERENCES grado(grado_id)
) ENGINE=InnoDB COMMENT='Secciones pertenecientes a un grado.';

CREATE TABLE estudiante (
    estudiante_id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- Identificador operativo seudónimo. No debe contener nombre, DNI ni código institucional legible.
    token_estudiante      VARCHAR(40) NOT NULL UNIQUE,
    estado                ENUM('ACTIVO','INACTIVO','RETIRADO') NOT NULL DEFAULT 'ACTIVO',
    creado_en             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Representación seudonimizada del estudiante usada por el prototipo.';

CREATE TABLE docente (
    docente_id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token_docente         VARCHAR(40) NOT NULL UNIQUE,
    estado                ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    creado_en             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Representación seudonimizada del docente usada por el prototipo.';

CREATE TABLE usuario (
    usuario_id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username              VARCHAR(80) NOT NULL UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    docente_id            BIGINT UNSIGNED NULL,
    estado                ENUM('ACTIVO','BLOQUEADO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    ultimo_acceso_en      DATETIME NULL,
    creado_en             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_docente FOREIGN KEY (docente_id)
        REFERENCES docente(docente_id)
) ENGINE=InnoDB COMMENT='Usuarios autenticados del prototipo. No almacenar contraseñas en texto plano.';

CREATE TABLE rol (
    rol_id                SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo                VARCHAR(40) NOT NULL UNIQUE,
    nombre                VARCHAR(80) NOT NULL,
    descripcion           VARCHAR(255) NULL
) ENGINE=InnoDB COMMENT='Roles para control de acceso basado en roles (RBAC).';

CREATE TABLE usuario_rol (
    usuario_id            BIGINT UNSIGNED NOT NULL,
    rol_id                SMALLINT UNSIGNED NOT NULL,
    asignado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, rol_id),
    CONSTRAINT fk_ur_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(usuario_id),
    CONSTRAINT fk_ur_rol FOREIGN KEY (rol_id) REFERENCES rol(rol_id)
) ENGINE=InnoDB COMMENT='Relación N:M entre usuarios y roles.';

CREATE TABLE matricula (
    matricula_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    estudiante_id         BIGINT UNSIGNED NOT NULL,
    periodo_id            BIGINT UNSIGNED NOT NULL,
    seccion_id            BIGINT UNSIGNED NOT NULL,
    estado                ENUM('VIGENTE','RETIRADA','TRASLADADA','CERRADA') NOT NULL DEFAULT 'VIGENTE',
    fecha_matricula       DATE NULL,
    CONSTRAINT uq_matricula UNIQUE (estudiante_id, periodo_id),
    CONSTRAINT fk_matricula_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiante(estudiante_id),
    CONSTRAINT fk_matricula_periodo FOREIGN KEY (periodo_id) REFERENCES periodo_academico(periodo_id),
    CONSTRAINT fk_matricula_seccion FOREIGN KEY (seccion_id) REFERENCES seccion(seccion_id)
) ENGINE=InnoDB COMMENT='Vincula estudiante, periodo y sección.';

CREATE TABLE asignacion_docente (
    asignacion_id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    docente_id            BIGINT UNSIGNED NOT NULL,
    area_id               BIGINT UNSIGNED NOT NULL,
    seccion_id            BIGINT UNSIGNED NOT NULL,
    periodo_id            BIGINT UNSIGNED NOT NULL,
    estado                ENUM('ACTIVA','FINALIZADA') NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT uq_asignacion UNIQUE (docente_id, area_id, seccion_id, periodo_id),
    CONSTRAINT fk_asig_docente FOREIGN KEY (docente_id) REFERENCES docente(docente_id),
    CONSTRAINT fk_asig_area FOREIGN KEY (area_id) REFERENCES area_curricular(area_id),
    CONSTRAINT fk_asig_seccion FOREIGN KEY (seccion_id) REFERENCES seccion(seccion_id),
    CONSTRAINT fk_asig_periodo FOREIGN KEY (periodo_id) REFERENCES periodo_academico(periodo_id)
) ENGINE=InnoDB COMMENT='Docente responsable de un área por sección y periodo.';

CREATE TABLE tipo_actividad (
    tipo_actividad_id     SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo                VARCHAR(30) NOT NULL UNIQUE,
    nombre                VARCHAR(80) NOT NULL,
    descripcion           VARCHAR(255) NULL
) ENGINE=InnoDB COMMENT='Tipos de actividad microcurricular: práctica, examen, tarea, informe, proyecto, etc.';

CREATE TABLE actividad_academica (
    actividad_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    asignacion_id         BIGINT UNSIGNED NOT NULL,
    tipo_actividad_id     SMALLINT UNSIGNED NOT NULL,
    codigo                VARCHAR(40) NOT NULL,
    titulo                VARCHAR(180) NOT NULL,
    descripcion           TEXT NULL,
    fecha_actividad       DATE NOT NULL,
    puntaje_maximo        DECIMAL(6,2) NOT NULL DEFAULT 20.00,
    estado                ENUM('BORRADOR','PUBLICADA','CERRADA','ANULADA') NOT NULL DEFAULT 'PUBLICADA',
    creado_por            BIGINT UNSIGNED NOT NULL,
    creado_en             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_actividad UNIQUE (asignacion_id, codigo),
    CONSTRAINT chk_puntaje_max CHECK (puntaje_maximo > 0),
    CONSTRAINT fk_act_asig FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(asignacion_id),
    CONSTRAINT fk_act_tipo FOREIGN KEY (tipo_actividad_id) REFERENCES tipo_actividad(tipo_actividad_id),
    CONSTRAINT fk_act_usuario FOREIGN KEY (creado_por) REFERENCES usuario(usuario_id)
) ENGINE=InnoDB COMMENT='Actividad o evaluación individual que forma parte de la trazabilidad microcurricular.';

CREATE TABLE resultado_academico (
    resultado_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    matricula_id          BIGINT UNSIGNED NOT NULL,
    actividad_id          BIGINT UNSIGNED NOT NULL,
    version_actual        INT UNSIGNED NOT NULL DEFAULT 1,
    puntaje_obtenido      DECIMAL(6,2) NULL,
    estado                ENUM('VIGENTE','RECTIFICADO','REVOCADO') NOT NULL DEFAULT 'VIGENTE',
    registrado_por        BIGINT UNSIGNED NOT NULL,
    registrado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_resultado UNIQUE (matricula_id, actividad_id),
    CONSTRAINT chk_puntaje_resultado CHECK (puntaje_obtenido IS NULL OR puntaje_obtenido >= 0),
    CONSTRAINT fk_res_matricula FOREIGN KEY (matricula_id) REFERENCES matricula(matricula_id),
    CONSTRAINT fk_res_actividad FOREIGN KEY (actividad_id) REFERENCES actividad_academica(actividad_id),
    CONSTRAINT fk_res_usuario FOREIGN KEY (registrado_por) REFERENCES usuario(usuario_id)
) ENGINE=InnoDB COMMENT='Resultado académico detallado. Permanece Off-chain.';

CREATE TABLE historial_resultado (
    historial_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resultado_id          BIGINT UNSIGNED NOT NULL,
    version               INT UNSIGNED NOT NULL,
    puntaje_anterior      DECIMAL(6,2) NULL,
    puntaje_nuevo         DECIMAL(6,2) NULL,
    tipo_cambio           ENUM('CREACION','RECTIFICACION','REVOCACION','RESTAURACION') NOT NULL,
    motivo_codigo         VARCHAR(40) NULL,
    motivo_detalle        VARCHAR(500) NULL,
    realizado_por         BIGINT UNSIGNED NOT NULL,
    realizado_en          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_historial_version UNIQUE (resultado_id, version),
    CONSTRAINT fk_hist_resultado FOREIGN KEY (resultado_id) REFERENCES resultado_academico(resultado_id),
    CONSTRAINT fk_hist_usuario FOREIGN KEY (realizado_por) REFERENCES usuario(usuario_id)
) ENGINE=InnoDB COMMENT='Historial detallado de cambios; sirve como respaldo operativo Off-chain.';

CREATE TABLE asistencia (
    asistencia_id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    matricula_id          BIGINT UNSIGNED NOT NULL,
    asignacion_id         BIGINT UNSIGNED NOT NULL,
    fecha                 DATE NOT NULL,
    estado                ENUM('PRESENTE','TARDANZA','FALTA','JUSTIFICADA') NOT NULL,
    registrado_por        BIGINT UNSIGNED NOT NULL,
    registrado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asistencia UNIQUE (matricula_id, asignacion_id, fecha),
    CONSTRAINT fk_asis_matricula FOREIGN KEY (matricula_id) REFERENCES matricula(matricula_id),
    CONSTRAINT fk_asis_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignacion_docente(asignacion_id),
    CONSTRAINT fk_asis_usuario FOREIGN KEY (registrado_por) REFERENCES usuario(usuario_id)
) ENGINE=InnoDB COMMENT='Registro complementario para trazabilidad microcurricular.';

CREATE TABLE evento_trazabilidad (
    evento_id             CHAR(36) PRIMARY KEY COMMENT 'UUID generado por el middleware.',
    objeto_tipo           ENUM('RESULTADO','ACTIVIDAD','ASISTENCIA') NOT NULL,
    objeto_ref            VARCHAR(80) NOT NULL COMMENT 'Referencia seudónima/código técnico, nunca nombre o DNI.',
    evento_tipo           ENUM('CREACION','ACTUALIZACION','RECTIFICACION','VERIFICACION','REVOCACION') NOT NULL,
    version               INT UNSIGNED NOT NULL,
    actor_usuario_id      BIGINT UNSIGNED NOT NULL,
    actor_rol_codigo      VARCHAR(40) NOT NULL,
    compromiso_hmac       CHAR(64) NOT NULL COMMENT 'HMAC-SHA-256 del payload canónico; la clave permanece fuera de la blockchain.',
    compromiso_anterior   CHAR(64) NULL,
    estado_evento         ENUM('PENDIENTE','CONFIRMADO','ERROR') NOT NULL DEFAULT 'PENDIENTE',
    creado_en             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evt_usuario FOREIGN KEY (actor_usuario_id) REFERENCES usuario(usuario_id),
    INDEX idx_evt_objeto (objeto_tipo, objeto_ref, version),
    INDEX idx_evt_fecha (creado_en)
) ENGINE=InnoDB COMMENT='Cola/registro local de eventos destinados a blockchain.';

CREATE TABLE evidencia_blockchain (
    evidencia_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    evento_id             CHAR(36) NOT NULL UNIQUE,
    red                   VARCHAR(80) NOT NULL DEFAULT 'fabric-nuevo-horizonte',
    canal                 VARCHAR(80) NOT NULL DEFAULT 'academico-channel',
    chaincode             VARCHAR(80) NOT NULL DEFAULT 'trazabilidad-cc',
    tx_id                 VARCHAR(160) NOT NULL UNIQUE,
    block_number          BIGINT UNSIGNED NULL,
    committed_at          DATETIME NULL,
    validacion            ENUM('VALIDA','INVALIDA','PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT fk_evidencia_evento FOREIGN KEY (evento_id) REFERENCES evento_trazabilidad(evento_id)
) ENGINE=InnoDB COMMENT='Referencia local a la transacción confirmada en Hyperledger Fabric.';

-- Índices orientados a consultas frecuentes
CREATE INDEX idx_resultado_actividad ON resultado_academico (actividad_id, estado);
CREATE INDEX idx_resultado_matricula ON resultado_academico (matricula_id, estado);
CREATE INDEX idx_actividad_fecha ON actividad_academica (fecha_actividad, estado);
CREATE INDEX idx_historial_fecha ON historial_resultado (realizado_en);
CREATE INDEX idx_asistencia_fecha ON asistencia (fecha, estado);

-- Vista operativa para trazabilidad de resultados académicos
CREATE OR REPLACE VIEW vw_trazabilidad_resultado AS
SELECT
    r.resultado_id,
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
   AND et.objeto_ref = CONCAT('RES-', r.resultado_id)
   AND et.version = r.version_actual
LEFT JOIN evidencia_blockchain eb ON eb.evento_id = et.evento_id;

-- Catálogos mínimos del prototipo
INSERT INTO institucion (codigo, nombre, ciudad)
VALUES ('NH-JUL', 'Institución Educativa Nuevo Horizonte', 'Juliaca');

INSERT INTO rol (codigo, nombre, descripcion) VALUES
('ADMIN', 'Administrador', 'Gestiona usuarios, catálogos y configuración del prototipo.'),
('DOCENTE', 'Docente', 'Registra y consulta actividades y resultados de sus asignaciones.'),
('AUDITOR', 'Auditor', 'Consulta trazabilidad y verifica evidencia de integridad.');

INSERT INTO tipo_actividad (codigo, nombre, descripcion) VALUES
('PRACTICA', 'Práctica calificada', 'Actividad práctica con resultado cuantificable.'),
('EXAMEN', 'Examen', 'Evaluación escrita u oral.'),
('TAREA', 'Tarea', 'Actividad asignada fuera o dentro del aula.'),
('INFORME', 'Informe', 'Producto escrito evaluable.'),
('PROYECTO', 'Proyecto', 'Producto o trabajo de mayor alcance.'),
('PARTICIPACION', 'Participación', 'Registro de participación académica.');

-- Recomendación de seguridad:
-- La correspondencia entre token_estudiante y la identidad real NO debe almacenarse en esta base de datos
-- de investigación. Debe permanecer bajo custodia institucional separada y con acceso restringido.
