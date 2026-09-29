/**
 * Seed de datos de VALIDACIÓN del prototipo (Hito 3).
 *
 * Los registros son ficticios, generados de forma determinista y contextualizados en
 * Juliaca - Puno. NO son información oficial entregada por la I.E. Nuevo Horizonte.
 * Los documentos de identidad usan el tipo "COD-VAL" para que no puedan confundirse
 * con un DNI real.
 */
import { ActivityType, AttendanceStatus, PrismaClient, QualitativeGrade } from '@prisma/client';

const prisma = new PrismaClient();
const ACADEMIC_YEAR = 2026;

/** PRNG determinista (mulberry32): el mismo seed produce siempre los mismos datos. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(20260929);

const pad = (value: number, size: number) => String(value).padStart(size, '0');
const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Conversión de nota vigesimal a escala CNEB usada en el prototipo. */
function toQualitative(score: number): QualitativeGrade {
  if (score >= 18) return QualitativeGrade.AD;
  if (score >= 14) return QualitativeGrade.A;
  if (score >= 11) return QualitativeGrade.B;
  return QualitativeGrade.C;
}

const STUDENTS: Array<[string, string]> = [
  ['Luis Alberto', 'Mamani Quispe'],
  ['María Fernanda', 'Condori Apaza'],
  ['Andrea Milagros', 'Huanca Yucra'],
  ['José Carlos', 'Coaquira Mamani'],
  ['Diego Alejandro', 'Apaza Cutipa'],
  ['Valeria Nicole', 'Quispe Ccama'],
  ['Ruth Daniela', 'Chambi Condori'],
  ['Kevin Rodrigo', 'Choque Sucari'],
  ['Lucero Anahí', 'Yucra Mamani'],
  ['Brayan Josué', 'Cutipa Huanca'],
  ['Milagros Estefany', 'Ccama Choque'],
  ['Jhon Franklin', 'Sucari Apaza'],
  ['Katherine Lizbeth', 'Mamani Chambi'],
  ['Edwin Rolando', 'Quispe Coaquira'],
  ['Sheyla Maribel', 'Condori Cutipa'],
  ['Rodrigo Andrés', 'Huanca Quispe'],
  ['Yesenia Paola', 'Apaza Yucra'],
  ['Alexander Iván', 'Chambi Mamani'],
  ['Nayeli Fiorella', 'Coaquira Ccama'],
  ['Franco Sebastián', 'Choque Condori'],
  ['Rocío Belén', 'Yucra Sucari'],
  ['Cristian Omar', 'Cutipa Apaza'],
  ['Dayana Sofía', 'Ccama Huanca'],
  ['Gabriel Esteban', 'Sucari Choque'],
];

const TEACHERS: Array<[string, string, string]> = [
  ['Rosa Elena', 'Quispe Chambi', 'Matemática'],
  ['Juan Carlos', 'Mamani Sucari', 'Comunicación'],
  ['Edith Marleny', 'Condori Yucra', 'Ciencia y Tecnología'],
  ['Wilber Ronald', 'Apaza Ccama', 'Ciencias Sociales'],
  ['Nancy Pilar', 'Huanca Cutipa', 'Inglés'],
];

const SUBJECTS: Array<[string, string]> = [
  ['MAT', 'Matemática'],
  ['COM', 'Comunicación'],
  ['CYT', 'Ciencia y Tecnología'],
  ['CCSS', 'Ciencias Sociales'],
  ['ING', 'Inglés'],
  ['EPT', 'Educación para el Trabajo'],
  ['DPCC', 'Desarrollo Personal, Ciudadanía y Cívica'],
  ['AYC', 'Arte y Cultura'],
  ['EFI', 'Educación Física'],
  ['ERE', 'Educación Religiosa'],
];

/** Sección → grado, letra. Ocho estudiantes por sección. */
const SECTIONS = [
  { id: 1, code: '2026-1A', gradeNumber: 1, letter: 'A', birthYear: 2013 },
  { id: 2, code: '2026-1B', gradeNumber: 1, letter: 'B', birthYear: 2013 },
  { id: 3, code: '2026-2A', gradeNumber: 2, letter: 'A', birthYear: 2012 },
];

/** Docente asignado por área (subjectId → teacherId). */
const ASSIGNED_SUBJECTS: Array<{ subjectId: number; teacherId: number }> = [
  { subjectId: 1, teacherId: 1 },
  { subjectId: 2, teacherId: 2 },
  { subjectId: 3, teacherId: 3 },
  { subjectId: 4, teacherId: 4 },
  { subjectId: 5, teacherId: 5 },
];

