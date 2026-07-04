/**
 * Unfollow Non-Followers — Browser Console Script
 * 
 * Cara pakai:
 * 1. Buka https://x.com/USERNAME_KAMU/following
 * 2. F12 → Console
 * 3. Paste script ini → Enter
 * 
 * Script ini akan unfollow akun yang TIDAK follow balik.
 * Tidak ada filter — semua non-follower akan di-unfollow (termasuk premium).
 */

(() => {
  const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));

  const run = async () => {
    const buttons = [...document.querySelectorAll('[data-testid$="-unfollow"]')]
      .filter(b => {
        const cell = b.closest('[data-testid="UserCell"]');
        return !cell?.querySelector('[data-testid="userFollowIndicator"]');
      });

    if (buttons.length === 0) {
      console.log('✅ Selesai! Tidak ada lagi yang bisa di-unfollow.');
      console.log('🔄 Reload halaman untuk melanjutkan.');
      return;
    }

    console.log(`🔍 Found ${buttons.length} to unfollow...`);

    for (const btn of buttons) {
      const cell = btn.closest('[data-testid="UserCell"]');
      const name = cell?.querySelector('[data-testid="UserName"]')?.querySelector('span')?.textContent || 'unknown';
      
      btn.click();
      await sleep(1);
      document.querySelector('[data-testid="confirmationSheetConfirm"]')?.click();
      console.log(`❌ Unfollowed: ${name}`);
      await sleep(2);
    }

    // Scroll untuk load lebih banyak
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(3);
    run();
  };

  console.log('🚀 XActions Lite — Unfollow Non-Followers');
  console.log('⏳ Starting...');
  run();
})();
