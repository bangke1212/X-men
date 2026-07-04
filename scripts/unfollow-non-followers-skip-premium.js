/**
 * Unfollow Non-Followers (Skip Premium/Verified) — Browser Console Script
 * 
 * Cara pakai:
 * 1. Buka https://x.com/USERNAME_KAMU/following
 * 2. F12 → Console
 * 3. Paste script ini → Enter
 * 
 * Script ini akan unfollow akun yang TIDAK follow balik,
 * TAPI skip/lewati akun premium/verified (blue checkmark).
 */

(() => {
  const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));

  let totalUnfollowed = 0;
  let totalSkippedPremium = 0;
  let totalSkippedFollowsBack = 0;

  const isVerified = (cell) => {
    return cell?.querySelector('[data-testid="icon-verified"]') !== null;
  };

  const followsBack = (cell) => {
    return cell?.querySelector('[data-testid="userFollowIndicator"]') !== null;
  };

  const run = async () => {
    const cells = [...document.querySelectorAll('[data-testid="UserCell"]')];

    for (const cell of cells) {
      const nameEl = cell.querySelector('[data-testid="UserName"]');
      const name = nameEl?.querySelector('span')?.textContent?.trim() || 'unknown';
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.href?.split('/')[3] || 'unknown';

      // Skip kalau follow balik
      if (followsBack(cell)) {
        totalSkippedFollowsBack++;
        continue;
      }

      // Skip kalau premium/verified
      if (isVerified(cell)) {
        console.log(`⏭️  Skip premium: @${username} (${name})`);
        totalSkippedPremium++;
        continue;
      }

      // Unfollow
      const unfollowBtn = cell.querySelector('[data-testid$="-unfollow"]');
      if (unfollowBtn) {
        unfollowBtn.click();
        await sleep(1);
        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          console.log(`❌ Unfollowed: @${username} (${name})`);
        }
        await sleep(2);
      }
    }

    // Scroll & ulangi
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(3);

    // Cek masih ada yang tersisa?
    const remainingCells = [...document.querySelectorAll('[data-testid="UserCell"]')];
    const remaining = remainingCells.filter(c => !followsBack(c) && !isVerified(c));

    if (remaining.length > 0) {
      console.log(`🔄 ${remaining.length} remaining, continue...`);
      run();
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SELESAI!');
      console.log(`   Unfollowed: ${totalUnfollowed}`);
      console.log(`   Skipped (premium): ${totalSkippedPremium}`);
      console.log(`   Skipped (follows back): ${totalSkippedFollowsBack}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  console.log('🚀 XActions Lite — Unfollow Non-Followers (Skip Premium)');
  console.log('⏳ Starting...');
  console.log('⚡ Will UNFOLLOW: non-followers, non-premium');
  console.log('⏭️  Will SKIP: premium/verified accounts + accounts that follow back');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
  run();
})();