/** Plan de evaluaciones por sección: 5 actividades × 3 secciones = 15 actividades. */
const ACTIVITY_PLAN: Array<{
  subjectId: number;
  periodId: number;
  type: ActivityType;
  title: string;
  competency: string;
  dayOffset: number;
}> = [
  { subjectId: 1, periodId: 1, type: ActivityType.EVALUACION_DIAGNOSTICA, title: 'Evaluación diagnóstica de números racionales', competency: 'Resuelve problemas de cantidad', dayOffset: 0 },
  { subjectId: 2, periodId: 1, type: ActivityType.EXPOSICION, title: 'Exposición sobre leyendas del altiplano puneño', competency: 'Se comunica oralmente en su lengua materna', dayOffset: 2 },
  { subjectId: 1, periodId: 2, type: ActivityType.PRACTICA_CALIFICADA, title: 'Práctica calificada de proporcionalidad', competency: 'Resuelve problemas de regularidad, equivalencia y cambio', dayOffset: 0 },
  { subjectId: 3, periodId: 2, type: ActivityType.PROYECTO, title: 'Proyecto: calidad del agua del río Coata', competency: 'Indaga mediante métodos científicos', dayOffset: 3 },
  { subjectId: 4, periodId: 2, type: ActivityType.TRABAJO_GRUPAL, title: 'Trabajo grupal: economía de la feria de Juliaca', competency: 'Gestiona responsablemente los recursos económicos', dayOffset: 5 },
];

const PERIOD_ACTIVITY_START: Record<number, string> = { 1: '2026-06-08', 2: '2026-09-07' };

