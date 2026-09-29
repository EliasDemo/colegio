import 'server-only';
import type { EventoTrazabilidad, EvidenciaBlockchain, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { TraceabilityEventSchema, type TraceabilityEventInput } from '@/schemas/academicRecord.schema';

export type EventoConEvidencia = EventoTrazabilidad & { evidencia: EvidenciaBlockchain | null };

const DATA_EVENTS = ['CREACION', 'RECTIFICACION', 'REVOCACION'] as const;

export function createTraceabilityEventRepository(db: PrismaClient) {
  return {
    /** Crea el evento local en estado PENDIENTE (H2-06, paso 6). */
    createPending(input: TraceabilityEventInput): Promise<EventoTrazabilidad> {
      const data = TraceabilityEventSchema.parse(input);
      return db.eventoTrazabilidad.create({ data: { ...data, estadoEvento: 'PENDIENTE' } });
    },

    /** Reintento: vuelve a PENDIENTE conservando el mismo evento_id (idempotencia). */
    resetToPending(id: string, compromisoHmac: string, compromisoAnterior: string | null): Promise<EventoTrazabilidad> {
      return db.eventoTrazabilidad.update({
        where: { id },
        data: { estadoEvento: 'PENDIENTE', errorDetalle: null, compromisoHmac, compromisoAnterior },
      });
    },

    markError(id: string, detail: string): Promise<EventoTrazabilidad> {
      return db.eventoTrazabilidad.update({ where: { id }, data: { estadoEvento: 'ERROR', errorDetalle: detail.slice(0, 500) } });
    },

    /** Evento que fija la versión indicada del dato (CREACION / RECTIFICACION / REVOCACION). */
    findDataEvent(objetoRef: string, version: number): Promise<EventoConEvidencia | null> {
      return db.eventoTrazabilidad.findFirst({
        where: { objetoTipo: 'RESULTADO', objetoRef, version, eventoTipo: { in: [...DATA_EVENTS] } },
        include: { evidencia: true },
        orderBy: { creadoEn: 'desc' },
      });
    },

    findById(id: string): Promise<EventoConEvidencia | null> {
      return db.eventoTrazabilidad.findUnique({ where: { id }, include: { evidencia: true } });
    },

    listByObject(objetoRef: string): Promise<EventoConEvidencia[]> {
      return db.eventoTrazabilidad.findMany({
        where: { objetoTipo: 'RESULTADO', objetoRef },
        include: { evidencia: true },
        orderBy: [{ creadoEn: 'asc' }, { version: 'asc' }],
      });
    },
  };
}

export type TraceabilityEventRepository = ReturnType<typeof createTraceabilityEventRepository>;

export const traceabilityEventRepository = createTraceabilityEventRepository(prisma);
