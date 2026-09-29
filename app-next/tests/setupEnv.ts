import { config } from 'dotenv';

// Las pruebas de integración usan la configuración real (.env): MySQL, Fabric y el HMAC_SECRET
// con el que se anclaron las evidencias. Deben cargarse antes de los valores por defecto.
if (process.env.RUN_INTEGRATION === '1') config();

// Valores deterministas solo para pruebas unitarias. No son secretos reales.
process.env.HMAC_SECRET ??= 'test-secret-hmac-0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL ??= 'mysql://root:test@localhost:3306/trazabilidad_test';
