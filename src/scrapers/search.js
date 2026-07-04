/**
 * Search Tweets di X/Twitter
 */

import { randomDelay } from '../utils.js';

/**
 * Cari tweet berdasarkan keyword
 * @param {Page} page
 * @param {string} query - keyword pencarian
 * @param {Object} options
 * @param {number} options.limit (default 50)
 * @param {string} options.filter - 'latest' | 'top' (default 'latest')
 * @param {Function} options.onProgress
 * @returns {Array} list tweets
 */
export async function searchTweets(page, query, options = {}) {
  const { limit = 50, filter = 'latest', onProgress } = options;

  const encodedQuery = encodeURIComponent(query);
  const filterParam = filter === 'top' ? '' : '&f=live';
  const url = `https://x.com/search?q=${encodedQuery}${filterParam}&src=typed_query`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 4000);

  const tweets = [];
  let previousCount = 0;
  let retries = 0;
  const maxRetries = 10;

  while (tweets.length < limit && retries < maxRetries) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 2500);

    const newTweets = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(articles).map(article => {
        const text = article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || null;
        const timeEl = article.querySelector('time');
        const links = article.querySelectorAll('a');
        const userNameEl = article.querySelector('[data-testid="User-Name"]');

        const likeBtn = article.querySelector('[data-testid="like"]');
        const retweetBtn = article.querySelector('[data-testid="retweet"]');
        const replyBtn = article.querySelector('[data-testid="reply"]');

        const getStat = (el) => el?.getAttribute('aria-label')?.match(/\d[\d,]*/)?.[0] || '0';

        return {
          text,
          timestamp: timeEl?.getAttribute('datetime') || null,
          timeDisplay: timeEl?.textContent?.trim() || null,
          tweetUrl: links[2]?.href || null,
          authorName: userNameEl?.querySelector('span')?.textContent?.trim() || null,
          authorUsername: links[1]?.href?.split('/')[3]?.toLowerCase() || null,
          likes: getStat(likeBtn),
          retweets: getStat(retweetBtn),
          replies: getStat(replyBtn),
          hasMedia: !!article.querySelector('[data-testid="tweetPhoto"]'),
        };
      });
    });

    const existingUrls = new Set(tweets.map(t => t.tweetUrl));
    for (const t of newTweets) {
      if (!existingUrls.has(t.tweetUrl) && tweets.length < limit) {
        tweets.push(t);
        existingUrls.add(t.tweetUrl);
      }
    }

    if (onProgress) onProgress({ scraped: tweets.length, limit });

    if (tweets.length === previousCount) {
      retries++;
    } else {
      retries = 0;
      previousCount = tweets.length;
    }
  }

  return tweets.slice(0, limit);
}
