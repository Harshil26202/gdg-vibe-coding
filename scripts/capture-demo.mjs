/**
 * Interactive demo video recorder for IPL Coach 2026.
 * Uses Playwright video recording + injected cursor overlay + simulated clicks.
 *
 * Run: node scripts/capture-demo.mjs
 * Requires: app running on localhost:5173 (docker compose up)
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

/* ─── Cursor overlay (injected into every page) ─────────────────────────── */
const CURSOR_SCRIPT = `
(function() {
  if (document.getElementById('__demo_cursor__')) return;

  /* ring that ripples on click */
  const ring = document.createElement('div');
  ring.id = '__demo_cursor_ring__';
  Object.assign(ring.style, {
    position:'fixed', width:'48px', height:'48px', borderRadius:'50%',
    border:'2.5px solid rgba(249,115,22,0.9)', pointerEvents:'none',
    transform:'translate(-50%,-50%) scale(0)', opacity:'0',
    zIndex:'99998', transition:'none', top:'0', left:'0',
  });
  document.body.appendChild(ring);

  /* dot that follows the cursor */
  const dot = document.createElement('div');
  dot.id = '__demo_cursor__';
  Object.assign(dot.style, {
    position:'fixed', width:'22px', height:'22px', borderRadius:'50%',
    background:'rgba(249,115,22,0.5)', border:'2px solid rgba(249,115,22,1)',
    pointerEvents:'none', transform:'translate(-50%,-50%)',
    transition:'left 0.06s ease, top 0.06s ease',
    zIndex:'99999', boxShadow:'0 0 14px rgba(249,115,22,0.7)',
    top:'0', left:'0',
  });
  document.body.appendChild(dot);

  /* label that appears on hover/click */
  const label = document.createElement('div');
  label.id = '__demo_label__';
  Object.assign(label.style, {
    position:'fixed', background:'rgba(249,115,22,0.92)', color:'#fff',
    fontSize:'11px', fontFamily:'system-ui,sans-serif', fontWeight:'700',
    padding:'3px 9px', borderRadius:'12px', pointerEvents:'none',
    zIndex:'99997', opacity:'0', transition:'opacity 0.2s',
    whiteSpace:'nowrap', top:'0', left:'0',
  });
  document.body.appendChild(label);

  document.addEventListener('mousemove', e => {
    dot.style.left = e.clientX + 'px';
    dot.style.top  = e.clientY + 'px';
  });

  document.addEventListener('click', e => {
    ring.style.left       = e.clientX + 'px';
    ring.style.top        = e.clientY + 'px';
    ring.style.transition = 'none';
    ring.style.transform  = 'translate(-50%,-50%) scale(0)';
    ring.style.opacity    = '1';
    requestAnimationFrame(() => {
      ring.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
      ring.style.transform  = 'translate(-50%,-50%) scale(2.2)';
      ring.style.opacity    = '0';
    });
  });

  /* expose helpers so Playwright evaluate() can drive label */
  window.__showLabel = (text, x, y) => {
    label.textContent = text;
    label.style.left    = (x + 18) + 'px';
    label.style.top     = (y - 12) + 'px';
    label.style.opacity = '1';
  };
  window.__hideLabel = () => { label.style.opacity = '0'; };
})();
`;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
async function ensureCursor(page) {
  await page.evaluate(CURSOR_SCRIPT).catch(() => {});
}

/** Move mouse smoothly to element centre, show label, click, then wait. */
async function uiClick(page, selector, label = '', waitMs = 700) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
  const box = await loc.boundingBox().catch(() => null);
  if (!box) { await loc.click().catch(() => {}); await page.waitForTimeout(waitMs); return; }
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy, { steps: 18 });
  await page.waitForTimeout(220);
  if (label) await page.evaluate(([t, x, y]) => window.__showLabel?.(t, x, y), [label, cx, cy]);
  await page.waitForTimeout(300);
  await page.mouse.click(cx, cy);
  if (label) setTimeout(() => page.evaluate(() => window.__hideLabel?.()).catch(() => {}), 900);
  await page.waitForTimeout(waitMs);
}

/** Hover over element centre with label — no click. */
async function uiHover(page, selector, label = '', waitMs = 700) {
  const loc = page.locator(selector).first();
  const box = await loc.boundingBox().catch(() => null);
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy, { steps: 16 });
  await page.waitForTimeout(120);
  if (label) await page.evaluate(([t, x, y]) => window.__showLabel?.(t, x, y), [label, cx, cy]);
  await page.waitForTimeout(waitMs);
  if (label) await page.evaluate(() => window.__hideLabel?.()).catch(() => {});
}

