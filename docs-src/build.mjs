/**
 * Genera los informes PDF del Hito 3 a partir de docs-src/reports/*.html.
 *
 *   node docs-src/build.mjs            (todos)
 *   node docs-src/build.mjs H3_04      (solo los que coinciden)
 *
 * Marcadores disponibles dentro de los informes:
 *   {{log:ARCHIVO}}                 salida completa de evidencias/ARCHIVO
 *   {{log:ARCHIVO|tail:N}}          últimas N líneas
 *   {{log:ARCHIVO|head:N}}          primeras N líneas
 *   {{log:ARCHIVO|grep:REGEX}}      líneas que coinciden
 *   {{log:ARCHIVO|lines:A-B}}       líneas A a B
 *   {{code:RUTA|A-B}}               fragmento de código fuente (líneas A-B)
 *   {{img:ARCHIVO.png}}             diagrama de diagramas/
 * Así los informes muestran salidas reales de terminal, nunca capturas inventadas.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const reportsDir = path.join(here, 'reports');
const outDir = path.join(here, 'out');
mkdirSync(outDir, { recursive: true });

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((c) => existsSync(c));
if (!chrome) throw new Error('No se encontró Chrome/Edge. Defina CHROME_PATH.');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function selectLines(text, filter) {
  let lines = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
  if (!filter) return lines;
  const [op, arg] = [filter.slice(0, filter.indexOf(':')), filter.slice(filter.indexOf(':') + 1)];
  if (op === 'tail') return lines.slice(-Number(arg));
  if (op === 'head') return lines.slice(0, Number(arg));
  if (op === 'grep') return lines.filter((l) => new RegExp(arg).test(l));
  if (op === 'lines') {
    const [a, b] = arg.split('-').map(Number);
    return lines.slice(a - 1, b);
  }
  throw new Error(`Filtro desconocido: ${filter}`);
}

/**
 * Tamaño de letra para que la línea más larga quepa en el ancho útil de A4 (~480 pt)
 * sin cortes: ancho de carácter monoespaciado ≈ 0,55 em. Máximo 7,6 pt, mínimo 4,4 pt.
 */
function fontStyle(lines) {
  const max = Math.max(1, ...lines.map((l) => l.length));
  const size = Math.max(4.4, Math.min(7.6, 480 / (max * 0.55)));
  return `font-size:${size.toFixed(2)}pt`;
}

function expand(html) {
  return html
    .replace(/\{\{log:([^}|]+)(?:\|([^}]+))?\}\}/g, (_, file, filter) => {
      const text = readFileSync(path.join(root, 'evidencias', file.trim()), 'utf8');
      const lines = selectLines(text, filter?.trim());
      if (lines.join('').trim() === '') console.warn(`[AVISO] ${file.trim()} | ${filter} no devolvió líneas`);
      const body = escapeHtml(lines.join('\n'));
      return `<figure class="log"><figcaption>evidencias/${escapeHtml(file.trim())}</figcaption><pre style="${fontStyle(lines)}">${body}</pre></figure>`;
    })
    .replace(/\{\{code:([^}|]+)\|(\d+)-(\d+)\}\}/g, (_, file, a, b) => {
      const text = readFileSync(path.join(root, file.trim()), 'utf8');
      const lines = selectLines(text, `lines:${a}-${b}`);
      const body = escapeHtml(lines.join('\n'));
      return `<figure class="code"><figcaption>${escapeHtml(file.trim())} (líneas ${a}-${b})</figcaption><pre style="${fontStyle(lines)}">${body}</pre></figure>`;
    })
    .replace(/\{\{img:([^}]+)\}\}/g, (_, file) =>
      `<img class="diagram" src="${pathToFileURL(path.join(root, 'diagramas', file.trim())).href}" alt="${escapeHtml(file.trim())}">`,
    );
}

const template = readFileSync(path.join(here, 'template.html'), 'utf8');
const filter = process.argv[2];

for (const file of readdirSync(reportsDir).filter((f) => f.endsWith('.html')).sort()) {
  if (filter && !file.includes(filter)) continue;
  const source = readFileSync(path.join(reportsDir, file), 'utf8');
  const title = /<!--\s*title:\s*(.+?)\s*-->/.exec(source)?.[1] ?? file;
  const subtitle = /<!--\s*subtitle:\s*(.+?)\s*-->/.exec(source)?.[1] ?? '';
  const target = /<!--\s*output:\s*(.+?)\s*-->/.exec(source)?.[1] ?? `informes/${file.replace('.html', '.pdf')}`;
  const page = template
    .replace('{{TITLE}}', escapeHtml(title))
    .replace('{{TITLE}}', escapeHtml(title))
    .replace('{{SUBTITLE}}', escapeHtml(subtitle))
    .replace('{{CONTENT}}', expand(source));
  const htmlPath = path.join(outDir, file);
  writeFileSync(htmlPath, page, 'utf8');
  const pdfPath = path.join(root, target);
  mkdirSync(path.dirname(pdfPath), { recursive: true });
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--allow-file-access-from-files',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore' });
  console.log(`[OK] ${target}`);
}
