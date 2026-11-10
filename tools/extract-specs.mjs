// Phase 1 forensic extractor: pulls every GLSL string literal and timeline-relevant
// snippet out of the production bundle verbatim (no rewriting of math).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(root, 'Dala_files/theme.js'), 'utf8');
const readable = fs.readFileSync(path.join(root, 'Dala_files/theme.readable.js'), 'utf8').split(/\r?\n/);
const outDir = path.join(root, 'decompiled_specs');
const shDir = path.join(outDir, 'shaders');
fs.rmSync(shDir, { recursive: true, force: true });
fs.mkdirSync(shDir, { recursive: true });

// --- locate GLSL literals by anchor: walk back to the opening quote, then parse forward.
const literals = [];
const anchors = /gl_Position|gl_FragColor|gl_FragData|void main\s*\(|#include <|uniform (?:float|vec\d|sampler2D|mat\d|int|bool) /g;
let m; let lastEnd = -1;
while ((m = anchors.exec(src))) {
  if (m.index < lastEnd) continue;
  let i = m.index;
  while (i > 0) { i--; const c = src[i]; if ((c === '"' || c === '`' || c === "'") && src[i - 1] !== '\\') { if (/[:=,(?\[+&|!{;]/.test(src[i - 1] || ',') || c === '`') break; } }
  const q = src[i]; let j = i + 1;
  while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; }
  if (j <= m.index) continue;
  literals.push({ start: i, end: j + 1, quote: q, raw: src.slice(i + 1, j) });
  lastEnd = j + 1; anchors.lastIndex = j + 1;
}
const unescape = (q, raw) => {
  if (q === '`') return raw.replace(/\\`/g, '`').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  try { return JSON.parse('"' + raw.replace(/\\'/g, "'").replace(/(?<!\\)"/g, '\\"') + '"'); } catch { return raw; }
};

const isGlsl = (s) => /gl_FragColor|gl_Position|gl_FragCoord|void main\s*\(|#include <|uniform\s+(float|vec|sampler|mat|int|bool)|varying\s+(float|vec)/.test(s);

const findReadableLine = (needle) => {
  const n = needle.trim().split('\n').find((l) => l.trim().length > 12)?.trim().slice(0, 40);
  if (!n) return null;
  const idx = readable.findIndex((l) => l.includes(n));
  return idx < 0 ? null : idx + 1;
};

const index = [];
let n = 0;
for (const lit of literals) {
  const code = unescape(lit.quote, lit.raw);
  if (code.length < 30 || !isGlsl(code)) continue;
  const kind = /gl_Position/.test(code) ? 'vert' : /gl_FragColor|gl_FragData/.test(code) ? 'frag' : 'chunk';
  const ctx = src.slice(Math.max(0, lit.start - 80), lit.start).replace(/\s+/g, ' ');
  const key = (ctx.match(/([A-Za-z_$][\w$]*)\s*[:=]\s*$/) || [])[1] || '';
  const uniforms = [...code.matchAll(/uniform\s+\w+\s+(\w+)/g)].map((m) => m[1]);
  const attributes = [...code.matchAll(/attribute\s+\w+\s+(\w+)/g)].map((m) => m[1]);
  const varyings = [...new Set([...code.matchAll(/varying\s+\w+\s+(\w+)/g)].map((m) => m[1]))];
  const file = `${String(n++).padStart(2, '0')}_${key || 'anon'}.${kind}.glsl`;
  fs.writeFileSync(path.join(shDir, file), code);
  index.push({ file, kind, contextKey: key, bundleOffset: lit.start, readableLine: findReadableLine(code), uniforms, attributes, varyings, precedingContext: ctx.slice(-80) });
}
fs.writeFileSync(path.join(shDir, 'index.json'), JSON.stringify(index, null, 2));

// --- timeline / asset / camera snippets with readable line numbers
const patterns = {
  assets: /pos-33\.exr|sc-33\.png|cd-33\.png|dof-2k-10\.jpg|gradient-noise\.jpg|noise\.jpg|py-lod|py-monbile/,
  camera: /camera\.(position|rotation|lookAt|fov|zoom)|PerspectiveCamera|OrthographicCamera/,
  scrollTrigger: /scrollTrigger|ScrollTrigger/,
  gsapTimeline: /\.timeline\(|\.to\(|\.fromTo\(/,
  dom2webgl: /dom2webgl|Pyramid/,
  textPresets: /splitTextRotateIn|splitText|animate-from/,
  asscroll: /asscroll|ASScroll/,
  sections: /landing|introduction|manifesto|team|investor|footer/,
};
const timelines = {};
for (const [k, re] of Object.entries(patterns)) {
  timelines[k] = readable
    .map((l, i) => ({ line: i + 1, code: l.trim() }))
    .filter((o) => re.test(o.code))
    .map((o) => ({ line: o.line, code: o.code.length > 400 ? o.code.slice(0, 400) + ' …' : o.code }));
}
fs.writeFileSync(path.join(outDir, 'timelines.json'), JSON.stringify({ source: 'Dala_files/theme.readable.js', generatedBy: 'tools/extract-specs.mjs', ...timelines }, null, 2));
console.log(`shaders: ${index.length}`, Object.fromEntries(Object.entries(timelines).map(([k, v]) => [k, v.length])));
