import 'server-only';
import { PrismaClient } from '@prisma/client';

// En desarrollo Next.js recarga módulos; se reutiliza una sola instancia para no agotar conexiones.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function checkDatabaseConnection(): Promise<boolean> {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
