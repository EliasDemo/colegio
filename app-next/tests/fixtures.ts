import { Prisma } from '@prisma/client';
import type { AcademicRecordInput, AcademicRecordWithRelations } from '@/types/academic';

export const TEST_SECRET = 'test-secret-hmac-0123456789abcdef0123456789abcdef';

export function sampleInput(overrides: Partial<AcademicRecordInput> = {}): AcademicRecordInput {
  return {
    academicRecordId: 'REG-000001',
    studentReference: 'EST-PSE-001',
    enrollmentReference: 'MAT-2026-0001',
    sectionReference: '2026-1A',
    subjectReference: 'MAT',
    activityReference: 'ACT-2026-001',
    periodReference: '2026-B2',
    teacherReference: 'DOC-PSE-001',
    qualitativeGrade: 'A',
    numericScore: '15.50',
    observation: null,
    recordedAt: new Date('2026-06-10T20:15:00.000Z'),
    version: 1,
    ...overrides,
  };
}

/** Registro con relaciones, como lo devuelve AcademicRecordRepository.findByCode. */
export function sampleRecord(overrides: Partial<AcademicRecordWithRelations> = {}): AcademicRecordWithRelations {
  const base = {
    id: 1,
    code: 'REG-000001',
    enrollmentId: 1,
    activityId: 1,
    qualitativeGrade: 'A',
    numericScore: new Prisma.Decimal('15.5'),
    observation: null,
    recordedAt: new Date('2026-06-10T20:15:00.000Z'),
    recordedByTeacherId: 1,
    version: 1,
    status: 'ACTIVO',
    updatedAt: new Date('2026-06-10T20:15:00.000Z'),
    enrollment: {
      id: 1,
      code: 'MAT-2026-0001',
      studentId: 1,
      sectionId: 1,
      academicYear: 2026,
      enrolledAt: new Date('2026-03-02'),
      status: 'MATRICULADO',
      student: { id: 1, institutionId: 1, pseudonymCode: 'EST-PSE-001', status: 'ACTIVO', createdAt: new Date() },
      section: { id: 1, gradeId: 1, code: '2026-1A', letter: 'A', academicYear: 2026 },
    },
    activity: {
      id: 1,
      code: 'ACT-2026-001',
      teachingAssignmentId: 1,
      periodId: 1,
      type: 'EVALUACION_DIAGNOSTICA',
      title: 'Evaluación diagnóstica',
      competency: 'Resuelve problemas de cantidad',
      scheduledDate: new Date('2026-06-08'),
      period: { id: 1, institutionId: 1, code: '2026-B2', academicYear: 2026, name: 'II Bimestre 2026', startDate: new Date(), endDate: new Date() },
      teachingAssignment: {
        id: 1,
        teacherId: 1,
        subjectId: 1,
        sectionId: 1,
        academicYear: 2026,
        subject: { id: 1, code: 'MAT', name: 'Matemática' },
      },
    },
    recordedBy: {
      id: 1,
      institutionId: 1,
      pseudonymCode: 'DOC-PSE-001',
      firstNames: 'Docente',
      lastNames: 'De Prueba',
      specialty: 'Matemática',
      status: 'ACTIVO',
    },
  } as AcademicRecordWithRelations;
  return { ...base, ...overrides };
}
