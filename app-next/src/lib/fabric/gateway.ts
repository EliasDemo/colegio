import 'server-only';
import { createPrivateKey } from 'node:crypto';
import { connect, hash, signers, type Contract, type Gateway } from '@hyperledger/fabric-gateway';
import { FABRIC_TIMEOUTS, getFabricConfig, readCredentialFile, type FabricConfig } from './config';
import { newGrpcConnection } from './connection';
import { FabricError } from './errors';

const deadline = (ms: number) => () => ({ deadline: Date.now() + ms });

async function openGateway(config: FabricConfig): Promise<{ gateway: Gateway; close: () => void }> {
  const client = await newGrpcConnection(config);
  try {
    const credentials = await readCredentialFile(config.certPath, 'el certificado de identidad');
    const privateKeyPem = await readCredentialFile(config.privateKeyPath, 'la clave privada de identidad');

    let signer;
    try {
      signer = signers.newPrivateKeySigner(createPrivateKey(privateKeyPem));
    } catch (error) {
      throw new FabricError('IDENTITY_INVALID', 'La clave privada de Fabric no tiene un formato válido', error);
    }

    const gateway = connect({
      client,
      identity: { mspId: config.mspId, credentials },
      signer,
      hash: hash.sha256,
      evaluateOptions: deadline(FABRIC_TIMEOUTS.evaluate),
      endorseOptions: deadline(FABRIC_TIMEOUTS.endorse),
      submitOptions: deadline(FABRIC_TIMEOUTS.submit),
      commitStatusOptions: deadline(FABRIC_TIMEOUTS.commitStatus),
    });

    return {
      gateway,
      close: () => {
        gateway.close();
        client.close();
      },
    };
  } catch (error) {
    client.close();
    throw error;
  }
}

/**
 * Abre una conexión al gateway, entrega el contrato del chaincode y cierra la conexión al terminar.
 * Mantener conexiones de corta duración simplifica los scripts y evita fugas en Route Handlers.
 */
export async function withContract<T>(
  operation: (contract: Contract) => Promise<T>,
  config: FabricConfig = getFabricConfig(),
): Promise<T> {
  const { gateway, close } = await openGateway(config);
  try {
    const contract = gateway.getNetwork(config.channelName).getContract(config.chaincodeName);
    return await operation(contract);
  } finally {
    close();
  }
}
