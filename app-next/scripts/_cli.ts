import 'dotenv/config';
import { ZodError } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { FabricError } from '@/lib/fabric/errors';

export const LINE = '------------------------------------';

export function header(title: string) {
  console.log(`\n${LINE}\n${title}\n${LINE}\n`);
}

export function requireRecordCode(): string {
  const code = process.argv[2];
  if (!code) {
    console.error('Uso: npm run <script> -- REG-000001');
    process.exit(2);
  }
  return code;
}

export const short = (value: string | null | undefined, size = 16) =>
  value ? `${value.slice(0, size)}...` : '(sin dato)';

/** Ejecuta un script con manejo uniforme de errores y cierre de conexiones. */
export async function runCli(main: () => Promise<void>) {
  try {
    await main();
  } catch (error) {
    console.error('\nPROCESO NO COMPLETADO.');
    if (error instanceof FabricError) {
      console.error(`[${error.code}] ${error.hint}`);
      console.error(`Detalle: ${error.message}`);
    } else if (error instanceof ZodError) {
      console.error(`Datos inválidos: ${error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    } else if (error instanceof Error) {
      console.error(`${error.name}: ${error.message}`);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
