import 'server-only';
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { RectificationInput } from '@/schemas/academicRecord.schema';
import type { ResultadoConRelaciones } from '@/types/academic';

/** Relaciones necesarias para canonicalizar un resultado (todas seudonimizadas). */
export const RESULTADO_INCLUDE = {
  matricula: { include: { estudiante: true, periodo: true, seccion: { include: { grado: true } } } },
  actividad: { include: { tipoActividad: true, asignacion: { include: { area: true, docente: true } } } },
  registrador: true,
} satisfies Prisma.ResultadoAcademicoInclude;

export function createAcademicRecordRepository(db: PrismaClient) {
  return {
    findByCode(codigo: string): Promise<ResultadoConRelaciones | null> {
      return db.resultadoAcademico.findUnique({ where: { codigo }, include: RESULTADO_INCLUDE });
    },

    count(): Promise<number> {
      return db.resultadoAcademico.count();
    },

    /**
     * Rectificación autorizada (H2-06 §4): en una transacción MySQL registra el cambio en
     * historial_resultado, incrementa version_actual, adopta el nuevo puntaje y marca el
     * resultado como RECTIFICADO.
     */
    rectify(codigo: string, change: RectificationInput, usuarioId: bigint): Promise<ResultadoConRelaciones> {
      return db.$transaction(async (tx) => {
        const current = await tx.resultadoAcademico.findUniqueOrThrow({ where: { codigo } });
        const nextVersion = current.versionActual + 1;
        await tx.historialResultado.create({
          data: {
            resultadoId: current.id,
            version: nextVersion,
            puntajeAnterior: current.puntajeObtenido,
            puntajeNuevo: new Prisma.Decimal(change.newScore),
            tipoCambio: 'RECTIFICACION',
            motivoCodigo: change.reasonCode,
            motivoDetalle: change.reasonDetail,
            realizadoPor: usuarioId,
          },
        });
        return tx.resultadoAcademico.update({
          where: { id: current.id },
          data: {
            versionActual: nextVersion,
            puntajeObtenido: new Prisma.Decimal(change.newScore),
            estado: 'RECTIFICADO',
          },
          include: RESULTADO_INCLUDE,
        });
      });
    },
  };
}

export type AcademicRecordRepository = ReturnType<typeof createAcademicRecordRepository>;

export const academicRecordRepository = createAcademicRecordRepository(prisma);
