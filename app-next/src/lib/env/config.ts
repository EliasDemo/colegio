import { z } from 'zod';

/**
 * Lectura validada de variables de entorno. Cada grupo se valida al usarse, de modo que
 * un módulo que solo necesita HMAC_SECRET no exige la configuración de Fabric.
 */

const HmacEnvSchema = z.object({
  HMAC_SECRET: z.string().min(32, 'HMAC_SECRET debe tener al menos 32 caracteres'),
});

const FabricEnvSchema = z.object({
  FABRIC_CHANNEL_NAME: z.string().min(1).default('academicchannel'),
  FABRIC_CHAINCODE_NAME: z.string().min(1).default('academic-traceability'),
  FABRIC_MSP_ID: z.string().min(1),
  FABRIC_PEER_ENDPOINT: z.string().min(1),
  FABRIC_PEER_HOST_ALIAS: z.string().min(1),
  FABRIC_TLS_CERT_PATH: z.string().min(1),
  FABRIC_CERT_PATH: z.string().min(1),
  FABRIC_PRIVATE_KEY_PATH: z.string().min(1),
});

const ActorEnvSchema = z.object({
  ACTOR_USERNAME: z.string().min(3).default('admin.prototipo'),
});

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function parse<T extends z.ZodTypeAny>(schema: T, group: string): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const fields = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ConfigurationError(`Configuración ${group} inválida o incompleta (${fields}). Revise el archivo .env`);
  }
  return result.data;
}

export function getHmacSecret(): string {
  return parse(HmacEnvSchema, 'HMAC').HMAC_SECRET;
}

export type FabricEnv = z.infer<typeof FabricEnvSchema>;

export function getFabricEnv(): FabricEnv {
  return parse(FabricEnvSchema, 'Fabric');
}

export function isFabricConfigured(): boolean {
  return FabricEnvSchema.safeParse(process.env).success;
}

/** Usuario del prototipo con el que actúan los scripts (tabla usuario). */
export function getDefaultActorUsername(): string {
  return parse(ActorEnvSchema, 'actor').ACTOR_USERNAME;
}
