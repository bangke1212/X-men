/**
 * Scrape Followers dari X/Twitter
 */

import { randomDelay, parseCount, extractUsername } from '../utils.js';

/**
 * Scrape daftar followers user
 * @param {Page} page - Puppeteer page (harus sudah login)
 * @param {string} username - username target
 * @param {Object} options
 * @param {number} options.limit - max followers (default 200)
 * @param {Function} options.onProgress - callback progress
 * @returns {Array} list followers
 */
export async function scrapeFollowers(page, username, options = {}) {
  const { limit = 200, onProgress } = options;
  const url = `https://x.com/${username}/followers`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 4000);

  const followers = [];
  let previousCount = 0;
  let retries = 0;
  const maxRetries = 10;

  while (followers.length < limit && retries < maxRetries) {
    // Scroll untuk load lebih banyak
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await randomDelay(1500, 2500);

    // Extract user cells
    const newFollowers = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map(cell => {
        const links = cell.querySelectorAll('a');
        const nameEl = cell.querySelector('[data-testid="UserName"]');
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const avatarEl = cell.querySelector('img[src*="profile_images"]');

        return {
          name: nameEl?.querySelector('span')?.textContent?.trim() || null,
          username: links[1]?.href?.split('/')[3]?.toLowerCase() || null,
          bio: bioEl?.textContent?.trim()?.slice(0, 100) || null,
          avatar: avatarEl?.src || null,
          isVerified: !!cell.querySelector('[data-testid="icon-verified"]'),
          followsBack: !!cell.querySelector('[data-testid="userFollowIndicator"]'),
        };
      });
    });

    // Deduplicate
    const existingUsernames = new Set(followers.map(f => f.username));
    for (const f of newFollowers) {
      if (!existingUsernames.has(f.username) && followers.length < limit) {
        followers.push(f);
        existingUsernames.add(f.username);
      }
    }

    if (onProgress) {
      onProgress({ scraped: followers.length, limit });
    }

    // Cek apakah masih ada data baru
    if (followers.length === previousCount) {
      retries++;
    } else {
      retries = 0;
      previousCount = followers.length;
    }
  }

  return followers.slice(0, limit);
}
