/**
 * XActions Lite Dashboard — Frontend JS
 * WebSocket + UI Updates Real-time
 */

let ws;
let reconnectTimer;

// ─── WEBSOCKET ────────────────────────────────────────────

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('🔌 WebSocket connected');
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'state') {
      updateUI(msg.data);
    }
    if (msg.type === 'complete') {
      showComplete(msg.data);
    }
  };

  ws.onclose = () => {
    console.log('🔌 WebSocket disconnected, reconnecting...');
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };
}

// ─── UI UPDATE ────────────────────────────────────────────

function updateUI(state) {
  // Status badge
  const badge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const statusMap = {
    idle: 'Idle', running: 'Running', paused: 'Paused',
    done: 'Completed', error: 'Error',
  };

  badge.className = 'status-badge ' + state.status;
  statusText.textContent = statusMap[state.status] || state.status;

  // Stats
  document.getElementById('statUnfollowed').textContent = state.unfollowed?.length || 0;
  document.getElementById('statSkippedPremium').textContent = state.skippedPremium?.length || 0;
  document.getElementById('statSkippedFollows').textContent = state.skippedFollowsBack?.length || 0;
  document.getElementById('statTotal').textContent = state.totalProcessed || 0;
  document.getElementById('statProgress').textContent = (state.progress || 0) + '%';
  document.getElementById('progressFill').style.width = (state.progress || 0) + '%';

  // Errors
  const errorCard = document.getElementById('errorCard');
  const statErrors = document.getElementById('statErrors');
  if (state.errors?.length > 0) {
    errorCard.style.display = '';
    statErrors.textContent = state.errors.length;
  } else {
    errorCard.style.display = 'none';
  }

  // Estimated time remaining
  const unfollowedCount = state.unfollowed?.length || 0;
  if (unfollowedCount > 0 && state.status === 'running') {
    const elapsed = (Date.now() - new Date(state.startTime).getTime()) / 1000;
    const rate = unfollowedCount / (elapsed / 60); // unfollows per minute
    const remaining = (state.estimatedTotal || 200) - unfollowedCount;
    const estMinutes = rate > 0 ? remaining / rate : 0;

    document.getElementById('statEstTime').textContent =
      estMinutes > 60
        ? `${Math.round(estMinutes / 60)}h ${Math.round(estMinutes % 60)}m`
        : `${Math.round(estMinutes)} min`;

    document.getElementById('statRateInfo').textContent =
      `${rate.toFixed(1)} unfollows/min · ${state.delaySeconds}s delay`;
  }

  // Last action
  if (state.lastAction) {
    document.getElementById('lastActionText').textContent = state.lastAction;
  }

  // Activity log
  updateActivityLog(state);

  // Unfollowed table
  updateUnfollowedTable(state);

  // Button states
  updateButtons(state);
}

function updateActivityLog(state) {
  const log = document.getElementById('activityLog');
  const all = [
    ...(state.unfollowed || []).map(u => ({ ...u, type: 'unfollow' })),
    ...(state.skippedPremium || []).map(u => ({ ...u, type: 'skip-premium' })),
    ...(state.skippedFollowsBack || []).map(u => ({ ...u, type: 'skip-follows' })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 50);

  if (all.length === 0) {
    log.innerHTML = '<div class="empty-state">No activity yet</div>';
    return;
  }

  log.innerHTML = all.map(a => {
    const icon = a.type === 'unfollow' ? '❌' : a.type === 'skip-premium' ? '👑' : '✅';
    const cls = a.type === 'unfollow' ? 'unfollow' : a.type === 'skip-premium' ? 'skip-premium' : 'skip-follows';
    const reason = a.type === 'skip-premium' ? 'Premium' : a.type === 'skip-follows' ? 'Follows back' : 'Unfollowed';
    return `<div class="activity-entry ${cls}">${icon} @${a.username} — ${a.name || ''} (${reason})</div>`;
  }).join('');
}

function updateUnfollowedTable(state) {
  const tbody = document.getElementById('unfollowedBody');
  const unfollowed = (state.unfollowed || []).slice().reverse().slice(0, 100);

  if (unfollowed.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No data yet</td></tr>';
    return;
  }

  tbody.innerHTML = unfollowed.map((u, i) => {
    const time = new Date(u.time).toLocaleTimeString();
    return `
      <tr>
        <td>${unfollowed.length - i}</td>
        <td><strong>@${u.username}</strong></td>
        <td>${u.name || '—'}</td>
        <td>${time}</td>
      </tr>
    `;
  }).join('');
}

function updateButtons(state) {
  const isIdle = state.status === 'idle' || state.status === 'done' || state.status === 'error';
  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';

  document.getElementById('btnStart').disabled = !isIdle;
  document.getElementById('btnPause').disabled = !isRunning;
  document.getElementById('btnResume').disabled = !isPaused;
  document.getElementById('btnStop').disabled = !(isRunning || isPaused);

  // Disable form inputs while running
  document.getElementById('inputUsername').disabled = !isIdle;
  document.getElementById('inputLimit').disabled = !isIdle;
  document.getElementById('inputDelay').disabled = !isIdle;
  document.getElementById('inputSkipPremium').disabled = !isIdle;
}

function showComplete(state) {
  const msg = `✅ Session complete!\n\n` +
    `Unfollowed: ${state.unfollowed?.length || 0}\n` +
    `Skipped Premium: ${state.skippedPremium?.length || 0}\n` +
    `Skipped (Follows back): ${state.skippedFollowsBack?.length || 0}\n` +
    `Total processed: ${state.totalProcessed}`;

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification('XActions Lite — Done!', { body: msg });
  } else if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ─── API CALLS ────────────────────────────────────────────

async function startUnfollow() {
  const username = document.getElementById('inputUsername').value.trim();
  if (!username) return alert('Please enter a username');

  const payload = {
    username,
    limit: parseInt(document.getElementById('inputLimit').value) || 200,
    delaySeconds: parseInt(document.getElementById('inputDelay').value) || 60,
    skipPremium: document.getElementById('inputSkipPremium').checked,
  };

  try {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Failed to start');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function pauseUnfollow() {
  await fetch('/api/pause', { method: 'POST' });
}

async function resumeUnfollow() {
  await fetch('/api/resume', { method: 'POST' });
}

async function stopUnfollow() {
  if (confirm('Stop the unfollow session?')) {
    await fetch('/api/stop', { method: 'POST' });
  }
}

// ─── INIT ─────────────────────────────────────────────────

connectWebSocket();

// Request notification permission on first interaction
document.addEventListener('click', () => {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, { once: true });
