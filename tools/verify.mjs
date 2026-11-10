// Phase 5 verifier: loads a page, records console errors + failed/404 requests,
// scrolls through all sections (Landing Brain Right, Introduction Brain Left,
// Manifesto Intro Dispersed, Manifesto Lightbulb, Manifesto Globe, Team Slider,
// Investors 3D Pyramids, Footer Dala Logo) and captures screenshots into verification/<page>/.
// Usage: node tools/verify.mjs [reference|index]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const page_ = process.argv[2] || 'reference';
const outDir = `verification/${page_}`;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/bin/chromium',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const bad = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
page.on('requestfailed', (r) => bad.push(`FAILED ${r.url()} ${r.failure()?.errorText}`));

async function waitFrames(n) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let i = 0;
        function tick() {
          if (++i >= count) resolve();
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }),
    n
  );
}

await page.goto(`http://localhost:5173/${page_}.html?skiploader`, { waitUntil: 'load' });
// Wait for SiteLoader + Cones.activate() + GPGPU spring settle
await page.waitForTimeout(3200);
await waitFrames(90);

const stops = [
  { name: '01_landing', sel: '.landing', idx: 0, ratio: 0.0 },
  { name: '02_introduction', sel: '.introduction', idx: 0, ratio: 0.16 },
  { name: '03_manifesto_intro', sel: '.manifesto--introduction', idx: 0, ratio: 0.15 },
  { name: '04_manifesto_lightbulb', sel: '.manifesto--section', idx: 0, ratio: 0.16 },
  { name: '05_manifesto_globe', sel: '.manifesto--section', idx: 1, ratio: 0.16 },
  { name: '06_team_section', sel: '.js-team-section', idx: 0, ratio: 0.08 },
  { name: '07_investors', sel: '.investors', idx: 0, ratio: 0.15 },
  { name: '08_footer', sel: '.footer', idx: 0, ratio: 0.0, toBottom: true },
];

await page.screenshot({ path: `${outDir}/00_top.png` });

for (const stop of stops) {
  const targetY = await page.evaluate(
    ({ s, idx, ratio, toBottom }) => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (toBottom) return maxScroll;
      const el = document.querySelectorAll(s)[idx];
      if (!el) return null;
      const root = document.querySelector('[asscroll-container] > main') || document.body;
      const rootRect = root.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const y = elRect.top - rootRect.top + elRect.height * (ratio || 0);
      return Math.min(maxScroll, Math.max(0, Math.round(y)));
    },
    { s: stop.sel, idx: stop.idx, ratio: stop.ratio, toBottom: !!stop.toBottom }
  );
  if (targetY == null) continue;

  await page.evaluate(async (destY) => {
    const startY = window.scrollY || 0;
    const dist = destY - startY;
    const steps = Math.max(1, Math.ceil(Math.abs(dist) / 300));
    for (let s = 1; s <= steps; s++) {
      const nextY = Math.round(startY + (dist * s) / steps);
      window.scrollTo(0, nextY);
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, targetY);

  // Settle ASScroll lerp + Cones spring physics without overloading CPU
  await waitFrames(90);
  await page.screenshot({ path: `${outDir}/${stop.name}.png` });
}

const report = { page: page_, consoleErrors: errors, badRequests: bad };
fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