function addDays(iso: string, days: number): Date {
  const result = date(iso);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function clearDatabase() {
  // Orden inverso de dependencias.
  await prisma.traceabilityEvent.deleteMany();
  await prisma.blockchainEvidence.deleteMany();
  await prisma.academicResultHistory.deleteMany();
  await prisma.academicResult.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.academicActivity.deleteMany();
  await prisma.teachingAssignment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.studentIdentity.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.role.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.academicPeriod.deleteMany();
  await prisma.institution.deleteMany();
}

async function main() {
  console.log('[SEED] Limpiando tablas...');
  await clearDatabase();

  await prisma.institution.create({
    data: { id: 1, code: 'IE-NH', name: 'Institución Educativa Nuevo Horizonte', city: 'Juliaca', region: 'Puno' },
  });

  await prisma.academicPeriod.createMany({
    data: [
      { id: 1, institutionId: 1, code: '2026-B2', academicYear: ACADEMIC_YEAR, name: 'II Bimestre 2026', startDate: date('2026-05-18'), endDate: date('2026-07-24') },
      { id: 2, institutionId: 1, code: '2026-B3', academicYear: ACADEMIC_YEAR, name: 'III Bimestre 2026', startDate: date('2026-08-10'), endDate: date('2026-10-16') },
    ],
  });

  await prisma.grade.createMany({
    data: [1, 2, 3, 4, 5].map((n) => ({ id: n, institutionId: 1, level: 'SECUNDARIA', number: n, name: `${n}.º de secundaria` })),
  });

  await prisma.section.createMany({
    data: SECTIONS.map((s) => ({ id: s.id, gradeId: s.gradeNumber, code: s.code, letter: s.letter, academicYear: ACADEMIC_YEAR })),
  });

  await prisma.subject.createMany({ data: SUBJECTS.map(([code, name], i) => ({ id: i + 1, code, name })) });

  await prisma.teacher.createMany({
    data: TEACHERS.map(([firstNames, lastNames, specialty], i) => ({
      id: i + 1,
      institutionId: 1,
      pseudonymCode: `DOC-PSE-${pad(i + 1, 3)}`,
      firstNames,
      lastNames,
      specialty,
    })),
  });

  await prisma.role.createMany({
    data: [
      { id: 1, code: 'ADMINISTRADOR', name: 'Administrador del prototipo', description: 'Registra y ancla evidencias; administra la infraestructura.' },
      { id: 2, code: 'DOCENTE', name: 'Docente', description: 'Registra y rectifica resultados de sus actividades.' },
      { id: 3, code: 'AUDITOR', name: 'Auditor académico', description: 'Verifica la integridad y consulta la trazabilidad.' },
    ],
  });

  await prisma.user.createMany({
    data: [
      { id: 1, username: 'admin.prototipo', actorReference: 'ADM-PSE-001', roleId: 1 },
      ...TEACHERS.map((_, i) => ({
        id: i + 2,
        username: `docente${pad(i + 1, 2)}`,
        actorReference: `DOC-PSE-${pad(i + 1, 3)}`,
        roleId: 2,
        teacherId: i + 1,
      })),
      { id: 7, username: 'auditor.academico', actorReference: 'AUD-PSE-001', roleId: 3 },
    ],
  });

  // Estudiantes, identidad separada y matrícula.
  await prisma.student.createMany({
    data: STUDENTS.map((_, i) => ({ id: i + 1, institutionId: 1, pseudonymCode: `EST-PSE-${pad(i + 1, 3)}` })),
  });
  await prisma.studentIdentity.createMany({
    data: STUDENTS.map(([firstNames, lastNames], i) => {
      const section = SECTIONS[Math.floor(i / 8)]!;
      const month = 1 + Math.floor(random() * 12);
      const day = 1 + Math.floor(random() * 28);
      return {
        studentId: i + 1,
        firstNames,
        lastNames,
        documentType: 'COD-VAL',
        documentNumber: `VAL-${pad(i + 1, 4)}`,
        birthDate: date(`${section.birthYear}-${pad(month, 2)}-${pad(day, 2)}`),
      };
    }),
  });
  await prisma.enrollment.createMany({
    data: STUDENTS.map((_, i) => ({
      id: i + 1,
      code: `MAT-2026-${pad(i + 1, 4)}`,
      studentId: i + 1,
      sectionId: SECTIONS[Math.floor(i / 8)]!.id,
      academicYear: ACADEMIC_YEAR,
      enrolledAt: date('2026-03-02'),
    })),
  });

  // Asignaciones docentes: 5 áreas × 3 secciones.
  const assignments = SECTIONS.flatMap((section) =>
    ASSIGNED_SUBJECTS.map((a) => ({ ...a, sectionId: section.id })),
  ).map((a, i) => ({ id: i + 1, teacherId: a.teacherId, subjectId: a.subjectId, sectionId: a.sectionId, academicYear: ACADEMIC_YEAR }));
  await prisma.teachingAssignment.createMany({ data: assignments });

  // Actividades: 5 por sección.
  const activities = SECTIONS.flatMap((section, sectionIndex) =>
    ACTIVITY_PLAN.map((plan) => {
      const assignment = assignments.find((a) => a.sectionId === section.id && a.subjectId === plan.subjectId)!;
      return { plan, section, sectionIndex, assignment };
    }),
  ).map(({ plan, sectionIndex, assignment }, i) => ({
    id: i + 1,
    code: `ACT-2026-${pad(i + 1, 3)}`,
    teachingAssignmentId: assignment.id,
    periodId: plan.periodId,
    type: plan.type,
    title: plan.title,
    competency: plan.competency,
    scheduledDate: addDays(PERIOD_ACTIVITY_START[plan.periodId]!, plan.dayOffset + sectionIndex),
  }));
  await prisma.academicActivity.createMany({ data: activities });

  // Resultados: cada actividad × 8 estudiantes de su sección = 120 registros.
  const results = activities.flatMap((activity) => {
    const assignment = assignments.find((a) => a.id === activity.teachingAssignmentId)!;
    const sectionIndex = SECTIONS.findIndex((s) => s.id === assignment.sectionId);
    return Array.from({ length: 8 }, (_, k) => ({ activity, assignment, enrollmentId: sectionIndex * 8 + k + 1 }));
  }).map(({ activity, assignment, enrollmentId }, i) => {
    const score = Math.min(20, Math.max(6, Math.round((9 + random() * 11) * 2) / 2));
    const recordedAt = new Date(activity.scheduledDate);
    recordedAt.setUTCDate(recordedAt.getUTCDate() + 2);
    recordedAt.setUTCHours(20, Math.floor(random() * 60), 0, 0); // 15:xx hora de Perú (UTC-5)
    return {
      id: i + 1,
      code: `REG-${pad(i + 1, 6)}`,
      enrollmentId,
      activityId: activity.id,
      qualitativeGrade: toQualitative(score),
      numericScore: score.toFixed(2),
      observation: score < 11 ? 'Requiere acompañamiento pedagógico.' : null,
      recordedAt,
      recordedByTeacherId: assignment.teacherId,
    };
  });
  await prisma.academicResult.createMany({ data: results });

  // Asistencia: 5 días de septiembre por matrícula.
  const attendanceDays = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'];
  await prisma.attendance.createMany({
    data: STUDENTS.flatMap((_, i) =>
      attendanceDays.map((day) => {
        const roll = random();
        const status =
          roll < 0.86 ? AttendanceStatus.PRESENTE
          : roll < 0.93 ? AttendanceStatus.TARDANZA
          : roll < 0.97 ? AttendanceStatus.FALTA_JUSTIFICADA
          : AttendanceStatus.FALTA;
        return { enrollmentId: i + 1, date: date(day), status };
      }),
    ),
  });

  const counts = {
    estudiantes: await prisma.student.count(),
    docentes: await prisma.teacher.count(),
    asignaturas: await prisma.subject.count(),
    secciones: await prisma.section.count(),
    periodos: await prisma.academicPeriod.count(),
    actividades: await prisma.academicActivity.count(),
    resultados: await prisma.academicResult.count(),
    asistencias: await prisma.attendance.count(),
    usuarios: await prisma.user.count(),
  };
  console.log('[SEED] Datos de validación cargados:');
  console.table(counts);
}

main()
  .catch((error) => {
    console.error('[SEED] Error:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
