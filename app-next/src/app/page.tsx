export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 16px' }}>
      <p style={{ margin: 0, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: '#5b6b7c' }}>
        Hito 3 · Grupo 7
      </p>
      <h1 style={{ margin: '8px 0 4px', fontSize: 30 }}>Prototipo de trazabilidad académica</h1>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#34495e' }}>I.E. Nuevo Horizonte</h2>
      <p style={{ marginTop: 24, lineHeight: 1.6 }}>
        Arquitectura híbrida: los registros académicos se almacenan Off-chain en MySQL 8 y su evidencia
        criptográfica (HMAC-SHA-256) se ancla en Hyperledger Fabric, canal <code>academicchannel</code>.
      </p>
      <p style={{ lineHeight: 1.6 }}>
        Estado de los servicios: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}
