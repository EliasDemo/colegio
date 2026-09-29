/**
 * Seed del prototipo (Hito 3).
 *
 * 1. Datos principales: los 77 registros depurados y seudonimizados del Hito 2
 *    (prisma/data/h2_02_dataset_seudonimizado.json, origen hito2/H2_02_Seudonimizacion_Dataset.xlsx).
 * 2. Complemento de validación: datos SINTÉTICOS, identificables por sus códigos (REG-Vxxx, STU-VAL…,
 *    DOC-VAL…), para alcanzar los volúmenes mínimos que pide el Hito 3 (5 docentes, 8 áreas, 3 secciones,
 *    2 periodos, 15 actividades, 100-200 resultados). No se inventan notas para los estudiantes del Hito 2.
 *
 * Privacidad (RNF-07): no se carga ningún nombre ni documento; solo tokens seudónimos.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient, type TipoCambio } from '@prisma/client';

const prisma = new PrismaClient();

interface H2Registro {
  registro_id: string;
  estudiante_token: string;
  grado: number;
  seccion: string;
  periodo: string;
  area_codigo: string;
  area_nombre: string;
  evaluacion_codigo: string;
  evaluacion_nombre: string;
  tipo_evaluacion: string;
  fecha_evaluacion: string;
  puntaje_maximo: number;
  nota: number | null;
  fecha_registro: string;
  docente_token: string;
  estado: 'VIGENTE' | 'RECTIFICADO' | 'REVOCADO';
}

const dataset = JSON.parse(
  readFileSync(path.join(__dirname, 'data', 'h2_02_dataset_seudonimizado.json'), 'utf8'),
) as { registros: H2Registro[] };

/** PRNG determinista (mulberry32) para el complemento sintético. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(20260929);
const pad = (n: number, size: number) => String(n).padStart(size, '0');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Hash scrypt de una contraseña aleatoria: la cuenta existe pero no puede iniciar sesión hasta el Hito 5. */
function disabledPasswordHash(): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(randomBytes(32), salt, 32).toString('hex')}`;
}

const AREAS: Array<[string, string, 'H2' | 'VAL']> = [
  ['MAT', 'Matemática', 'H2'],
  ['COM', 'Comunicación', 'H2'],
  ['CTA', 'Ciencia y Tecnología', 'H2'],
  ['CCSS', 'Ciencias Sociales', 'H2'],
  ['ING', 'Inglés', 'VAL'],
  ['EPT', 'Educación para el Trabajo', 'VAL'],
  ['DPCC', 'Desarrollo Personal, Ciudadanía y Cívica', 'VAL'],
  ['AYC', 'Arte y Cultura', 'VAL'],
];

/** Catálogo del Hito 2 + TRABAJO (presente en el dataset H2_02, ausente en el catálogo H2_04). */
const TIPOS: Array<[string, string, string]> = [
  ['PRACTICA', 'Práctica calificada', 'Actividad práctica con resultado cuantificable.'],
  ['EXAMEN', 'Examen', 'Evaluación escrita u oral.'],
  ['TAREA', 'Tarea', 'Actividad asignada fuera o dentro del aula.'],
  ['INFORME', 'Informe', 'Producto escrito evaluable.'],
  ['PROYECTO', 'Proyecto', 'Producto o trabajo de mayor alcance.'],
  ['PARTICIPACION', 'Participación', 'Registro de participación académica.'],
  ['TRABAJO', 'Trabajo', 'Trabajo evaluable (tipo presente en el dataset H2_02).'],
];

/** Complemento sintético: sección 3.º C, 10 estudiantes, docente DOC-VAL…, 7 actividades. */
const VAL_STUDENTS = Array.from({ length: 10 }, (_, i) => `STU-VAL${pad(i + 1, 13)}`);
const VAL_TEACHER = `DOC-VAL${pad(1, 13)}`;
const VAL_ACTIVITIES: Array<{ periodo: string; area: string; codigo: string; titulo: string; tipo: string; fecha: string }> = [
  { periodo: '2026-B2', area: 'ING', codigo: 'EV-ING-3C1', titulo: 'Reading comprehension: Lake Titicaca', tipo: 'EXAMEN', fecha: '2026-06-09' },
  { periodo: '2026-B2', area: 'EPT', codigo: 'EV-EPT-3C1', titulo: 'Proyecto de emprendimiento textil', tipo: 'PROYECTO', fecha: '2026-06-16' },
  { periodo: '2026-B2', area: 'DPCC', codigo: 'EV-DPCC-3C1', titulo: 'Debate sobre convivencia escolar', tipo: 'PARTICIPACION', fecha: '2026-06-23' },
  { periodo: '2026-B2', area: 'AYC', codigo: 'EV-AYC-3C1', titulo: 'Muestra de danzas del altiplano', tipo: 'TRABAJO', fecha: '2026-07-07' },
  { periodo: '2026-B3', area: 'ING', codigo: 'EV-ING-3C2', titulo: 'Oral presentation: my community', tipo: 'EXAMEN', fecha: '2026-09-08' },
  { periodo: '2026-B3', area: 'EPT', codigo: 'EV-EPT-3C2', titulo: 'Plan de negocio para la feria de Juliaca', tipo: 'TAREA', fecha: '2026-09-10' },
  { periodo: '2026-B3', area: 'DPCC', codigo: 'EV-DPCC-3C2', titulo: 'Práctica calificada de derechos ciudadanos', tipo: 'PRACTICA', fecha: '2026-09-15' },
];

async function clearDatabase() {
  await prisma.evidenciaBlockchain.deleteMany();
  await prisma.eventoTrazabilidad.deleteMany();
  await prisma.historialResultado.deleteMany();
  await prisma.resultadoAcademico.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.actividadAcademica.deleteMany();
  await prisma.asignacionDocente.deleteMany();
  await prisma.matricula.deleteMany();
  await prisma.usuarioRol.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.docente.deleteMany();
  await prisma.estudiante.deleteMany();
  await prisma.rol.deleteMany();
  await prisma.tipoActividad.deleteMany();
  await prisma.seccion.deleteMany();
  await prisma.grado.deleteMany();
  await prisma.areaCurricular.deleteMany();
  await prisma.periodoAcademico.deleteMany();
  await prisma.institucion.deleteMany();
}

async function main() {
  const rows = dataset.registros;
  console.log(`[SEED] Dataset Hito 2: ${rows.length} registros`);
  console.log('[SEED] Limpiando tablas...');
  await clearDatabase();

  const inst = await prisma.institucion.create({
    data: { codigo: 'NH-JUL', nombre: 'Institución Educativa Nuevo Horizonte', ciudad: 'Juliaca' },
  });

  const periodos = {
    '2026-B2': await prisma.periodoAcademico.create({
      data: { institucionId: inst.id, codigo: '2026-B2', nombre: 'II Bimestre 2026', fechaInicio: day('2026-05-18'), fechaFin: day('2026-07-24'), estado: 'CERRADO' },
    }),
    '2026-B3': await prisma.periodoAcademico.create({
      data: { institucionId: inst.id, codigo: '2026-B3', nombre: 'III Bimestre 2026', fechaInicio: day('2026-08-10'), fechaFin: day('2026-10-16'), estado: 'ABIERTO' },
    }),
  } as const;
  type PeriodoCode = keyof typeof periodos;

  const areas = new Map<string, bigint>();
  for (const [codigo, nombre] of AREAS) {
    const area = await prisma.areaCurricular.create({ data: { institucionId: inst.id, codigo, nombre } });
    areas.set(codigo, area.id);
  }

  const grados = new Map<number, bigint>();
  for (const numero of [1, 2, 3, 4, 5]) {
    const g = await prisma.grado.create({ data: { institucionId: inst.id, numero, nombre: `${numero}.º de secundaria` } });
    grados.set(numero, g.id);
  }
  const secciones = new Map<string, bigint>();
  for (const codigo of ['A', 'B', 'C']) {
    const s = await prisma.seccion.create({ data: { gradoId: grados.get(3)!, codigo, nombre: `3.º ${codigo}` } });
    secciones.set(codigo, s.id);
  }

  const tipos = new Map<string, number>();
  for (const [codigo, nombre, descripcion] of TIPOS) {
    const t = await prisma.tipoActividad.create({ data: { codigo, nombre, descripcion } });
    tipos.set(codigo, t.id);
  }

  const roles = new Map<string, number>();
  for (const [codigo, nombre, descripcion] of [
    ['ADMIN', 'Administrador', 'Gestiona usuarios, catálogos y configuración del prototipo.'],
    ['DOCENTE', 'Docente', 'Registra y consulta actividades y resultados de sus asignaciones.'],
    ['AUDITOR', 'Auditor', 'Consulta trazabilidad y verifica evidencia de integridad.'],
  ] as const) {
    const r = await prisma.rol.create({ data: { codigo, nombre, descripcion } });
    roles.set(codigo, r.id);
  }

  // Estudiantes y docentes: solo tokens.
  const estudiantes = new Map<string, bigint>();
  for (const token of [...new Set(rows.map((r) => r.estudiante_token)), ...VAL_STUDENTS]) {
    estudiantes.set(token, (await prisma.estudiante.create({ data: { tokenEstudiante: token } })).id);
  }
  const docentes = new Map<string, bigint>();
  const docenteUsuario = new Map<string, bigint>();
  for (const token of [...new Set(rows.map((r) => r.docente_token)), VAL_TEACHER]) {
    const doc = await prisma.docente.create({ data: { tokenDocente: token } });
    docentes.set(token, doc.id);
    const user = await prisma.usuario.create({
      data: { username: token, passwordHash: disabledPasswordHash(), docenteId: doc.id, roles: { create: { rolId: roles.get('DOCENTE')! } } },
    });
    docenteUsuario.set(token, user.id);
  }
  await prisma.usuario.create({
    data: { username: 'admin.prototipo', passwordHash: disabledPasswordHash(), roles: { create: { rolId: roles.get('ADMIN')! } } },
  });
  await prisma.usuario.create({
    data: { username: 'auditor.prototipo', passwordHash: disabledPasswordHash(), roles: { create: { rolId: roles.get('AUDITOR')! } } },
  });

  // Matrículas: estudiante × periodo (única, como en H2_04).
  const matriculas = new Map<string, bigint>();
  const enroll = async (token: string, periodo: PeriodoCode, seccion: string) => {
    const key = `${token}|${periodo}`;
    if (matriculas.has(key)) return;
    const m = await prisma.matricula.create({
      data: { estudianteId: estudiantes.get(token)!, periodoId: periodos[periodo].id, seccionId: secciones.get(seccion)!, fechaMatricula: day('2026-03-02') },
    });
    matriculas.set(key, m.id);
  };

  // Asignaciones docente × área × sección × periodo y actividades.
  const asignaciones = new Map<string, { id: bigint; docente: string }>();
  const assign = async (docente: string, area: string, seccion: string, periodo: PeriodoCode) => {
    const key = `${area}|${seccion}|${periodo}`;
    const existing = asignaciones.get(key);
    if (existing) {
      if (existing.docente !== docente) throw new Error(`Dos docentes para ${key}`);
      return existing.id;
    }
    const a = await prisma.asignacionDocente.create({
      data: { docenteId: docentes.get(docente)!, areaId: areas.get(area)!, seccionId: secciones.get(seccion)!, periodoId: periodos[periodo].id },
    });
    asignaciones.set(key, { id: a.id, docente });
    return a.id;
  };
  const actividades = new Map<string, bigint>();
  const activity = async (asignacionId: bigint, seccion: string, a: { codigo: string; titulo: string; tipo: string; fecha: string; maximo: number; creador: bigint }) => {
    const key = `${a.codigo}|${seccion}`;
    if (actividades.has(key)) return actividades.get(key)!;
    const act = await prisma.actividadAcademica.create({
      data: {
        asignacionId,
        tipoActividadId: tipos.get(a.tipo)!,
        codigo: a.codigo,
        titulo: a.titulo,
        fechaActividad: day(a.fecha),
        puntajeMaximo: a.maximo,
        creadoPor: a.creador,
      },
    });
    actividades.set(key, act.id);
    return act.id;
  };

  // Área real de cada evaluación: la que usa la mayoría de sus registros (corrige normalizaciones erróneas).
  const areaDeEvaluacion = new Map<string, string>();
  for (const code of new Set(rows.map((r) => r.evaluacion_codigo))) {
    const counts = new Map<string, number>();
    for (const r of rows.filter((x) => x.evaluacion_codigo === code)) counts.set(r.area_codigo, (counts.get(r.area_codigo) ?? 0) + 1);
    areaDeEvaluacion.set(code, [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0]);
  }

  const hallazgos: string[] = [];
  let creados = 0;
  const createResult = async (r: {
    codigo: string;
    matriculaId: bigint;
    actividadId: bigint;
    puntaje: number | null;
    registrador: bigint;
    registradoEn: Date;
  }) => {
    const res = await prisma.resultadoAcademico.create({
      data: {
        codigo: r.codigo,
        matriculaId: r.matriculaId,
        actividadId: r.actividadId,
        puntajeObtenido: r.puntaje,
        registradoPor: r.registrador,
        registradoEn: r.registradoEn,
      },
    });
    await prisma.historialResultado.create({
      data: {
        resultadoId: res.id,
        version: 1,
        puntajeAnterior: null,
        puntajeNuevo: r.puntaje,
        tipoCambio: 'CREACION' satisfies TipoCambio,
        motivoCodigo: 'CARGA_INICIAL',
        motivoDetalle: r.codigo.startsWith('REG-V') ? 'Complemento de validación sintético' : 'Carga del dataset seudonimizado H2_02',
        realizadoPor: r.registrador,
        realizadoEn: r.registradoEn,
      },
    });
    creados++;
  };

  // 1) Registros del Hito 2.
  for (const r of rows) {
    const periodo = r.periodo as PeriodoCode;
    await enroll(r.estudiante_token, periodo, r.seccion);
    const area = areaDeEvaluacion.get(r.evaluacion_codigo)!;
    if (area !== r.area_codigo) {
      hallazgos.push(`${r.registro_id}: área ${r.area_codigo} en H2_02, pero la evaluación ${r.evaluacion_codigo} pertenece a ${area}; se carga en ${area}.`);
    }
    const asignacionId = await assign(r.docente_token, area, r.seccion, periodo);
    const actividadId = await activity(asignacionId, r.seccion, {
      codigo: r.evaluacion_codigo,
      titulo: r.evaluacion_nombre,
      tipo: r.tipo_evaluacion,
      fecha: r.fecha_evaluacion,
      maximo: r.puntaje_maximo,
      creador: docenteUsuario.get(r.docente_token)!,
    });
    await createResult({
      codigo: r.registro_id,
      matriculaId: matriculas.get(`${r.estudiante_token}|${periodo}`)!,
      actividadId,
      puntaje: r.nota,
      registrador: docenteUsuario.get(r.docente_token)!,
      registradoEn: day(r.fecha_registro),
    });
  }

  // 2) Complemento sintético de validación.
  let n = 0;
  for (const a of VAL_ACTIVITIES) {
    const periodo = a.periodo as PeriodoCode;
    const asignacionId = await assign(VAL_TEACHER, a.area, 'C', periodo);
    const actividadId = await activity(asignacionId, 'C', { ...a, maximo: 20, creador: docenteUsuario.get(VAL_TEACHER)! });
    for (const token of VAL_STUDENTS) {
      await enroll(token, periodo, 'C');
      const nota = Math.round(8 + random() * 12);
      const registro = day(a.fecha);
      registro.setUTCDate(registro.getUTCDate() + 1 + Math.floor(random() * 3));
      await createResult({
        codigo: `REG-V${pad(++n, 3)}`,
        matriculaId: matriculas.get(`${token}|${periodo}`)!,
        actividadId,
        puntaje: nota,
        registrador: docenteUsuario.get(VAL_TEACHER)!,
        registradoEn: registro,
      });
    }
  }

  // Asistencia del complemento (el dataset H2 no incluye asistencia).
  const asigIngB3 = asignaciones.get('ING|C|2026-B3')!.id;
  const estados = ['PRESENTE', 'PRESENTE', 'PRESENTE', 'PRESENTE', 'TARDANZA', 'JUSTIFICADA', 'FALTA'] as const;
  for (const token of VAL_STUDENTS) {
    for (const fecha of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18']) {
      await prisma.asistencia.create({
        data: {
          matriculaId: matriculas.get(`${token}|2026-B3`)!,
          asignacionId: asigIngB3,
          fecha: day(fecha),
          estado: estados[Math.floor(random() * estados.length)]!,
          registradoPor: docenteUsuario.get(VAL_TEACHER)!,
        },
      });
    }
  }

  const counts = {
    'resultados (total)': await prisma.resultadoAcademico.count(),
    '  del dataset Hito 2': await prisma.resultadoAcademico.count({ where: { NOT: { codigo: { startsWith: 'REG-V' } } } }),
    '  complemento sintético': await prisma.resultadoAcademico.count({ where: { codigo: { startsWith: 'REG-V' } } }),
    estudiantes: await prisma.estudiante.count(),
    docentes: await prisma.docente.count(),
    'áreas curriculares': await prisma.areaCurricular.count(),
    secciones: await prisma.seccion.count(),
    periodos: await prisma.periodoAcademico.count(),
    actividades: await prisma.actividadAcademica.count(),
    matrículas: await prisma.matricula.count(),
    'historial (CREACION)': await prisma.historialResultado.count(),
    asistencias: await prisma.asistencia.count(),
    usuarios: await prisma.usuario.count(),
  };
  console.log(`[SEED] ${creados} resultados creados.`);
  console.table(counts);
  if (hallazgos.length > 0) {
    console.log('[SEED] Hallazgos en el dataset del Hito 2 (requieren confirmación del equipo):');
    for (const h of hallazgos) console.log(`  - ${h}`);
  }
}

main()
  .catch((error) => {
    console.error('[SEED] Error:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
