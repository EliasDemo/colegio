import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Fabric Gateway y gRPC usan módulos nativos de Node: se ejecutan solo en el servidor, sin empaquetar.
  serverExternalPackages: ['@hyperledger/fabric-gateway', '@grpc/grpc-js', '@prisma/client'],
};

export default nextConfig;
