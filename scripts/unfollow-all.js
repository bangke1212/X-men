/**
 * Unfollow Semua Following — Browser Console Script
 * 
 * Cara pakai:
 * 1. Buka https://x.com/USERNAME_KAMU/following
 * 2. F12 → Console
 * 3. Paste script ini → Enter
 * 
 * ⚠️ WARNING: Ini akan unfollow SEMUA following termasuk yang follow balik!
 */

(() => {
  const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));

  let totalUnfollowed = 0;
  let totalSkippedPremium = 0;

  const isVerified = (cell) => {
    return cell?.querySelector('[data-testid="icon-verified"]') !== null;
  };

  const run = async () => {
    const unfollowButtons = [...document.querySelectorAll('[data-testid$="-unfollow"]')];

    if (unfollowButtons.length === 0) {
      console.log('✅ Selesai! Tidak ada lagi yang bisa di-unfollow.');
      return;
    }

    console.log(`🔍 Found ${unfollowButtons.length} to unfollow...`);

    for (const btn of unfollowButtons) {
      const cell = btn.closest('[data-testid="UserCell"]');
      const nameEl = cell?.querySelector('[data-testid="UserName"]');
      const name = nameEl?.querySelector('span')?.textContent?.trim() || 'unknown';

      // Skip premium
      if (isVerified(cell)) {
        console.log(`⏭️  Skip premium: ${name}`);
        totalSkippedPremium++;
        continue;
      }

      btn.click();
      await sleep(1);
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        totalUnfollowed++;
        console.log(`❌ Unfollowed: ${name}`);
      }
      await sleep(2);
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(3);

    const remaining = document.querySelectorAll('[data-testid$="-unfollow"]');
    if (remaining.length > 0) {
      console.log(`🔄 ${remaining.length} remaining...`);
      run();
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SELESAI!');
      console.log(`   Unfollowed: ${totalUnfollowed}`);
      console.log(`   Skipped (premium): ${totalSkippedPremium}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  console.log('🚀 XActions Lite — Unfollow ALL (Skip Premium)');
  console.log('⚠️  WARNING: Ini unfollow SEMUA (termasuk yg follow balik)!');
  console.log('⏳ Starting in 5 seconds... Press Ctrl+C to cancel');
  
  setTimeout(() => {
    console.log('▶️  Go!');
    run();
  }, 5000);
})();
