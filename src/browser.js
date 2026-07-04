/**
 * Browser Setup — Puppeteer + Stealth Plugin
 * Biar X ga detect kita pakai bot
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

/**
 * Buat browser instance dengan konfigurasi stealth
 * @param {Object} options
 * @param {boolean} options.headless - true = background, false = keliatan
 */
export async function createBrowser(options = {}) {
  const { headless = true } = options;

  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1280,800',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  return browser;
}

/**
 * Buat page baru dengan user agent realistis
 */
export async function createPage(browser) {
  const page = await browser.newPage();

  // Set user agent mobile (X lebih friendly ke mobile)
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );

  // Sembunyikan automation flags
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  return page;
}
