-- CreateTable
CREATE TABLE `institution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `city` VARCHAR(80) NOT NULL,
    `region` VARCHAR(80) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `institution_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_period` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institution_id` INTEGER NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `academic_year` INTEGER NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,

    UNIQUE INDEX `academic_period_code_key`(`code`),
    INDEX `academic_period_academic_year_idx`(`academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grade` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institution_id` INTEGER NOT NULL,
    `level` VARCHAR(20) NOT NULL,
    `number` TINYINT NOT NULL,
    `name` VARCHAR(40) NOT NULL,

    UNIQUE INDEX `grade_institution_id_level_number_key`(`institution_id`, `level`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `section` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grade_id` INTEGER NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `letter` CHAR(1) NOT NULL,
    `academic_year` INTEGER NOT NULL,

    UNIQUE INDEX `section_code_key`(`code`),
    UNIQUE INDEX `section_grade_id_letter_academic_year_key`(`grade_id`, `letter`, `academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institution_id` INTEGER NOT NULL,
    `pseudonym_code` VARCHAR(20) NOT NULL,
    `status` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `student_pseudonym_code_key`(`pseudonym_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_identity` (
    `student_id` INTEGER NOT NULL,
    `first_names` VARCHAR(80) NOT NULL,
    `last_names` VARCHAR(80) NOT NULL,
    `document_type` VARCHAR(10) NOT NULL DEFAULT 'DNI',
    `document_number` VARCHAR(15) NOT NULL,
    `birth_date` DATE NOT NULL,

    UNIQUE INDEX `student_identity_document_number_key`(`document_number`),
    PRIMARY KEY (`student_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institution_id` INTEGER NOT NULL,
    `pseudonym_code` VARCHAR(20) NOT NULL,
    `first_names` VARCHAR(80) NOT NULL,
    `last_names` VARCHAR(80) NOT NULL,
    `specialty` VARCHAR(80) NOT NULL,
    `status` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',

    UNIQUE INDEX `teacher_pseudonym_code_key`(`pseudonym_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enrollment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `student_id` INTEGER NOT NULL,
    `section_id` INTEGER NOT NULL,
    `academic_year` INTEGER NOT NULL,
    `enrolled_at` DATE NOT NULL,
    `status` ENUM('MATRICULADO', 'RETIRADO', 'TRASLADADO') NOT NULL DEFAULT 'MATRICULADO',

    UNIQUE INDEX `enrollment_code_key`(`code`),
    INDEX `enrollment_section_id_idx`(`section_id`),
    UNIQUE INDEX `enrollment_student_id_academic_year_key`(`student_id`, `academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `subject_code_key`(`code`),
    UNIQUE INDEX `subject_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching_assignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacher_id` INTEGER NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `section_id` INTEGER NOT NULL,
    `academic_year` INTEGER NOT NULL,

    INDEX `teaching_assignment_teacher_id_idx`(`teacher_id`),
    UNIQUE INDEX `teaching_assignment_subject_id_section_id_academic_year_key`(`subject_id`, `section_id`, `academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_activity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `teaching_assignment_id` INTEGER NOT NULL,
    `period_id` INTEGER NOT NULL,
    `type` ENUM('EVALUACION_DIAGNOSTICA', 'PRACTICA_CALIFICADA', 'EXAMEN_UNIDAD', 'TRABAJO_GRUPAL', 'EXPOSICION', 'PROYECTO', 'EVALUACION_BIMESTRAL', 'ACTIVIDAD_APRENDIZAJE') NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `competency` VARCHAR(150) NOT NULL,
    `scheduled_date` DATE NOT NULL,

    UNIQUE INDEX `academic_activity_code_key`(`code`),
    INDEX `academic_activity_period_id_idx`(`period_id`),
    INDEX `academic_activity_teaching_assignment_id_idx`(`teaching_assignment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_result` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `enrollment_id` INTEGER NOT NULL,
    `activity_id` INTEGER NOT NULL,
    `qualitative_grade` ENUM('AD', 'A', 'B', 'C') NOT NULL,
    `numeric_score` DECIMAL(4, 2) NULL,
    `observation` VARCHAR(255) NULL,
    `recorded_at` DATETIME(3) NOT NULL,
    `recorded_by_teacher_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `academic_result_code_key`(`code`),
    INDEX `academic_result_activity_id_idx`(`activity_id`),
    UNIQUE INDEX `academic_result_enrollment_id_activity_id_key`(`enrollment_id`, `activity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_result_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `result_id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `qualitative_grade` ENUM('AD', 'A', 'B', 'C') NOT NULL,
    `numeric_score` DECIMAL(4, 2) NULL,
    `observation` VARCHAR(255) NULL,
    `recorded_at` DATETIME(3) NOT NULL,
    `change_reason` VARCHAR(255) NOT NULL,
    `changed_by_reference` VARCHAR(20) NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `academic_result_history_result_id_version_key`(`result_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enrollment_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('PRESENTE', 'TARDANZA', 'FALTA', 'FALTA_JUSTIFICADA') NOT NULL,

    UNIQUE INDEX `attendance_enrollment_id_date_key`(`enrollment_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(40) NOT NULL,
    `actor_reference` VARCHAR(20) NOT NULL,
    `role_id` INTEGER NOT NULL,
    `teacher_id` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `app_user_username_key`(`username`),
    UNIQUE INDEX `app_user_actor_reference_key`(`actor_reference`),
    UNIQUE INDEX `app_user_teacher_id_key`(`teacher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blockchain_evidence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `result_id` INTEGER NOT NULL,
    `evidence_id` VARCHAR(40) NOT NULL,
    `version` INTEGER NOT NULL,
    `event_type` ENUM('REGISTRO', 'VERIFICACION', 'RECTIFICACION') NOT NULL,
    `evidence_hash` CHAR(64) NOT NULL,
    `algorithm` VARCHAR(20) NOT NULL DEFAULT 'HMAC-SHA-256',
    `canonical_version` VARCHAR(10) NOT NULL,
    `channel_name` VARCHAR(50) NOT NULL,
    `chaincode_name` VARCHAR(50) NOT NULL,
    `tx_id` CHAR(64) NULL,
    `block_number` BIGINT NULL,
    `status` ENUM('PENDIENTE', 'CONFIRMADO', 'FALLIDO') NOT NULL DEFAULT 'PENDIENTE',
    `error_message` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmed_at` DATETIME(3) NULL,

    UNIQUE INDEX `blockchain_evidence_evidence_id_key`(`evidence_id`),
    UNIQUE INDEX `blockchain_evidence_tx_id_key`(`tx_id`),
    INDEX `blockchain_evidence_status_idx`(`status`),
    UNIQUE INDEX `blockchain_evidence_result_id_version_key`(`result_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `traceability_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `result_id` INTEGER NOT NULL,
    `event_type` ENUM('REGISTRO', 'VERIFICACION', 'RECTIFICACION') NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('PENDIENTE', 'CONFIRMADO', 'INTEGRO', 'ALTERADO', 'FALLIDO') NOT NULL,
    `actor_reference` VARCHAR(20) NOT NULL,
    `actor_role` VARCHAR(30) NOT NULL,
    `evidence_id` VARCHAR(40) NULL,
    `tx_id` CHAR(64) NULL,
    `detail` VARCHAR(500) NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `traceability_event_result_id_occurred_at_idx`(`result_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `academic_period` ADD CONSTRAINT `academic_period_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grade` ADD CONSTRAINT `grade_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `section` ADD CONSTRAINT `section_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `grade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `student_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_identity` ADD CONSTRAINT `student_identity_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher` ADD CONSTRAINT `teacher_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_assignment` ADD CONSTRAINT `teaching_assignment_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_assignment` ADD CONSTRAINT `teaching_assignment_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subject`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_assignment` ADD CONSTRAINT `teaching_assignment_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_activity` ADD CONSTRAINT `academic_activity_teaching_assignment_id_fkey` FOREIGN KEY (`teaching_assignment_id`) REFERENCES `teaching_assignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_activity` ADD CONSTRAINT `academic_activity_period_id_fkey` FOREIGN KEY (`period_id`) REFERENCES `academic_period`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_result` ADD CONSTRAINT `academic_result_enrollment_id_fkey` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_result` ADD CONSTRAINT `academic_result_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `academic_activity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_result` ADD CONSTRAINT `academic_result_recorded_by_teacher_id_fkey` FOREIGN KEY (`recorded_by_teacher_id`) REFERENCES `teacher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_result_history` ADD CONSTRAINT `academic_result_history_result_id_fkey` FOREIGN KEY (`result_id`) REFERENCES `academic_result`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_enrollment_id_fkey` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `app_user` ADD CONSTRAINT `app_user_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `app_user` ADD CONSTRAINT `app_user_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blockchain_evidence` ADD CONSTRAINT `blockchain_evidence_result_id_fkey` FOREIGN KEY (`result_id`) REFERENCES `academic_result`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `traceability_event` ADD CONSTRAINT `traceability_event_result_id_fkey` FOREIGN KEY (`result_id`) REFERENCES `academic_result`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
