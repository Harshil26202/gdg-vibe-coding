/**
 * Interactive demo video recorder for IPL Coach 2026.
 * Uses Playwright video recording + injected cursor overlay + simulated clicks.
 *
 * Run: node scripts/capture-demo.mjs
 * Requires: app running on localhost:5173 + backend on localhost:8000
 *
 * BEFORE RUNNING — reset match 2 to upcoming:
 *   docker exec gdgvibecoding-postgres-1 psql -U ipl_user -d ipl_simulator -c \
 *     "UPDATE matches SET status='upcoming', current_over=0, current_ball=0,
 *      current_innings=1, team_a_score=0, team_a_wickets=0, team_b_score=0,
 *      team_b_wickets=0, batting_team=NULL, bowling_team=NULL WHERE id=2;"
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('../frontend/node_modules/playwright');
import { mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..');
const VIDEO_DIR  = path.join(ROOT, 'demo-video');
const ASSETS_DIR = path.join(ROOT, 'docs', 'assets');
const W = 1280, H = 800;

if (!existsSync(VIDEO_DIR))  mkdirSync(VIDEO_DIR,  { recursive: true });
if (!existsSync(ASSETS_DIR)) mkdirSync(ASSETS_DIR, { recursive: true });

const BASE  = 'http://localhost:5173';
const EMAIL = 'demo@iplcoach.dev';
const PASS  = 'demo1234';

/* ─── Cursor overlay ────────────────────────────────────────────────────── */
const CURSOR_SCRIPT = `
(function() {
  if (document.getElementById('__demo_cursor__')) return;
  const ring = document.createElement('div');
  ring.id = '__demo_ring__';
  Object.assign(ring.style, {
    position:'fixed', width:'48px', height:'48px', borderRadius:'50%',
    border:'2.5px solid rgba(249,115,22,0.9)', pointerEvents:'none',
    transform:'translate(-50%,-50%) scale(0)', opacity:'0',
    zIndex:'99998', transition:'none', top:'-100px', left:'-100px',
  });
  document.body.appendChild(ring);

  const dot = document.createElement('div');
  dot.id = '__demo_cursor__';
  Object.assign(dot.style, {
    position:'fixed', width:'22px', height:'22px', borderRadius:'50%',
    background:'rgba(249,115,22,0.55)', border:'2px solid rgba(249,115,22,1)',
    pointerEvents:'none', transform:'translate(-50%,-50%)',
    transition:'left 0.07s ease, top 0.07s ease',
    zIndex:'99999', boxShadow:'0 0 14px rgba(249,115,22,0.6)',
    top:'-100px', left:'-100px',
  });
  document.body.appendChild(dot);

  const lbl = document.createElement('div');
  lbl.id = '__demo_lbl__';
  Object.assign(lbl.style, {
    position:'fixed', background:'rgba(15,15,26,0.92)',
    border:'1px solid rgba(249,115,22,0.5)',
    color:'#f97316', fontSize:'11px', fontFamily:'system-ui,sans-serif',
    fontWeight:'700', padding:'4px 10px', borderRadius:'12px',
    pointerEvents:'none', zIndex:'99997', opacity:'0',
    transition:'opacity 0.2s', whiteSpace:'nowrap',
    top:'-100px', left:'-100px',
  });
  document.body.appendChild(lbl);

  document.addEventListener('mousemove', e => {
    dot.style.left = e.clientX + 'px';
    dot.style.top  = e.clientY + 'px';
  });
  document.addEventListener('click', e => {
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    ring.style.transition = 'none';
    ring.style.transform = 'translate(-50%,-50%) scale(0)'; ring.style.opacity = '1';
    requestAnimationFrame(() => {
      ring.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-out';
      ring.style.transform = 'translate(-50%,-50%) scale(2.4)'; ring.style.opacity = '0';
    });
  });
  window.__label = (t,x,y) => {
    lbl.textContent = t;
    lbl.style.left = (x+18)+'px'; lbl.style.top = (y-16)+'px'; lbl.style.opacity = '1';
  };
  window.__unlabel = () => { lbl.style.opacity = '0'; };
})();
`;

async function injectCursor(page) {
  await page.evaluate(CURSOR_SCRIPT).catch(() => {});
}

async function moveTo(page, x, y) {
  await page.mouse.move(x, y, { steps: 20 });
}

