/**
 * Deteksi Siapa yang Unfollow Kamu — Browser Console Script
 * 
 * Cara pakai:
 * 1. Buka https://x.com/USERNAME_KAMU/followers
 * 2. F12 → Console
 * 3. Paste script ini → Enter (PERTAMA KALI — akan simpan snapshot followers)
 * 4. Beberapa hari kemudian, ulangi langkah 1-3
 * 5. Script akan menunjukkan siapa yang unfollow kamu
 */

(() => {
  const STORAGE_KEY = 'xactions_followers_snapshot';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const scrapeCurrentFollowers = async () => {
    const users = new Set();
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      document.querySelectorAll('[data-testid="UserCell"] a[href^="/"]')
        .forEach(a => {
          const username = a.href.split('/')[3]?.toLowerCase();
          if (username && username !== 'i') users.add(username);
        });
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
      retries++;

      // Update progress
      console.log(`📥 Scraping... ${users.size} followers found`);
    }

    return [...users].filter(Boolean);
  };

  console.log('🔍 XActions Lite — Unfollower Detector');
  console.log('⏳ Scraping followers list... (ini butuh waktu)');

  scrapeCurrentFollowers().then(currentFollowers => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const oldFollowers = JSON.parse(saved);
      const unfollowed = oldFollowers.filter(u => !currentFollowers.includes(u));
      const newFollowers = currentFollowers.filter(u => !oldFollowers.includes(u));

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Previous snapshot: ${oldFollowers.length} followers`);
      console.log(`📊 Current: ${currentFollowers.length} followers`);
      
      if (unfollowed.length > 0) {
        console.log(`\n🚨 UNFOLLOWED YOU (${unfollowed.length}):`);
        unfollowed.forEach(u => console.log(`   ❌ @${u}`));
      } else {
        console.log('\n✅ Tidak ada yang unfollow kamu!');
      }

      if (newFollowers.length > 0) {
        console.log(`\n🆕 NEW FOLLOWERS (${newFollowers.length}):`);
        newFollowers.forEach(u => console.log(`   ✨ @${u}`));
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('\n📸 First run! Saved snapshot.');
      console.log(`💾 ${currentFollowers.length} followers saved.`);
      console.log('🔁 Come back later and run this script again to detect unfollowers.');
    }

    // Simpan snapshot baru
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentFollowers));
    console.log(`\n💾 Snapshot updated: ${currentFollowers.length} followers`);
  });
})();
