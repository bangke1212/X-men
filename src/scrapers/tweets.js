/**
 * Scrape Tweets dari X/Twitter
 */

import { randomDelay } from '../utils.js';

/**
 * Scrape tweets terbaru user
 * @param {Page} page
 * @param {string} username
 * @param {Object} options
 * @param {number} options.limit - max tweets (default 50)
 * @param {boolean} options.includeReplies - termasuk balasan (default false)
 * @param {Function} options.onProgress
 * @returns {Array} list tweets
 */
export async function scrapeTweets(page, username, options = {}) {
  const { limit = 50, includeReplies = false, onProgress } = options;
  const url = `https://x.com/${username}${includeReplies ? '/with_replies' : ''}`;
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

        // Stats
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const retweetBtn = article.querySelector('[data-testid="retweet"]');
        const likeBtn = article.querySelector('[data-testid="like"]');
        const viewsEl = article.querySelector('[data-testid="views"]');

        const getStat = (el) => el?.getAttribute('aria-label')?.match(/\d[\d,]*/)?.[0] || '0';

        return {
          text,
          timestamp: timeEl?.getAttribute('datetime') || null,
          timeDisplay: timeEl?.textContent?.trim() || null,
          tweetUrl: links[2]?.href || null,
          replies: getStat(replyBtn),
          retweets: getStat(retweetBtn),
          likes: getStat(likeBtn),
          views: viewsEl?.textContent?.trim() || null,
          isPinned: !!article.querySelector('[data-testid="socialContext"]'),
          hasMedia: !!article.querySelector('[data-testid="tweetPhoto"]'),
          hasVideo: !!article.querySelector('video'),
        };
      });
    });

    // Deduplicate by tweet URL
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
