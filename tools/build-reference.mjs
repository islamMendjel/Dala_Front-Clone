// Generates reference.html and index.html from the pristine un-hydrated production DOM (Dala.server.html)
// or falls back to cleaning Dala.html: strips analytics/Intercom/PostHog, stubs window.Intercom
// so theme.js does not inject external widget.intercom.io after 1200ms, and rewrites asset URLs.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srcFile = fs.existsSync(path.join(root, 'Dala.server.html'))
  ? path.join(root, 'Dala.server.html')
  : path.join(root, 'Dala.html');
let h = fs.readFileSync(srcFile, 'utf8');

const drop = [
  /<script[^>]*src="[^"]*(ee6u4z7r|array\.js|googletagmanager\.com\/gtag\/js)[^"]*"[^>]*><\/script>/g,
  /<script>function gtag\(\)[\s\S]*?<\/script>/g,
  /<script>!function\(i,n\)\{var r,s,a,c;n\.__SV[\s\S]*?<\/script>/g,
  /<iframe id="intercom-frame"[\s\S]*?<\/iframe>/g,
  /<div class="intercom-lightweight-app"[\s\S]*?<\/div>\s*<\/div>/g,
  /<link rel="preload" as="font"[^>]*>/g,
];
for (const re of drop) h = h.replace(re, '');

h = h
  .replace(/https:\/\/dala\.craftedbygc\.com\//g, '/')
  .replace(/\.\/Dala_files\//g, '/Dala_files/')
  .replace(/\/css\/style\.css(\?[^"]*)?/g, '/Dala_files/style.css')
  .replace(/\/scripts\/(manifest|vendor|theme)\.js(\?[^"]*)?/g, '/Dala_files/$1.js')
  .replace(/xlink:href="images\/svgsprite\.svg/g, 'xlink:href="/images/svgsprite.svg')
  .replace('</head>', '<script>window.Intercom=function(){};</script></head>');

fs.writeFileSync(path.join(root, 'reference.html'), h);
console.log('reference.html written', h.length, 'bytes');

const indexHtml = h
  .replace(/<script[^>]*src="\/Dala_files\/manifest\.js"[^>]*><\/script>\s*/g, '')
  .replace(/<script[^>]*src="\/Dala_files\/vendor\.js"[^>]*><\/script>\s*/g, '')
  .replace(
    /<script[^>]*src="\/Dala_files\/theme\.js"[^>]*><\/script>/g,
    '<script type="module" src="/src/main.ts"></script>'
  );

fs.writeFileSync(path.join(root, 'index.html'), indexHtml);
console.log('index.html written', indexHtml.length, 'bytes');
