import 'server-only';
import type { PrismaClient, TraceabilityEvent } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { TraceabilityEventSchema, type TraceabilityEventInput } from '@/schemas/academicRecord.schema';

export function createTraceabilityEventRepository(db: PrismaClient) {
  return {
    create(input: TraceabilityEventInput): Promise<TraceabilityEvent> {
      const data = TraceabilityEventSchema.parse(input);
      return db.traceabilityEvent.create({ data });
    },

    listByResult(resultId: number): Promise<TraceabilityEvent[]> {
      return db.traceabilityEvent.findMany({ where: { resultId }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
    },
  };
}

export type TraceabilityEventRepository = ReturnType<typeof createTraceabilityEventRepository>;

export const traceabilityEventRepository = createTraceabilityEventRepository(prisma);
