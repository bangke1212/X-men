/**
 * Unfollow Non-Followers (Skip Premium) — 60s Delay + Real-time Counter
 * 
 * Cara pakai:
 * 1. Buka https://x.com/USERNAME_KAMU/following
 * 2. F12 → Console
 * 3. Paste script ini → Enter
 * 
 * Fitur:
 * - ⏱️  Jeda 60 detik antar unfollow (bisa diubah)
 * - 👑  Skip akun premium/verified
 * - ✅  Skip akun yang follow balik
 * - 📊  Panel statistik real-time
 * - ⏳  Estimasi waktu selesai
 * - 📈  Progress bar
 */

(() => {
  // ═══════════ CONFIG ═══════════════════════════════
  const DELAY_SECONDS = 60;          // Jeda antar unfollow (detik)
  const MAX_UNFOLLOW = 0;            // 0 = unlimited, >0 = batas
  const SKIP_PREMIUM = true;         // Skip akun premium/verified
  const SKIP_FOLLOWS_BACK = true;    // Skip akun yang follow balik
  // ═══════════════════════════════════════════════════

  const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));

  // Stats
  let stats = {
    totalProcessed: 0,
    unfollowed: 0,
    skippedPremium: 0,
    skippedFollowsBack: 0,
    errors: 0,
    startTime: Date.now(),
    lastUnfollowTime: null,
    premiumAccounts: [],      // daftar akun premium yang di-skip
    unfollowedAccounts: [],   // daftar akun yang di-unfollow
    skippedAccounts: [],      // daftar akun follow-back yang di-skip
  };

  // Flag untuk stop
  let running = true;

  // ─── COUNTER PANEL ──────────────────────────────────
  const createPanel = () => {
    const panel = document.createElement('div');
    panel.id = 'xactions-panel';
    panel.innerHTML = `
      <style>
        #xactions-panel {
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 99999;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
          width: 280px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          color: #eaeaea;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        #xactions-panel h3 {
          margin: 0 0 12px 0;
          font-size: 15px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .xp-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #2a2a2a;
        }
        .xp-row .xp-label { color: #888; }
        .xp-row .xp-value { font-weight: 700; font-family: 'SF Mono', monospace; }
        .xp-danger { color: #ef4444; }
        .xp-warning { color: #f59e0b; }
        .xp-info { color: #10b981; }
        .xp-progress {
          height: 4px;
          background: #333;
          border-radius: 2px;
          margin: 10px 0;
          overflow: hidden;
        }
        .xp-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          transition: width 0.5s;
        }
        .xp-btn {
          display: block;
          width: 100%;
          padding: 8px;
          margin-top: 10px;
          background: #ef4444;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        .xp-btn:hover { background: #dc2626; }
        .xp-last-action {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
          font-family: 'SF Mono', monospace;
          max-height: 40px;
          overflow: hidden;
        }
        .xp-premium-list {
          margin-top: 8px;
          font-size: 11px;
          color: #f59e0b;
          max-height: 80px;
          overflow-y: auto;
        }
      </style>
      <h3>⚡ XActions — Unfollow</h3>
      <div class="xp-row"><span class="xp-label">Status</span> <span class="xp-value" id="xpStatus">▶️ Running</span></div>
      <div class="xp-row"><span class="xp-label">Processed</span> <span class="xp-value" id="xpProcessed">0</span></div>
      <div class="xp-row"><span class="xp-label">❌ Unfollowed</span> <span class="xp-value xp-danger" id="xpUnfollowed">0</span></div>
      <div class="xp-row"><span class="xp-label">👑 Skipped Premium</span> <span class="xp-value xp-warning" id="xpSkippedPremium">0</span></div>
      <div class="xp-row"><span class="xp-label">✅ Follows Back</span> <span class="xp-value xp-info" id="xpSkippedFollows">0</span></div>
      <div class="xp-row"><span class="xp-label">⚠️ Errors</span> <span class="xp-value" id="xpErrors">0</span></div>
      <div class="xp-progress"><div class="xp-progress-fill" id="xpProgress" style="width:0%"></div></div>
      <div class="xp-row"><span class="xp-label">Est. Remaining</span> <span class="xp-value" id="xpETA">--</span></div>
      <div class="xp-last-action" id="xpLastAction">Waiting...</div>
      <div class="xp-premium-list" id="xpPremiumList"></div>
      <button class="xp-btn" onclick="window.__xactionsStop()">⏹️ STOP</button>
    `;
    document.body.appendChild(panel);
  };

  window.__xactionsStop = () => {
    running = false;
    const statusEl = document.getElementById('xpStatus');
    if (statusEl) statusEl.textContent = '⏹️ Stopped';
  };

  const updatePanel = () => {
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = elapsed > 0 ? stats.unfollowed / (elapsed / 60) : 0;

    // ETA
    let etaText = '--';
    if (stats.unfollowed > 0 && rate > 0) {
      const remaining = MAX_UNFOLLOW > 0
        ? MAX_UNFOLLOW - stats.unfollowed
        : (stats.skippedFollowsBack + stats.skippedPremium + stats.unfollowed) * 1.5;
      const etaMin = remaining / rate;
      etaText = etaMin > 60
        ? `${Math.round(etaMin / 60)}h ${Math.round(etaMin % 60)}m`
        : `${Math.round(etaMin)} min`;
    }

    // Progress (based on total processed vs estimated)
    const estTotal = MAX_UNFOLLOW > 0 ? MAX_UNFOLLOW : 500;
    const progress = Math.min(100, Math.round((stats.unfollowed / estTotal) * 100));

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setWidth = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = val + '%'; };

    setText('xpProcessed', stats.totalProcessed);
    setText('xpUnfollowed', stats.unfollowed);
    setText('xpSkippedPremium', stats.skippedPremium);
    setText('xpSkippedFollows', stats.skippedFollowsBack);
    setText('xpErrors', stats.errors);
    setText('xpETA', etaText);
    setWidth('xpProgress', progress);

    // Last action
    const lastAct = document.getElementById('xpLastAction');
    if (lastAct && stats._lastAction) lastAct.textContent = stats._lastAction;

    // Premium list
    const premiumList = document.getElementById('xpPremiumList');
    if (premiumList && stats.premiumAccounts.length > 0) {
      premiumList.innerHTML = '<div style="color:#888;margin-bottom:4px">Premium skipped:</div>' +
        stats.premiumAccounts.slice(-10).map(a => `@${a}`).join(', ');
    }
  };

  // ─── HELPERS ──────────────────────────────────────
  const isVerified = (cell) => {
    return cell?.querySelector('[data-testid="icon-verified"]') !== null;
  };

  const followsBack = (cell) => {
    return cell?.querySelector('[data-testid="userFollowIndicator"]') !== null;
  };

  const getCellInfo = (cell) => {
    const links = cell.querySelectorAll('a');
    const nameEl = cell.querySelector('[data-testid="UserName"]');
    return {
      username: links[1]?.href?.split('/')[3]?.toLowerCase() || 'unknown',
      name: nameEl?.querySelector('span')?.textContent?.trim() || 'unknown',
    };
  };

  // ─── MAIN LOOP ────────────────────────────────────
  const run = async () => {
    const cells = [...document.querySelectorAll('[data-testid="UserCell"]')];

    for (const cell of cells) {
      if (!running) {
        stats._lastAction = '⏹️ Stopped by user';
        updatePanel();
        return;
      }

      // Cek batas
      if (MAX_UNFOLLOW > 0 && stats.unfollowed >= MAX_UNFOLLOW) {
        stats._lastAction = `✅ Reached limit: ${MAX_UNFOLLOW} unfollows`;
        updatePanel();
        console.log(`✅ Reached limit: ${MAX_UNFOLLOW} unfollows`);
        return;
      }

      stats.totalProcessed++;

      const info = getCellInfo(cell);
      const verified = isVerified(cell);
      const follows = followsBack(cell);

      // ─── CASE 1: Follows back → skip ──────────
      if (follows && SKIP_FOLLOWS_BACK) {
        stats.skippedFollowsBack++;
        stats.skippedAccounts.push(info.username);
        stats._lastAction = `⏭️ Skip (follows back): @${info.username}`;
        updatePanel();
        continue;
      }

      // ─── CASE 2: Premium/Verified → skip ─────
      if (verified && SKIP_PREMIUM) {
        stats.skippedPremium++;
        stats.premiumAccounts.push(info.username);
        console.log(`👑 Skip Premium: @${info.username} (${info.name})`);
        stats._lastAction = `👑 Skip Premium: @${info.username}`;
        updatePanel();
        continue;
      }

      // ─── CASE 3: Unfollow ─────────────────────
      const unfollowBtn = cell.querySelector('[data-testid$="-unfollow"]');
      if (unfollowBtn) {
        try {
          unfollowBtn.click();
          await sleep(1);
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            stats.unfollowed++;
            stats.unfollowedAccounts.push(info.username);
            stats.lastUnfollowTime = Date.now();
            console.log(`❌ [${stats.unfollowed}] Unfollowed: @${info.username} (${info.name})`);
            stats._lastAction = `❌ Unfollowed: @${info.username}`;
            updatePanel();

            // ⏱️ JEDA — hitung mundur
            const statusEl = document.getElementById('xpStatus');
            for (let i = DELAY_SECONDS; i > 0; i--) {
              if (!running) break;
              if (statusEl) statusEl.textContent = `⏳ Waiting ${i}s...`;
              await sleep(1);
            }
            if (statusEl) statusEl.textContent = '▶️ Running';
          }
        } catch (e) {
          stats.errors++;
          console.error('Error:', e.message);
          stats._lastAction = `⚠️ Error: ${e.message}`;
          updatePanel();
        }
      }
    }

    // Scroll & continue
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(2);

    // Cek apakah masih ada yang perlu diproses
    const remainingCells = [...document.querySelectorAll('[data-testid="UserCell"]')];
    const remaining = remainingCells.filter(c => {
      const v = isVerified(c);
      const f = followsBack(c);
      // Yang perlu di-unfollow: bukan premium & bukan follow-back
      return !((v && SKIP_PREMIUM) || (f && SKIP_FOLLOWS_BACK));
    });

    if (remaining.length > 0 && running) {
      console.log(`🔄 ${remaining.length} remaining, continuing...`);
      stats._lastAction = `🔄 ${remaining.length} remaining...`;
      updatePanel();
      run();
    } else {
      const statusEl = document.getElementById('xpStatus');
      if (statusEl) statusEl.textContent = '✅ Complete!';

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SELESAI!');
      console.log(`   Total Processed: ${stats.totalProcessed}`);
      console.log(`   ❌ Unfollowed: ${stats.unfollowed}`);
      console.log(`   👑 Skipped Premium: ${stats.skippedPremium}`);
      console.log(`   ✅ Follows Back: ${stats.skippedFollowsBack}`);
      console.log(`   ⚠️ Errors: ${stats.errors}`);
      console.log(`   ⏱️ Duration: ${Math.round((Date.now() - stats.startTime) / 60000)} min`);
      console.log(`   🏷️ Premium skipped: @${stats.premiumAccounts.join(', @')}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  // ─── START ────────────────────────────────────────
  createPanel();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚡ XActions Lite — Smart Unfollow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏱️  Delay: ${DELAY_SECONDS}s per unfollow`);
  console.log(`👑  Skip premium: ${SKIP_PREMIUM ? 'YES' : 'NO'}`);
  console.log(`✅  Skip follows back: ${SKIP_FOLLOWS_BACK ? 'YES' : 'NO'}`);
  console.log(`📊  Max unfollow: ${MAX_UNFOLLOW > 0 ? MAX_UNFOLLOW : 'unlimited'}`);
  console.log('🛑  Click STOP button or run window.__xactionsStop() to stop');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏳ Starting in 3 seconds...');

  setTimeout(() => run(), 3000);
})();
