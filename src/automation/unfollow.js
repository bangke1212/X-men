/**
 * Auto Unfollow — Logic unfollow massal via Puppeteer
 */

import { randomDelay } from '../utils.js';
import { shouldUnfollow } from './filters.js';

/**
 * Unfollow akun yang tidak follow balik (skip premium)
 * @param {Page} page - Puppeteer page (harus sudah login)
 * @param {Object} options
 * @param {number} options.limit - max unfollow (default 100)
 * @param {boolean} options.dryRun - lihat daftar tanpa eksekusi
 * @param {Function} options.filterFn - custom filter function
 * @param {Function} options.onProgress - callback per akun
 * @returns {Object} { unfollowed: Array, skipped: Array, total: number }
 */
export async function unfollowNonFollowers(page, options = {}) {
  const {
    limit = 100,
    dryRun = false,
    filterFn = shouldUnfollow,
    onProgress,
  } = options;

  // Dapatkan username dari URL
  const username = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href="/settings/profile"]');
    if (links[0]) {
      const match = document.querySelector('a[aria-label="Profile"]')?.href?.split('/');
      return match ? match[3] : 'you';
    }
    return 'you';
  });

  const url = `https://x.com/${username}/following`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 4000);

  const unfollowed = [];
  const skipped = [];
  let retries = 0;
  const maxRetries = 10;

  while (unfollowed.length + skipped.length < limit && retries < maxRetries) {
    // Ambil semua UserCell yang terlihat
    const cells = await page.$$('[data-testid="UserCell"]');

    for (const cell of cells) {
      if (unfollowed.length >= limit) break;

      try {
        // Evaluasi cell di browser context
        const info = await cell.evaluate(el => {
          const links = el.querySelectorAll('a');
          const nameEl = el.querySelector('[data-testid="UserName"]');
          return {
            username: links[1]?.href?.split('/')[3]?.toLowerCase() || null,
            name: nameEl?.querySelector('span')?.textContent?.trim() || null,
          };
        });

        if (!info.username) continue;

        // Cek apakah harus di-unfollow
        const shouldDo = await cell.evaluate(el => {
          const hasFollowIndicator = !!el.querySelector('[data-testid="userFollowIndicator"]');
          const verified = !!el.querySelector('[data-testid="icon-verified"]');
          // Default: unfollow yang tidak follow balik & non-premium
          return !hasFollowIndicator && !verified;
        });

        if (shouldDo) {
          if (dryRun) {
            console.log(`[DRY RUN] Would unfollow: @${info.username} (${info.name})`);
            unfollowed.push({ ...info, action: 'would_unfollow' });
          } else {
            // Klik tombol unfollow
            const unfollowBtn = await cell.$('[data-testid$="-unfollow"]');
            if (unfollowBtn) {
              await unfollowBtn.click();
              await randomDelay(800, 1500);

              // Klik konfirmasi
              const confirmBtn = await page.$('[data-testid="confirmationSheetConfirm"]');
              if (confirmBtn) {
                await confirmBtn.click();
                unfollowed.push({ ...info, action: 'unfollowed' });
                console.log(`❌ Unfollowed: @${info.username}`);
              }
              await randomDelay(2000, 4000);
            }
          }
        } else {
          skipped.push({ ...info, action: 'skipped' });
        }

        if (onProgress) {
          onProgress({
            unfollowed: unfollowed.length,
            skipped: skipped.length,
            total: unfollowed.length + skipped.length,
            limit,
          });
        }
      } catch (e) {
        // Cell mungkin sudah hilang karena DOM berubah
        continue;
      }
    }

    // Scroll untuk load lebih banyak
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(2000, 3000);

    // Cek apakah ada cell baru
    const currentTotal = unfollowed.length + skipped.length;
    if (currentTotal === retries * 10) {
      retries++;
    } else {
      retries = 0;
    }
  }

  return {
    unfollowed,
    skipped,
    total: unfollowed.length + skipped.length,
    summary: {
      unfollowed: unfollowed.length,
      skipped: skipped.length,
      dryRun,
    },
  };
}

/**
 * Unfollow semua following (termasuk yang follow balik)
 */
export async function unfollowAll(page, options = {}) {
  return unfollowNonFollowers(page, {
    ...options,
    filterFn: () => true, // unfollow semua
  });
}
