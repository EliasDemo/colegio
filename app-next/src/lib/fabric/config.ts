import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getFabricEnv } from '@/lib/env/config';
import { FabricError } from './errors';

export interface FabricConfig {
  channelName: string;
  chaincodeName: string;
  mspId: string;
  peerEndpoint: string;
  peerHostAlias: string;
  tlsCertPath: string;
  certPath: string;
  privateKeyPath: string;
}

/** Tiempos máximos (ms) de cada fase de una transacción. */
export const FABRIC_TIMEOUTS = {
  evaluate: 5_000,
  endorse: 15_000,
  submit: 5_000,
  commitStatus: 60_000,
} as const;

const resolveFromCwd = (value: string) => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value));

export function getFabricConfig(): FabricConfig {
  const env = getFabricEnv();
  return {
    channelName: env.FABRIC_CHANNEL_NAME,
    chaincodeName: env.FABRIC_CHAINCODE_NAME,
    mspId: env.FABRIC_MSP_ID,
    peerEndpoint: env.FABRIC_PEER_ENDPOINT,
    peerHostAlias: env.FABRIC_PEER_HOST_ALIAS,
    tlsCertPath: resolveFromCwd(env.FABRIC_TLS_CERT_PATH),
    certPath: resolveFromCwd(env.FABRIC_CERT_PATH),
    privateKeyPath: resolveFromCwd(env.FABRIC_PRIVATE_KEY_PATH),
  };
}

/** Lee un archivo de credenciales. FABRIC_PRIVATE_KEY_PATH puede ser el directorio keystore/. */
export async function readCredentialFile(filePath: string, label: string): Promise<Buffer> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isDirectory()) return await fs.readFile(filePath);
    const [first] = (await fs.readdir(filePath)).sort();
    if (!first) throw new Error('directorio vacío');
    return await fs.readFile(path.join(filePath, first));
  } catch (error) {
    throw new FabricError(
      'IDENTITY_INVALID',
      `No se pudo leer ${label}. Verifique que la red Fabric fue generada y la ruta en .env`,
      error,
    );
  }
}
