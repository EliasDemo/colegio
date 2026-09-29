import type {
  AcademicActivity,
  AcademicPeriod,
  AcademicResult,
  Enrollment,
  Section,
  Student,
  Subject,
  Teacher,
  TeachingAssignment,
} from '@prisma/client';

/** Registro académico con las relaciones necesarias para construir su forma canónica. */
export type AcademicRecordWithRelations = AcademicResult & {
  enrollment: Enrollment & { student: Student; section: Section };
  activity: AcademicActivity & {
    period: AcademicPeriod;
    teachingAssignment: TeachingAssignment & { subject: Subject };
  };
  recordedBy: Teacher;
};

/**
 * Entrada de la canonicalización. Solo contiene referencias seudónimas y el resultado;
 * nunca nombres, documentos ni otros datos personales.
 */
export interface AcademicRecordInput {
  academicRecordId: string;
  studentReference: string;
  enrollmentReference: string;
  sectionReference: string;
  subjectReference: string;
  activityReference: string;
  periodReference: string;
  teacherReference: string;
  qualitativeGrade: string;
  numericScore: string | number | null;
  observation: string | null;
  recordedAt: Date | string;
  version: number;
}

/** Vista resumida (sin datos personales) que devuelven los servicios. */
export interface AcademicRecordSummary {
  code: string;
  studentReference: string;
  activityReference: string;
  subjectCode: string;
  periodCode: string;
  sectionCode: string;
  version: number;
}
