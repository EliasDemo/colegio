import 'server-only';
import * as grpc from '@grpc/grpc-js';
import { readCredentialFile, type FabricConfig } from './config';

/** Crea el canal gRPC con TLS hacia el peer de la organización. */
export async function newGrpcConnection(config: FabricConfig): Promise<grpc.Client> {
  const tlsRootCert = await readCredentialFile(config.tlsCertPath, 'el certificado TLS del peer');
  const credentials = grpc.credentials.createSsl(tlsRootCert);
  return new grpc.Client(config.peerEndpoint, credentials, {
    // El certificado TLS del peer está emitido para su nombre DNS interno, no para localhost.
    'grpc.ssl_target_name_override': config.peerHostAlias,
  });
}
