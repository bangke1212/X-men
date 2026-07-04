# XActions Lite ⚡

X/Twitter Automation Toolkit versi ringan — **auto unfollow + scraping** tanpa API key.

## Fitur

### 🔴 Auto Unfollow
- **Unfollow semua** — unfollow semua following
- **Unfollow non-followers** — hapus akun yang tidak follow balik
- **Smart filter** — skip akun premium/verified, follower count threshold, dll.
- **Dry run mode** — lihat daftar tanpa eksekusi

### 📊 Scraping
- **Profile** — nama, bio, followers, following, join date, verified status
- **Followers** — list followers dengan detail (verified, follower count)
- **Following** — list following dengan status follow-back
- **Tweets** — kumpulkan tweet terbaru (text, likes, retweets, replies, timestamp)
- **Search** — cari tweet berdasarkan keyword/hashtag

---

## Instalasi

```bash
npm install
```

## Cara Pakai

### 1. Auto Unfollow (Browser Console)

Script paling praktis — **copy-paste langsung ke DevTools x.com**, tidak perlu install apa pun.

Buka `https://x.com/USERNAME_KAMU/following` → F12 → Console → paste script.

Semua script ada di folder `scripts/`.

### 2. CLI (Command Line)

```bash
# Unfollow non-followers (skip premium)
node src/cli/index.js unfollow --username USERNAME_KAMU --skip-premium

# Unfollow non-followers (dry run)
node src/cli/index.js unfollow --username USERNAME_KAMU --dry-run

# Scrape profile
node src/cli/index.js scrape profile elonmusk

# Scrape followers
node src/cli/index.js scrape followers elonmusk --limit 100

# Scrape tweets
node src/cli/index.js scrape tweets elonmusk --limit 50

# Search tweets
node src/cli/index.js scrape search "startup indonesia" --limit 30
```

### 3. Node.js API

```javascript
import { createBrowser, createPage, scrapeProfile, scrapeFollowers } from 'xactions-lite';

const browser = await createBrowser();
const page = await createPage(browser);

// Scrape profile
const profile = await scrapeProfile(page, 'elonmusk');
console.log(profile);

// Scrape followers
const followers = await scrapeFollowers(page, 'elonmusk', { limit: 200 });
console.log(`Found ${followers.length} followers`);

await browser.close();
```

---

## Struktur Proyek

```
xactions-lite/
├── package.json
├── README.md
├── .env.example
├── .gitignore
├── src/
│   ├── index.js              # Entry point utama
│   ├── browser.js            # Browser/Puppeteer setup (stealth)
│   ├── auth.js               # Login dengan cookie
│   ├── utils.js              # Helper functions
│   ├── scrapers/
│   │   ├── profile.js        # Scrape profile
│   │   ├── followers.js      # Scrape followers
│   │   ├── following.js      # Scrape following
│   │   ├── tweets.js         # Scrape tweets
│   │   └── search.js         # Search tweets
│   ├── automation/
│   │   ├── unfollow.js       # Logika unfollow
│   │   └── filters.js        # Filter (skip premium, dll.)
│   └── cli/
│       └── index.js          # CLI dengan Commander
├── scripts/
│   ├── unfollow-non-followers.js     # Unfollow yg ga follow balik
│   ├── unfollow-non-followers-skip-premium.js  # + skip verified
│   ├── unfollow-all.js               # Unfollow semua
│   ├── scrape-profile.js             # Scrape profile dari console
│   ├── detect-unfollowers.js         # Deteksi siapa yg unfollow
│   └── scrape-tweets.js              # Scrape tweet dari console
└── data/                              # Output data (JSON, CSV)
```

---

## Environment Variables

Copy `.env.example` ke `.env`:

```bash
# Cookie dari X.com (DevTools → Application → Cookies → auth_token)
X_AUTH_TOKEN=your_auth_token_here

# Opsional: CT0 token (untuk action seperti follow/unfollow)
X_CT0=your_ct0_token_here
```

---

## ⚠️ Disclaimer

- Untuk **educational purposes** saja
- Gunakan dengan **delay yang wajar** (2-5 detik antar aksi)
- Jangan mass-unfollow ribuan per hari
- Kami tidak bertanggung jawab atas account restriction/suspension
- Selalu patuhi Terms of Service X/Twitter

---

## Lisensi

MIT
