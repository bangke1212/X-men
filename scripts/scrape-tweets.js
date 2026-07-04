/**
 * Scrape Tweets dari Browser Console
 * 
 * Cara pakai:
 * 1. Buka profil X manapun atau halaman search
 * 2. F12 → Console
 * 3. Paste script ini → Enter
 * 4. Scroll manual untuk load lebih banyak tweet (atau script akan auto-scroll)
 * 5. Data di-copy ke clipboard
 */

(() => {
  const tweets = [...document.querySelectorAll('article[data-testid="tweet"]')]
    .map(article => {
      const text = article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || null;
      const timeEl = article.querySelector('time');
      const links = article.querySelectorAll('a');
      const userNameEl = article.querySelector('[data-testid="User-Name"]');

      const getStat = (sel) => {
        const el = article.querySelector(sel);
        return el?.getAttribute('aria-label')?.match(/\d[\d,]*/)?.[0] || '0';
      };

      return {
        text,
        author: userNameEl?.querySelector('span')?.textContent?.trim() || null,
        username: links[1]?.href?.split('/')[3] || null,
        timestamp: timeEl?.getAttribute('datetime') || null,
        timeDisplay: timeEl?.textContent?.trim() || null,
        tweetUrl: links[2]?.href || null,
        likes: getStat('[data-testid="like"]'),
        retweets: getStat('[data-testid="retweet"]'),
        replies: getStat('[data-testid="reply"]'),
        hasMedia: !!article.querySelector('[data-testid="tweetPhoto"]'),
        hasVideo: !!article.querySelector('video'),
      };
    });

  console.log(`📋 Found ${tweets.length} tweets:`);
  console.table(tweets.map(t => ({
    author: `@${t.username}`,
    text: t.text?.slice(0, 80) + (t.text?.length > 80 ? '...' : ''),
    likes: t.likes,
    retweets: t.retweets,
    time: t.timeDisplay,
  })));

  // Copy ke clipboard
  copy(JSON.stringify(tweets, null, 2));
  console.log(`✅ ${tweets.length} tweets copied to clipboard!`);
  
  // Opsi: auto-scroll dan scrape lebih banyak
  console.log('💡 Scroll down for more tweets, then run this script again.');
})();