/** Move to element centre, show label, click, wait. */
async function tap(page, selector, label = '', waitMs = 700) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 7000 }).catch(() => {});
  const box = await loc.boundingBox().catch(() => null);
  if (!box) { await loc.click().catch(() => {}); await page.waitForTimeout(waitMs); return; }
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  await page.mouse.move(cx, cy, { steps: 22 });
  await page.waitForTimeout(250);
  if (label) await page.evaluate(([t,x,y]) => window.__label?.(t,x,y), [label,cx,cy]);
  await page.waitForTimeout(350);
  await page.mouse.click(cx, cy);
  if (label) setTimeout(() => page.evaluate(() => window.__unlabel?.()).catch(() => {}), 900);
  await page.waitForTimeout(waitMs);
}

/** Hover without clicking. */
async function hover(page, selector, label = '', waitMs = 800) {
  const loc = page.locator(selector).first();
  const box = await loc.boundingBox().catch(() => null);
  if (!box) return;
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  await page.mouse.move(cx, cy, { steps: 18 });
  if (label) await page.evaluate(([t,x,y]) => window.__label?.(t,x,y), [label,cx,cy]);
  await page.waitForTimeout(waitMs);
  await page.evaluate(() => window.__unlabel?.()).catch(() => {});
}

/** Type with realistic per-character delay. */
async function typeIn(page, selector, text) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const box = await loc.boundingBox().catch(() => null);
  if (box) await page.mouse.move(box.x+box.width/2, box.y+box.height/2, { steps: 10 });
  await loc.click().catch(() => {});
  await page.waitForTimeout(200);
  for (const ch of text) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(50 + Math.random() * 60);
  }
  await page.waitForTimeout(300);
}

