/**
 * XActions Lite — Dashboard Server
 * Express + WebSocket untuk real-time unfollow dashboard
 */

import 'dotenv/config';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'src', 'web', 'views'));
app.use(express.static(path.join(__dirname, '..', 'src', 'web', 'public')));
app.use(express.json());

// In-memory state (reset setiap restart)
let sessionState = {
  status: 'idle', // idle | running | paused | done
  username: '',
  startTime: null,
  totalProcessed: 0,
  unfollowed: [],
  skippedPremium: [],
  skippedFollowsBack: [],
  errors: [],
  estimatedTotal: 0,
  progress: 0,
  delaySeconds: 60,
  lastAction: null,
  startCount: 0,
};

// Broadcast ke semua WebSocket clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  ws.send(JSON.stringify({ type: 'state', data: sessionState }));
});

// ─── ROUTES ──────────────────────────────────────────────

// Dashboard utama
app.get('/', (req, res) => {
  res.render('dashboard', { state: sessionState });
});

// API: Get current state
app.get('/api/state', (req, res) => {
  res.json(sessionState);
});

// API: Start unfollow session (background via Puppeteer)
app.post('/api/start', async (req, res) => {
  const { username, limit = 200, delaySeconds = 60, skipPremium = true } = req.body;

  if (!username) return res.status(400).json({ error: 'Username required' });

  if (sessionState.status === 'running') {
    return res.status(400).json({ error: 'Session already running' });
  }

  // Reset state
  sessionState = {
    status: 'running',
    username,
    startTime: new Date().toISOString(),
    totalProcessed: 0,
    unfollowed: [],
    skippedPremium: [],
    skippedFollowsBack: [],
    errors: [],
    estimatedTotal: 0,
    progress: 0,
    delaySeconds,
    lastAction: null,
    startCount: 0,
  };

  broadcast({ type: 'state', data: sessionState });

  // Jalankan di background
  runUnfollow(username, limit, delaySeconds, skipPremium).catch(err => {
    console.error('Unfollow error:', err);
    sessionState.status = 'error';
    sessionState.errors.push({ time: new Date().toISOString(), message: err.message });
    broadcast({ type: 'state', data: sessionState });
  });

  res.json({ success: true, message: 'Unfollow session started' });
});

// API: Pause
app.post('/api/pause', (req, res) => {
  sessionState.status = 'paused';
  broadcast({ type: 'state', data: sessionState });
  res.json({ success: true });
});

// API: Resume
app.post('/api/resume', (req, res) => {
  sessionState.status = 'running';
  broadcast({ type: 'state', data: sessionState });
  res.json({ success: true });
});

// API: Stop
app.post('/api/stop', (req, res) => {
  sessionState.status = 'done';
  broadcast({ type: 'state', data: sessionState });
  res.json({ success: true });
});

// ─── UNFOLLOW LOGIC ──────────────────────────────────────

async function runUnfollow(username, limit, delaySeconds, skipPremium) {
  const { createBrowser, createPage } = await import('../src/browser.js');
  const { loginWithCookie } = await import('../src/auth.js');

  const browser = await createBrowser({ headless: true });
  const page = await createPage(browser);

  try {
    const authToken = process.env.X_AUTH_TOKEN;
    if (authToken) await loginWithCookie(page, authToken);

    const url = `https://x.com/${username}/following`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    await sleep(3000);

    let retries = 0;
    const maxRetries = 20;

    while (
      sessionState.status === 'running' &&
      sessionState.totalProcessed < limit &&
      retries < maxRetries
    ) {
      // Pause check
      if (sessionState.status === 'paused') {
        await sleep(1000);
        continue;
      }

      // Jika status diubah ke 'done' dari luar
      if (sessionState.status === 'done') break;

      const cells = await page.$$('[data-testid="UserCell"]');

      for (const cell of cells) {
        if (sessionState.status !== 'running' || sessionState.totalProcessed >= limit) break;

        try {
          const info = await cell.evaluate(el => {
            const links = el.querySelectorAll('a');
            const nameEl = el.querySelector('[data-testid="UserName"]');
            const verified = !!el.querySelector('[data-testid="icon-verified"]');
            const followsBack = !!el.querySelector('[data-testid="userFollowIndicator"]');
            return {
              username: links[1]?.href?.split('/')[3]?.toLowerCase() || null,
              name: nameEl?.querySelector('span')?.textContent?.trim() || null,
              isVerified: verified,
              followsBack,
            };
          });

          if (!info.username) continue;

          sessionState.totalProcessed++;

          // Cek apakah harus di-unfollow
          let shouldUnfollowUser = false;

          if (info.followsBack) {
            sessionState.skippedFollowsBack.push({
              username: info.username,
              name: info.name,
              reason: 'Follows back',
              time: new Date().toISOString(),
            });
            sessionState.lastAction = `⏭️ Skip (follows back): @${info.username}`;
          } else if (skipPremium && info.isVerified) {
            sessionState.skippedPremium.push({
              username: info.username,
              name: info.name,
              reason: 'Premium/Verified',
              time: new Date().toISOString(),
            });
            sessionState.lastAction = `⏭️ Skip (premium): @${info.username}`;
          } else {
            shouldUnfollowUser = true;
          }

          if (shouldUnfollowUser) {
            const unfollowBtn = await cell.$('[data-testid$="-unfollow"]');
            if (unfollowBtn) {
              await unfollowBtn.click();
              await sleep(1000);
              const confirmBtn = await page.$('[data-testid="confirmationSheetConfirm"]');
              if (confirmBtn) {
                await confirmBtn.click();
                sessionState.unfollowed.push({
                  username: info.username,
                  name: info.name,
                  isPremium: info.isVerified,
                  time: new Date().toISOString(),
                });
                sessionState.lastAction = `❌ Unfollowed: @${info.username} (${info.name})`;
              }
            }

            // JEDA 1 MENIT (atau custom)
            sessionState.lastAction = `⏳ Waiting ${delaySeconds}s...`;
            broadcast({ type: 'state', data: sessionState });
            await sleep(delaySeconds * 1000);
          }

          // Update progress
          sessionState.progress = Math.round((sessionState.unfollowed.length / limit) * 100);
          broadcast({ type: 'state', data: sessionState });

        } catch (e) {
          sessionState.errors.push({
            time: new Date().toISOString(),
            message: e.message,
          });
        }
      }

      // Scroll untuk load lebih
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(3000);

      // Cek apakah masih ada cell baru
      const newCells = await page.$$('[data-testid="UserCell"]');
      if (newCells.length <= cells.length) {
        retries++;
      } else {
        retries = 0;
      }
    }

    sessionState.status = 'done';
    broadcast({ type: 'state', data: sessionState });
    broadcast({ type: 'complete', data: sessionState });

  } catch (err) {
    sessionState.status = 'error';
    sessionState.errors.push({ time: new Date().toISOString(), message: err.message });
    broadcast({ type: 'state', data: sessionState });
  } finally {
    await browser.close();
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── START SERVER ────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 XActions Dashboard running at http://localhost:${PORT}`);
});
