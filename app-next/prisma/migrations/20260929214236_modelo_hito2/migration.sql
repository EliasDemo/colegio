-- CreateTable
CREATE TABLE `institucion` (
    `institucion_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(180) NOT NULL,
    `ciudad` VARCHAR(100) NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `institucion_codigo_key`(`codigo`),
    PRIMARY KEY (`institucion_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periodo_academico` (
    `periodo_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `institucion_id` BIGINT UNSIGNED NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `estado` ENUM('PLANIFICADO', 'ABIERTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',

    UNIQUE INDEX `uq_periodo`(`institucion_id`, `codigo`),
    PRIMARY KEY (`periodo_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `area_curricular` (
    `area_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `institucion_id` BIGINT UNSIGNED NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(120) NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',

    UNIQUE INDEX `uq_area`(`institucion_id`, `codigo`),
    PRIMARY KEY (`area_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grado` (
    `grado_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `institucion_id` BIGINT UNSIGNED NOT NULL,
    `nivel` VARCHAR(40) NOT NULL DEFAULT 'SECUNDARIA',
    `numero` TINYINT UNSIGNED NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,

    UNIQUE INDEX `uq_grado`(`institucion_id`, `nivel`, `numero`),
    PRIMARY KEY (`grado_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seccion` (
    `seccion_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `grado_id` BIGINT UNSIGNED NOT NULL,
    `codigo` VARCHAR(10) NOT NULL,
    `nombre` VARCHAR(40) NULL,

    UNIQUE INDEX `uq_seccion`(`grado_id`, `codigo`),
    PRIMARY KEY (`seccion_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estudiante` (
    `estudiante_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `token_estudiante` VARCHAR(40) NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO', 'RETIRADO') NOT NULL DEFAULT 'ACTIVO',
    `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `estudiante_token_estudiante_key`(`token_estudiante`),
    PRIMARY KEY (`estudiante_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `docente` (
    `docente_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `token_docente` VARCHAR(40) NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `docente_token_docente_key`(`token_docente`),
    PRIMARY KEY (`docente_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `usuario_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(80) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `docente_id` BIGINT UNSIGNED NULL,
    `estado` ENUM('ACTIVO', 'BLOQUEADO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `ultimo_acceso_en` DATETIME(0) NULL,
    `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `usuario_username_key`(`username`),
    PRIMARY KEY (`usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rol` (
    `rol_id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(40) NOT NULL,
    `nombre` VARCHAR(80) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `rol_codigo_key`(`codigo`),
    PRIMARY KEY (`rol_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario_rol` (
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `rol_id` SMALLINT UNSIGNED NOT NULL,
    `asignado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`usuario_id`, `rol_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matricula` (
    `matricula_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `estudiante_id` BIGINT UNSIGNED NOT NULL,
    `periodo_id` BIGINT UNSIGNED NOT NULL,
    `seccion_id` BIGINT UNSIGNED NOT NULL,
    `estado` ENUM('VIGENTE', 'RETIRADA', 'TRASLADADA', 'CERRADA') NOT NULL DEFAULT 'VIGENTE',
    `fecha_matricula` DATE NULL,

    UNIQUE INDEX `uq_matricula`(`estudiante_id`, `periodo_id`),
    PRIMARY KEY (`matricula_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asignacion_docente` (
    `asignacion_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `docente_id` BIGINT UNSIGNED NOT NULL,
    `area_id` BIGINT UNSIGNED NOT NULL,
    `seccion_id` BIGINT UNSIGNED NOT NULL,
    `periodo_id` BIGINT UNSIGNED NOT NULL,
    `estado` ENUM('ACTIVA', 'FINALIZADA') NOT NULL DEFAULT 'ACTIVA',

    UNIQUE INDEX `uq_asignacion`(`docente_id`, `area_id`, `seccion_id`, `periodo_id`),
    PRIMARY KEY (`asignacion_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipo_actividad` (
    `tipo_actividad_id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(80) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `tipo_actividad_codigo_key`(`codigo`),
    PRIMARY KEY (`tipo_actividad_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `actividad_academica` (
    `actividad_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `asignacion_id` BIGINT UNSIGNED NOT NULL,
    `tipo_actividad_id` SMALLINT UNSIGNED NOT NULL,
    `codigo` VARCHAR(40) NOT NULL,
    `titulo` VARCHAR(180) NOT NULL,
    `descripcion` TEXT NULL,
    `fecha_actividad` DATE NOT NULL,
    `puntaje_maximo` DECIMAL(6, 2) NOT NULL DEFAULT 20.00,
    `estado` ENUM('BORRADOR', 'PUBLICADA', 'CERRADA', 'ANULADA') NOT NULL DEFAULT 'PUBLICADA',
    `creado_por` BIGINT UNSIGNED NOT NULL,
    `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_actividad_fecha`(`fecha_actividad`, `estado`),
    UNIQUE INDEX `uq_actividad`(`asignacion_id`, `codigo`),
    PRIMARY KEY (`actividad_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resultado_academico` (
    `resultado_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(20) NOT NULL,
    `matricula_id` BIGINT UNSIGNED NOT NULL,
    `actividad_id` BIGINT UNSIGNED NOT NULL,
    `version_actual` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `puntaje_obtenido` DECIMAL(6, 2) NULL,
    `estado` ENUM('VIGENTE', 'RECTIFICADO', 'REVOCADO') NOT NULL DEFAULT 'VIGENTE',
    `registrado_por` BIGINT UNSIGNED NOT NULL,
    `registrado_en` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `actualizado_en` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `resultado_academico_codigo_key`(`codigo`),
    INDEX `idx_resultado_actividad`(`actividad_id`, `estado`),
    INDEX `idx_resultado_matricula`(`matricula_id`, `estado`),
    UNIQUE INDEX `uq_resultado`(`matricula_id`, `actividad_id`),
    PRIMARY KEY (`resultado_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_resultado` (
    `historial_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `resultado_id` BIGINT UNSIGNED NOT NULL,
    `version` INTEGER UNSIGNED NOT NULL,
    `puntaje_anterior` DECIMAL(6, 2) NULL,
    `puntaje_nuevo` DECIMAL(6, 2) NULL,
    `tipo_cambio` ENUM('CREACION', 'RECTIFICACION', 'REVOCACION', 'RESTAURACION') NOT NULL,
    `motivo_codigo` VARCHAR(40) NULL,
    `motivo_detalle` VARCHAR(500) NULL,
    `realizado_por` BIGINT UNSIGNED NOT NULL,
    `realizado_en` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_historial_fecha`(`realizado_en`),
    UNIQUE INDEX `uq_historial_version`(`resultado_id`, `version`),
    PRIMARY KEY (`historial_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asistencia` (
    `asistencia_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `matricula_id` BIGINT UNSIGNED NOT NULL,
    `asignacion_id` BIGINT UNSIGNED NOT NULL,
    `fecha` DATE NOT NULL,
    `estado` ENUM('PRESENTE', 'TARDANZA', 'FALTA', 'JUSTIFICADA') NOT NULL,
    `registrado_por` BIGINT UNSIGNED NOT NULL,
    `registrado_en` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_asistencia_fecha`(`fecha`, `estado`),
    UNIQUE INDEX `uq_asistencia`(`matricula_id`, `asignacion_id`, `fecha`),
    PRIMARY KEY (`asistencia_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evento_trazabilidad` (
    `evento_id` CHAR(36) NOT NULL,
    `objeto_tipo` ENUM('RESULTADO', 'ACTIVIDAD', 'ASISTENCIA') NOT NULL,
    `objeto_ref` VARCHAR(80) NOT NULL,
    `evento_tipo` ENUM('CREACION', 'ACTUALIZACION', 'RECTIFICACION', 'VERIFICACION', 'REVOCACION') NOT NULL,
    `version` INTEGER UNSIGNED NOT NULL,
    `actor_usuario_id` BIGINT UNSIGNED NOT NULL,
    `actor_rol_codigo` VARCHAR(40) NOT NULL,
    `compromiso_hmac` CHAR(64) NOT NULL,
    `compromiso_anterior` CHAR(64) NULL,
    `estado_evento` ENUM('PENDIENTE', 'CONFIRMADO', 'ERROR') NOT NULL DEFAULT 'PENDIENTE',
    `resultado_verificacion` ENUM('INTEGRO', 'ALTERADO', 'NO_VERIFICABLE') NULL,
    `error_detalle` VARCHAR(500) NULL,
    `creado_en` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_evt_objeto`(`objeto_tipo`, `objeto_ref`, `version`),
    INDEX `idx_evt_fecha`(`creado_en`),
    PRIMARY KEY (`evento_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evidencia_blockchain` (
    `evidencia_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `evento_id` CHAR(36) NOT NULL,
    `red` VARCHAR(80) NOT NULL DEFAULT 'fabric-academic',
    `canal` VARCHAR(80) NOT NULL DEFAULT 'academicchannel',
    `chaincode` VARCHAR(80) NOT NULL DEFAULT 'academic-traceability',
    `tx_id` VARCHAR(160) NOT NULL,
    `block_number` BIGINT UNSIGNED NULL,
    `committed_at` DATETIME(0) NULL,
    `validacion` ENUM('VALIDA', 'INVALIDA', 'PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',

    UNIQUE INDEX `evidencia_blockchain_evento_id_key`(`evento_id`),
    UNIQUE INDEX `evidencia_blockchain_tx_id_key`(`tx_id`),
    PRIMARY KEY (`evidencia_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `periodo_academico` ADD CONSTRAINT `fk_periodo_institucion` FOREIGN KEY (`institucion_id`) REFERENCES `institucion`(`institucion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `area_curricular` ADD CONSTRAINT `fk_area_institucion` FOREIGN KEY (`institucion_id`) REFERENCES `institucion`(`institucion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grado` ADD CONSTRAINT `fk_grado_institucion` FOREIGN KEY (`institucion_id`) REFERENCES `institucion`(`institucion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seccion` ADD CONSTRAINT `fk_seccion_grado` FOREIGN KEY (`grado_id`) REFERENCES `grado`(`grado_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `fk_usuario_docente` FOREIGN KEY (`docente_id`) REFERENCES `docente`(`docente_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_rol` ADD CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario_rol` ADD CONSTRAINT `fk_ur_rol` FOREIGN KEY (`rol_id`) REFERENCES `rol`(`rol_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matricula` ADD CONSTRAINT `fk_matricula_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiante`(`estudiante_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matricula` ADD CONSTRAINT `fk_matricula_periodo` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_academico`(`periodo_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matricula` ADD CONSTRAINT `fk_matricula_seccion` FOREIGN KEY (`seccion_id`) REFERENCES `seccion`(`seccion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignacion_docente` ADD CONSTRAINT `fk_asig_docente` FOREIGN KEY (`docente_id`) REFERENCES `docente`(`docente_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignacion_docente` ADD CONSTRAINT `fk_asig_area` FOREIGN KEY (`area_id`) REFERENCES `area_curricular`(`area_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignacion_docente` ADD CONSTRAINT `fk_asig_seccion` FOREIGN KEY (`seccion_id`) REFERENCES `seccion`(`seccion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignacion_docente` ADD CONSTRAINT `fk_asig_periodo` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_academico`(`periodo_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actividad_academica` ADD CONSTRAINT `fk_act_asig` FOREIGN KEY (`asignacion_id`) REFERENCES `asignacion_docente`(`asignacion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actividad_academica` ADD CONSTRAINT `fk_act_tipo` FOREIGN KEY (`tipo_actividad_id`) REFERENCES `tipo_actividad`(`tipo_actividad_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actividad_academica` ADD CONSTRAINT `fk_act_usuario` FOREIGN KEY (`creado_por`) REFERENCES `usuario`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultado_academico` ADD CONSTRAINT `fk_res_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matricula`(`matricula_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultado_academico` ADD CONSTRAINT `fk_res_actividad` FOREIGN KEY (`actividad_id`) REFERENCES `actividad_academica`(`actividad_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultado_academico` ADD CONSTRAINT `fk_res_usuario` FOREIGN KEY (`registrado_por`) REFERENCES `usuario`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_resultado` ADD CONSTRAINT `fk_hist_resultado` FOREIGN KEY (`resultado_id`) REFERENCES `resultado_academico`(`resultado_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_resultado` ADD CONSTRAINT `fk_hist_usuario` FOREIGN KEY (`realizado_por`) REFERENCES `usuario`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencia` ADD CONSTRAINT `fk_asis_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matricula`(`matricula_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencia` ADD CONSTRAINT `fk_asis_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `asignacion_docente`(`asignacion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencia` ADD CONSTRAINT `fk_asis_usuario` FOREIGN KEY (`registrado_por`) REFERENCES `usuario`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento_trazabilidad` ADD CONSTRAINT `fk_evt_usuario` FOREIGN KEY (`actor_usuario_id`) REFERENCES `usuario`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencia_blockchain` ADD CONSTRAINT `fk_evidencia_evento` FOREIGN KEY (`evento_id`) REFERENCES `evento_trazabilidad`(`evento_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