/** Type character-by-character to look natural. */
async function uiType(page, selector, text, label = '') {
  const loc = page.locator(selector).first();
  const box = await loc.boundingBox().catch(() => null);
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await loc.click().catch(() => {});
  await page.waitForTimeout(200);
  if (label) await page.evaluate(([t, x, y]) => window.__showLabel?.(t, x, y), [label, box?.x ?? 0, box?.y ?? 0]);
  for (const ch of text) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(45 + Math.random() * 55);
  }
  await page.evaluate(() => window.__hideLabel?.()).catch(() => {});
  await page.waitForTimeout(350);
}

/* ─── Main recording ─────────────────────────────────────────────────────── */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1.5,
    recordVideo: { dir: VIDEO_DIR, size: { width: W, height: H } },
  });
  const page = await ctx.newPage();

  // Re-inject cursor after every full navigation
  page.on('load', () => page.evaluate(CURSOR_SCRIPT).catch(() => {}));

  console.log('\n=== IPL Coach 2026 — Interactive Demo Recording ===\n');

  /* ── 1. Login page ───────────────────────────────────────────────────────── */
  console.log('[1/12] Login page — initial view');
  await page.goto(`${BASE}/login`);
  await ensureCursor(page);
  await page.waitForTimeout(1800);

  // Hover logo / headline
  await page.mouse.move(640, 200, { steps: 20 });
  await page.waitForTimeout(900);

  /* ── 2. Fill login credentials ───────────────────────────────────────────── */
  console.log('[2/12] Filling login form');
  await uiType(page, 'input[type="email"]',    EMAIL, 'Enter email');
  await uiType(page, 'input[type="password"]', PASS,  'Enter password');
  await page.waitForTimeout(400);

  /* ── 3. Submit → Home ────────────────────────────────────────────────────── */
  console.log('[3/12] Submitting login');
  await uiClick(page, 'button[type="submit"]', 'Sign In →', 400);
  await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
  await ensureCursor(page);
  await page.waitForTimeout(2200);   // let page-fade + card stagger finish

  /* ── 4. Home — hover match card ──────────────────────────────────────────── */
  console.log('[4/12] Home — browsing match cards');
  // Hover first match card (lift animation)
  const card1 = page.locator('div[style*="cursor: pointer"]').first();
  const card1Box = await card1.boundingBox().catch(() => null);
  if (card1Box) {
    await page.mouse.move(card1Box.x + card1Box.width / 2, card1Box.y + card1Box.height / 2, { steps: 20 });
    await page.evaluate(([t,x,y]) => window.__showLabel?.(t,x,y), ['Hover: lift animation', card1Box.x + card1Box.width/2, card1Box.y + card1Box.height/2]);
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.__hideLabel?.());
  }
  // Scroll to reveal second card
  await page.mouse.wheel(0, 280);
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, -280);
  await page.waitForTimeout(600);

  /* ── 5. Navbar — hover each link ─────────────────────────────────────────── */
  console.log('[5/12] Navbar links');
  await uiHover(page, 'a[href="/leaderboard"]', 'Leaderboard', 600);
  await uiHover(page, 'a[href="/"]',            'Home',        500);

  /* ── 6. Enter Match Room (upcoming) ──────────────────────────────────────── */
  console.log('[6/12] Match Room — upcoming state');
  await page.goto(`${BASE}/match/2`);
  await ensureCursor(page);
  await page.waitForTimeout(2200);

  // Hover breadcrumb
  await uiHover(page, 'a[href="/"]', 'Breadcrumb nav', 500);
  await page.waitForTimeout(300);

  // Hover the "How to play" toggle if present
  const howToPlay = page.locator('button:has-text("How to play")').first();
  if (await howToPlay.isVisible().catch(() => false)) {
    await uiClick(page, 'button:has-text("How to play")', 'Open guide', 900);
    await uiClick(page, 'button:has-text("How to play")', 'Close guide', 500);
  }

  /* ── 7. Start match + live view ───────────────────────────────────────────── */
  console.log('[7/12] Starting match simulation');
  await uiClick(page, 'button:has-text("Start Match")', 'Start Match!', 400);
  await page.waitForTimeout(4000);   // WebSocket connects, ball delivered
  await ensureCursor(page);
  await page.waitForTimeout(1000);

  // Scroll so decision panel is visible
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(600);

  /* ── 8. Make a decision ───────────────────────────────────────────────────── */
  console.log('[8/12] Making a captain decision');
  // Try generic option buttons inside decision panel
  const optionBtn = page.locator('button').filter({ hasText: /^[A-Z]/ }).nth(1);
  if (await optionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await uiHover(page, 'button', 'Hover option', 600);
    await uiClick(page, 'button:has-text("Confirm")', 'Confirm decision', 400)
      .catch(() => optionBtn.click().catch(() => {}));
    await page.waitForTimeout(3000);   // wait for feedback modal
    await ensureCursor(page);
    await page.waitForTimeout(1200);
    // Close feedback
    await uiClick(page, 'button:has-text("Continue")', 'Continue Watching', 600)
      .catch(() => {});
  }
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(600);

  /* ── 9. Scoreboard animations ─────────────────────────────────────────────── */
  console.log('[9/12] Scoreboard — score counter & ball-by-ball');
  await page.mouse.move(300, 300, { steps: 12 });
  await page.waitForTimeout(2000);

  /* ── 10. Leaderboard ──────────────────────────────────────────────────────── */
  console.log('[10/12] Leaderboard');
  await page.goto(`${BASE}/leaderboard`);
  await ensureCursor(page);
  await page.waitForTimeout(2200);   // podium + row stagger animations

  // Hover a podium entry
  const podiumEntry = page.locator('div[style*="flex-direction: column"]').nth(2);
  const podiumBox = await podiumEntry.boundingBox().catch(() => null);
  if (podiumBox) {
    await page.mouse.move(podiumBox.x + podiumBox.width/2, podiumBox.y + podiumBox.height/2, { steps: 15 });
    await page.evaluate(([t,x,y]) => window.__showLabel?.(t,x,y), ['Top 3 Podium', podiumBox.x + podiumBox.width/2, podiumBox.y]);
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__hideLabel?.());
  }

  // Scroll through table rows
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(600);

  /* ── 11. Report Card ──────────────────────────────────────────────────────── */
  console.log('[11/12] Coach Report Card');
  await page.goto(`${BASE}/match/1/report`);
  await ensureCursor(page);
  await page.waitForTimeout(2800);

  await page.evaluate(() => window.__showLabel?.('AI-powered session analysis', 640, 80));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__hideLabel?.());
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, -800);
  await page.waitForTimeout(600);

  /* ── 12. Strategy Room + fade out ────────────────────────────────────────── */
  console.log('[12/12] Strategy Room');
  await page.goto(`${BASE}/match/2/strategy`);
  await ensureCursor(page);
  await page.waitForTimeout(2200);
  await page.mouse.move(640, 400, { steps: 18 });
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(1200);

  // ── final pause ──
  await page.waitForTimeout(1500);

  console.log('\n=== Stopping recording ===');
  const videoPath = await page.video()?.path();
  await page.close();
  await ctx.close();
  await browser.close();

  if (!videoPath || !existsSync(videoPath)) {
    console.error('ERROR: No video file found at', videoPath);
    process.exit(1);
  }
  console.log(`Raw WebM: ${videoPath}`);

  /* ─── Convert → MP4 (primary deliverable) ─────────────────────────────── */
  const mp4Out = path.join(ASSETS_DIR, 'demo.mp4');
  console.log('\n=== Encoding MP4 ===');
  execSync(
    `ffmpeg -y -i "${videoPath}" ` +
    `-vf "scale=1200:-2:flags=lanczos" ` +
    `-c:v libx264 -crf 20 -preset fast -movflags +faststart ` +
    `"${mp4Out}"`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );

  /* ─── Convert → GIF (README embed) ────────────────────────────────────── */
  const gifOut      = path.join(ASSETS_DIR, 'demo.gif');
  const paletteFile = path.join(VIDEO_DIR,  'palette.png');
  const gifFilter   = 'fps=14,scale=1100:-1:flags=lanczos';

  console.log('\n=== Encoding GIF (2-pass) ===');
  execSync(
    `ffmpeg -y -i "${mp4Out}" ` +
    `-vf "${gifFilter},palettegen=stats_mode=diff" ` +
    `"${paletteFile}"`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );
  execSync(
    `ffmpeg -y -i "${mp4Out}" -i "${paletteFile}" ` +
    `-filter_complex "${gifFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" ` +
    `"${gifOut}"`,
    { stdio: 'inherit', shell: '/bin/zsh' }
  );

  const statKb = f => Math.round(
    execSync(`stat -f %z "${f}"`).toString().trim() / 1024
  );
  console.log(`\nMP4 → docs/assets/demo.mp4  (${statKb(mp4Out)} KB)`);
  console.log(`GIF → docs/assets/demo.gif  (${statKb(gifOut)} KB)`);
  console.log('\nAll done!');
})();
