/**
 * Scrape Following dari X/Twitter
 */

import { randomDelay, extractUsername } from '../utils.js';

/**
 * Scrape daftar following user
 * @param {Page} page - Puppeteer page (harus sudah login)
 * @param {string} username - username target
 * @param {Object} options
 * @param {number} options.limit - max following (default 500)
 * @param {Function} options.onProgress - callback progress
 * @returns {Array} list following
 */
export async function scrapeFollowing(page, username, options = {}) {
  const { limit = 500, onProgress } = options;
  const url = `https://x.com/${username}/following`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 4000);

  const following = [];
  let previousCount = 0;
  let retries = 0;
  const maxRetries = 15;

  while (following.length < limit && retries < maxRetries) {
    // Scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 2500);

    // Extract
    const newFollowing = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map(cell => {
        const links = cell.querySelectorAll('a');
        const nameEl = cell.querySelector('[data-testid="UserName"]');
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');

        return {
          name: nameEl?.querySelector('span')?.textContent?.trim() || null,
          username: links[1]?.href?.split('/')[3]?.toLowerCase() || null,
          bio: bioEl?.textContent?.trim()?.slice(0, 100) || null,
          isVerified: !!cell.querySelector('[data-testid="icon-verified"]'),
          followsBack: !!cell.querySelector('[data-testid="userFollowIndicator"]'),
        };
      });
    });

    // Deduplicate
    const existing = new Set(following.map(f => f.username));
    for (const f of newFollowing) {
      if (!existing.has(f.username) && following.length < limit) {
        following.push(f);
        existing.add(f.username);
      }
    }

    if (onProgress) onProgress({ scraped: following.length, limit });

    if (following.length === previousCount) {
      retries++;
    } else {
      retries = 0;
      previousCount = following.length;
    }
  }

  return following.slice(0, limit);
}
