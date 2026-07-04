/**
 * Scrape Profile dari Browser Console
 * 
 * Cara pakai:
 * 1. Buka halaman profil X manapun
 * 2. F12 → Console
 * 3. Paste script ini → Enter
 * 4. Data akan di-copy ke clipboard
 */

(() => {
  const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
  const getHref = (sel) => document.querySelector(sel)?.href || null;

  const userNameEl = document.querySelector('[data-testid="UserName"]');
  const spans = userNameEl?.querySelectorAll('span');

  const profile = {
    name: spans?.[0]?.textContent?.trim() || null,
    username: spans?.[1]?.textContent?.trim()?.replace('@', '') || null,
    bio: getText('[data-testid="UserDescription"]'),
    location: getText('[data-testid="UserLocation"]'),
    website: getHref('[data-testid="UserUrl"]'),
    joinDate: getText('[data-testid="UserJoinDate"]'),
    followers: document.querySelector('a[href$="/verified_followers"] span span')?.textContent ||
               document.querySelector('a[href$="/followers"] span span')?.textContent || null,
    following: document.querySelector('a[href$="/following"] span span')?.textContent || null,
    isVerified: !!document.querySelector('[data-testid="icon-verified"]'),
    avatar: document.querySelector('[data-testid="UserAvatar"] img')?.src || null,
  };

  console.log('📋 Profile Data:');
  console.table(profile);

  // Copy ke clipboard
  copy(JSON.stringify(profile, null, 2));
  console.log('✅ Data copied to clipboard!');
})();
