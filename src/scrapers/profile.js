/**
 * Scrape X/Twitter Profile
 */

import { randomDelay, parseCount } from '../utils.js';

/**
 * Scrape profile user X
 * @param {Page} page - Puppeteer page
 * @param {string} username - username tanpa @
 * @returns {Object} profile data
 */
export async function scrapeProfile(page, username) {
  const url = `https://x.com/${username}`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(1500, 3000);

  const profile = await page.evaluate(() => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const getHref = (sel) => document.querySelector(sel)?.href || null;

    // Nama dan username
    const userNameEl = document.querySelector('[data-testid="UserName"]');
    const name = userNameEl?.querySelector('span')?.textContent?.trim() || null;
    const handle = userNameEl?.querySelectorAll('span')?.[1]?.textContent?.trim()?.replace('@', '') || null;

    // Bio
    const bio = getText('[data-testid="UserDescription"]');

    // Lokasi, website, join date
    const location = getText('[data-testid="UserLocation"]');
    const website = getHref('[data-testid="UserUrl"]');
    const joinDate = getText('[data-testid="UserJoinDate"]');

    // Followers / Following
    const followersText = getHref(`a[href$="/verified_followers"] span span`) ||
                          getHref(`a[href$="/followers"] span span`);
    const followingText = getHref(`a[href$="/following"] span span`);

    // Verified
    const isVerified = !!document.querySelector('[data-testid="icon-verified"]');

    // Profile image
    const avatar = document.querySelector('[data-testid="UserAvatar"] img')?.src || null;

    // Banner
    const banner = document.querySelector('[data-testid="userBanner"] img')?.src || null;

    // Total tweets
    const tweetsCount = document.querySelector('a[href$="/with_replies"] span span')?.textContent || null;

    return {
      name,
      username: handle,
      bio,
      location,
      website,
      joinDate,
      followers: followersText,
      following: followingText,
      tweetsCount,
      isVerified,
      avatar,
      banner,
    };
  });

  // Parse angka
  profile.followersCount = parseCount(profile.followers);
  profile.followingCount = parseCount(profile.following);
  profile.tweetsCountNum = parseCount(profile.tweetsCount);

  return profile;
}
