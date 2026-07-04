/**
 * Authentication — Login ke X menggunakan cookie
 */

import { randomDelay } from './utils.js';

/**
 * Login ke X dengan auth_token cookie
 * Cara dapat cookie: x.com → F12 → Application → Cookies → auth_token
 */
export async function loginWithCookie(page, authToken) {
  if (!authToken) {
    throw new Error('authToken diperlukan. Dapatkan dari x.com → F12 → Application → Cookies → auth_token');
  }

  // Set cookie auth_token
  await page.setCookie({
    name: 'auth_token',
    value: authToken,
    domain: '.x.com',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  });

  // Navigasi ke X untuk verifikasi login
  await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
  await randomDelay(1000, 3000);

  // Cek apakah berhasil login
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="AppTabBar_Home_Link"]');
  });

  if (!isLoggedIn) {
    throw new Error('Login gagal — periksa auth_token kamu');
  }

  return true;
}

/**
 * Load credentials dari environment variables
 */
export function loadCredentials() {
  return {
    authToken: process.env.X_AUTH_TOKEN || '',
    ct0: process.env.X_CT0 || '',
  };
}