/** Show a floating label at an arbitrary position. */
async function showLabel(page, text, x, y, durationMs = 1200) {
  await page.evaluate(([t,x,y]) => window.__label?.(t,x,y), [text,x,y]);
  await page.waitForTimeout(durationMs);
  await page.evaluate(() => window.__unlabel?.()).catch(() => {});
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
(async () => {
  const browser = await chromium.launch({
    headless: false,   // visible window → proper React rendering
    args: ['--window-size=1280,800', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1.5,
    recordVideo: { dir: VIDEO_DIR, size: { width: W, height: H } },
  });
  const page = await ctx.newPage();
  page.on('load', () => injectCursor(page).catch(() => {}));

  console.log('\n=== IPL Coach 2026 — Demo Recording ===\n');

  /* ── 1. Login page ─────────────────────────────────────────────────────── */
  console.log('[1/10] Login page');
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await injectCursor(page);
  await page.waitForTimeout(2000);
  await moveTo(page, 640, 300);
  await page.waitForTimeout(600);

  /* ── 2. Fill credentials ───────────────────────────────────────────────── */
  console.log('[2/10] Filling credentials');
  await typeIn(page, 'input[type="email"]',    EMAIL);
  await typeIn(page, 'input[type="password"]', PASS);
  await page.waitForTimeout(500);

  /* ── 3. Sign in → Home ─────────────────────────────────────────────────── */
  console.log('[3/10] Signing in');
  await tap(page, 'button[type="submit"]', 'Sign In →', 400);
  await page.waitForURL(`${BASE}/`, { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await injectCursor(page);
  await page.waitForTimeout(2200);

  /* ── 4. Home — hover first match card (lift animation) ─────────────────── */
  console.log('[4/10] Home — card hover');
  const cards = page.locator('div').filter({ hasText: /RCB|CSK|MI|KKR/ }).first();
  const cb = await cards.boundingBox().catch(() => null);
  if (cb) {
    await page.mouse.move(cb.x + cb.width/2, cb.y + cb.height/2, { steps: 22 });
    await showLabel(page, 'Hover → lift animation', cb.x + cb.width/2, cb.y - 20, 1400);
  }
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(600);

  /* ── 5. Navigate to Navbar links ──────────────────────────────────────── */
  console.log('[5/10] Navbar');
  await hover(page, 'a[href="/leaderboard"]', 'Leaderboard', 600);
  await hover(page, 'a[href="/"]',            'Matches',     500);

  /* ── 6. Match room — upcoming ─────────────────────────────────────────── */
  console.log('[6/10] Match Room — upcoming');
  await page.goto(`${BASE}/match/2`);
  await page.waitForLoadState('networkidle');
  await injectCursor(page);
  await page.waitForTimeout(2200);

  // Show breadcrumb
  await hover(page, 'nav a, a[href="/"]', 'Breadcrumb nav', 600);

  // Show how-to-play if present
  const howBtn = page.locator('button').filter({ hasText: /how to play/i }).first();
  if (await howBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tap(page, 'button:has-text("How to play")', 'Open guide', 1000);
    await tap(page, 'button:has-text("How to play")', 'Close guide', 500);
  }

  /* ── 7. Start match → live state ─────────────────────────────────────── */
  console.log('[7/10] Starting match');
  const startBtn = page.locator('button').filter({ hasText: /start match/i }).first();
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tap(page, 'button:has-text("Start Match")', 'Start Match!', 500);
    await page.waitForTimeout(5000);   // wait for WS + first ball
    await injectCursor(page);
    await page.waitForTimeout(1500);

    // Scroll to show scoreboard + decision panel
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(800);
    await showLabel(page, 'Live scoreboard', 200, 200, 1000);
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(500);
  } else {
    await showLabel(page, 'Match room UI', 640, 400, 1200);
  }

  /* ── 8. Leaderboard ───────────────────────────────────────────────────── */
  console.log('[8/10] Leaderboard');
  await page.goto(`${BASE}/leaderboard`);
  await page.waitForLoadState('networkidle');
  await injectCursor(page);
  await page.waitForTimeout(2400);   // podium + row stagger

  await showLabel(page, 'Top 3 Podium', 500, 220, 1000);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(600);

  /* ── 9. Coach Report Card ─────────────────────────────────────────────── */
  console.log('[9/10] Report Card (match 1)');
  await page.goto(`${BASE}/match/1/report`);
  await page.waitForLoadState('networkidle');
  await injectCursor(page);
  await page.waitForTimeout(2800);

  await showLabel(page, 'AI-powered session report', 640, 80, 1200);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, -800);
  await page.waitForTimeout(600);

  /* ── 10. Strategy Room ────────────────────────────────────────────────── */
  console.log('[10/10] Strategy Room');
  await page.goto(`${BASE}/match/2/strategy`);
  await page.waitForLoadState('networkidle');
  await injectCursor(page);
  await page.waitForTimeout(2200);
  await moveTo(page, 640, 400);
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(1500);

  console.log('\n=== Stopping ===');
  const rawPath = await page.video()?.path();
  await page.close();
  await ctx.close();
  await browser.close();

  if (!rawPath || !existsSync(rawPath)) {
    console.error('No video at', rawPath); process.exit(1);
  }
  console.log('Raw WebM:', rawPath);

  /* ─── Encode MP4 (short, ~60 s highlight) ─────────────────────────────── */
  // Get actual duration (format-level, works on Playwright webm)
  const durRaw = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${rawPath}"`
  ).toString().trim();
  const dur = parseFloat(durRaw) || 999;
  console.log(`Total duration: ${Math.round(dur)}s`);

  // Short: first 75 s
  const shortEnd = Math.min(75, dur);
  const shortMp4 = path.join(ASSETS_DIR, 'demo.mp4');
  console.log('\n=== Encoding short MP4 ===');
  execSync(
    `ffmpeg -y -i "${rawPath}" -t ${shortEnd} ` +
    `-vf "scale=1200:-2:flags=lanczos" -c:v libx264 -crf 20 -preset fast -movflags +faststart ` +
    `"${shortMp4}"`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );

  // Extended: full video
  const extMp4 = path.join(ASSETS_DIR, 'demo-highlight.mp4');
  console.log('\n=== Encoding extended MP4 ===');
  execSync(
    `ffmpeg -y -i "${rawPath}" ` +
    `-vf "scale=1200:-2:flags=lanczos" -c:v libx264 -crf 22 -preset fast -movflags +faststart ` +
    `"${extMp4}"`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );

  /* ─── Encode GIF from short MP4 ───────────────────────────────────────── */
  const gifOut = path.join(ASSETS_DIR, 'demo.gif');
  const pal    = path.join(VIDEO_DIR,  'palette.png');
  const filt   = 'fps=10,scale=760:-1:flags=lanczos';
  console.log('\n=== Encoding GIF ===');
  execSync(`ffmpeg -y -i "${shortMp4}" -vf "${filt},palettegen=stats_mode=diff" "${pal}"`,
    { stdio: 'inherit', shell: '/bin/zsh' });
  execSync(
    `ffmpeg -y -i "${shortMp4}" -i "${pal}" ` +
    `-filter_complex "${filt}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" "${gifOut}"`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );

  const kb = f => (existsSync(f)
    ? `${(parseInt(execSync(`stat -f %z "${f}"`).toString().trim())/1024/1024).toFixed(1)} MB`
    : 'missing');

  console.log(`\ndemo.mp4          : ${kb(shortMp4)}`);
  console.log(`demo-highlight.mp4: ${kb(extMp4)}`);
  console.log(`demo.gif          : ${kb(gifOut)}`);
  console.log('\nAll done!');
})();
