import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db/prisma';
import { isFabricConfigured } from '@/lib/env/config';
import { fabricAcademicLedger } from '@/lib/fabric/academicLedger';
import { toFabricError } from '@/lib/fabric/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function databaseStatus() {
  try {
    await checkDatabaseConnection();
    return 'connected' as const;
  } catch {
    return 'disconnected' as const;
  }
}

/** Consulta de solo lectura al chaincode; no expone credenciales ni rutas. */
async function fabricStatus() {
  if (!isFabricConfigured()) return { status: 'not-configured' as const };
  try {
    await fabricAcademicLedger.evidenceExists('EVD-REG-000000-V1');
    return {
      status: 'connected' as const,
      channel: process.env.FABRIC_CHANNEL_NAME,
      chaincode: process.env.FABRIC_CHAINCODE_NAME,
    };
  } catch (error) {
    return { status: 'unavailable' as const, reason: toFabricError(error).code };
  }
}

export async function GET() {
  const [database, fabric] = await Promise.all([databaseStatus(), fabricStatus()]);
  const healthy = database === 'connected';
  return NextResponse.json(
    { status: healthy ? 'ok' : 'error', database, fabric, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
