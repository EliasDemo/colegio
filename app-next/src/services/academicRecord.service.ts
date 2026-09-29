import 'server-only';
import { academicRecordRepository, type AcademicRecordRepository } from '@/repositories/academicRecord.repository';
import { RecordCodeSchema } from '@/schemas/academicRecord.schema';
import type { AcademicRecordInput, AcademicRecordSummary, AcademicRecordWithRelations } from '@/types/academic';
import { RecordNotFoundError } from './errors';

/** Proyección del registro Off-chain a la entrada de canonicalización (solo referencias seudónimas). */
export function toAcademicRecordInput(record: AcademicRecordWithRelations): AcademicRecordInput {
  return {
    academicRecordId: record.code,
    studentReference: record.enrollment.student.pseudonymCode,
    enrollmentReference: record.enrollment.code,
    sectionReference: record.enrollment.section.code,
    subjectReference: record.activity.teachingAssignment.subject.code,
    activityReference: record.activity.code,
    periodReference: record.activity.period.code,
    teacherReference: record.recordedBy.pseudonymCode,
    qualitativeGrade: record.qualitativeGrade,
    numericScore: record.numericScore === null ? null : record.numericScore.toFixed(2),
    observation: record.observation,
    recordedAt: record.recordedAt,
    version: record.version,
  };
}

export function toAcademicRecordSummary(record: AcademicRecordWithRelations): AcademicRecordSummary {
  return {
    code: record.code,
    studentReference: record.enrollment.student.pseudonymCode,
    activityReference: record.activity.code,
    subjectCode: record.activity.teachingAssignment.subject.code,
    periodCode: record.activity.period.code,
    sectionCode: record.enrollment.section.code,
    version: record.version,
  };
}

export function createAcademicRecordService(repository: AcademicRecordRepository) {
  return {
    async getByCode(code: string): Promise<AcademicRecordWithRelations> {
      const recordCode = RecordCodeSchema.parse(code);
      const record = await repository.findByCode(recordCode);
      if (!record) throw new RecordNotFoundError(recordCode);
      return record;
    },
  };
}

export type AcademicRecordService = ReturnType<typeof createAcademicRecordService>;

export const academicRecordService = createAcademicRecordService(academicRecordRepository);
