/**
 * Automated demo screenshot capture for README GIF.
 * Run: node scripts/capture-demo.mjs
 * Requires: playwright installed in frontend/, app running on localhost:5173
 */
// resolve playwright from the frontend node_modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('../frontend/node_modules/playwright');
import { mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SHOTS_DIR = path.join(ROOT, 'demo-shots');
const ASSETS_DIR = path.join(ROOT, 'docs', 'assets');

if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });
if (!existsSync(ASSETS_DIR)) mkdirSync(ASSETS_DIR, { recursive: true });

const BASE = 'http://localhost:5173';
const EMAIL = 'demo@iplcoach.dev';
const PASS = 'demo1234';

async function shot(page, name, delay = 800) {
  await page.waitForTimeout(delay);
  const file = path.join(SHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  captured: ${name}.png`);
  return file;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 860 },
    deviceScaleFactor: 1.5,
  });
  const page = await ctx.newPage();

  console.log('\n=== IPL Coach 2026 — Demo Capture ===\n');

  // 1. Login page
  console.log('[1/9] Login page');
  await page.goto(`${BASE}/login`);
  await shot(page, '01-login', 1000);

  // 2. Register → fills in the form
  console.log('[2/9] Register form');
  await page.click('button:has-text("Create Account")');
  await page.fill('input[placeholder="Username"]', 'DemoCoach');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await shot(page, '02-register-form', 600);

  // 3. Login with existing account
  console.log('[3/9] Logging in');
  await page.click('button:has-text("Sign In")');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 8000 }).catch(() => {});
  await shot(page, '03-home', 1400);

  // 4. Home page — scroll to features section
  console.log('[4/9] Home — features section');
  await page.evaluate(() => window.scrollBy(0, 500));
  await shot(page, '04-home-features', 600);

  // 5. Upcoming match room (RCB vs KKR id=2)
  console.log('[5/9] Match Room — upcoming');
  await page.goto(`${BASE}/match/2`);
  await shot(page, '05-matchroom-upcoming', 1600);

  // 6. Start the match
  console.log('[6/9] Starting match simulation');
  const startBtn = page.locator('button:has-text("Start Match")').first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
  }
  await page.waitForTimeout(3000);
  await shot(page, '06-matchroom-live', 2000);

  // 7. Leaderboard
  console.log('[7/9] Leaderboard');
  await page.goto(`${BASE}/leaderboard`);
  await shot(page, '07-leaderboard', 1400);

  // 8. Coach Report (completed match id=1)
  console.log('[8/9] Coach Report Card');
  await page.goto(`${BASE}/match/1/report`);
  await shot(page, '08-report-card', 3000);

  // 9. Strategy Room
  console.log('[9/9] Strategy Room');
  await page.goto(`${BASE}/match/2/strategy`);
  await shot(page, '09-strategy-room', 1400);

  await browser.close();

  // Build animated GIF with ffmpeg
  console.log('\n=== Building animated GIF ===');
  const gifOut = path.join(ASSETS_DIR, 'demo.gif');
  const palette = path.join(SHOTS_DIR, 'palette.png');

  // Two-pass GIF encoding for quality — use execSync with shell array to handle spaces in paths
  const q = (p) => `"${p}"`;
  execSync(
    `ffmpeg -y -framerate 0.45 -pattern_type glob -i ${q(`${SHOTS_DIR}/*.png`)} ` +
    `-vf "fps=0.45,scale=1200:-1:flags=lanczos,palettegen=stats_mode=diff" ${q(palette)}`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );
  execSync(
    `ffmpeg -y -framerate 0.45 -pattern_type glob -i ${q(`${SHOTS_DIR}/*.png`)} ` +
    `-i ${q(palette)} ` +
    `-filter_complex "fps=0.45,scale=1200:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer" ` +
    `${q(gifOut)}`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );

  const sizeKb = Math.round(
    execSync(`stat -f %z "${gifOut}"`).toString().trim() / 1024
  );
  console.log(`\nGIF saved: docs/assets/demo.gif (${sizeKb} KB)`);
  console.log('Done!');
})();
