/**
 * Logger mínimo sobre console. Redacta campos sensibles (secretos, claves, certificados)
 * y nunca debe recibir datos personales completos.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_KEY = /secret|password|passwd|private|key|cert|token|credential/i;

function currentLevel(): Level {
  const value = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return value in LEVEL_WEIGHT ? (value as Level) : 'info';
}

export function redact(context: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTADO]' : value]),
  );
}

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[currentLevel()]) return;
  const suffix =
    context && Object.keys(context).length > 0 ? ` ${JSON.stringify(redact(context), bigintReplacer)}` : '';
  const line = `[${level.toUpperCase()}] ${message}${suffix}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};

export type Logger = typeof logger;
