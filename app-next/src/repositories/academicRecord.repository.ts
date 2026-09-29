import 'server-only';
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { RectificationInput } from '@/schemas/academicRecord.schema';
import type { AcademicRecordWithRelations } from '@/types/academic';

/** Relaciones mínimas para canonicalizar un registro. No incluye student_identity (datos personales). */
export const ACADEMIC_RECORD_INCLUDE = {
  enrollment: { include: { student: true, section: true } },
  activity: { include: { period: true, teachingAssignment: { include: { subject: true } } } },
  recordedBy: true,
} satisfies Prisma.AcademicResultInclude;

export function createAcademicRecordRepository(db: PrismaClient) {
  return {
    findByCode(code: string): Promise<AcademicRecordWithRelations | null> {
      return db.academicResult.findUnique({ where: { code }, include: ACADEMIC_RECORD_INCLUDE });
    },

    count(): Promise<number> {
      return db.academicResult.count();
    },

    /**
     * Rectificación autorizada: guarda la versión vigente en academic_result_history y
     * actualiza el resultado incrementando su versión, todo en una transacción MySQL.
     */
    rectify(code: string, change: RectificationInput, actorReference: string): Promise<AcademicRecordWithRelations> {
      return db.$transaction(async (tx) => {
        const current = await tx.academicResult.findUniqueOrThrow({ where: { code } });
        await tx.academicResultHistory.create({
          data: {
            resultId: current.id,
            version: current.version,
            qualitativeGrade: current.qualitativeGrade,
            numericScore: current.numericScore,
            observation: current.observation,
            recordedAt: current.recordedAt,
            changeReason: change.reason,
            changedByReference: actorReference,
          },
        });
        return tx.academicResult.update({
          where: { id: current.id },
          data: {
            qualitativeGrade: change.qualitativeGrade,
            numericScore: change.numericScore === null ? null : new Prisma.Decimal(change.numericScore),
            recordedAt: new Date(),
            version: { increment: 1 },
          },
          include: ACADEMIC_RECORD_INCLUDE,
        });
      });
    },
  };
}

export type AcademicRecordRepository = ReturnType<typeof createAcademicRecordRepository>;

export const academicRecordRepository = createAcademicRecordRepository(prisma);
