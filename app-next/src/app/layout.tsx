import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Trazabilidad académica - I.E. Nuevo Horizonte',
  description: 'Prototipo de arquitectura híbrida con Hyperledger Fabric para la trazabilidad microcurricular.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#f5f7fa', color: '#1b2a3a' }}>
        {children}
      </body>
    </html>
  );
}
