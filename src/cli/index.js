#!/usr/bin/env node

/**
 * XActions Lite CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createBrowser, createPage } from '../browser.js';
import { loginWithCookie, loadCredentials } from '../auth.js';
import { scrapeProfile } from '../scrapers/profile.js';
import { scrapeFollowers } from '../scrapers/followers.js';
import { scrapeFollowing } from '../scrapers/following.js';
import { scrapeTweets } from '../scrapers/tweets.js';
import { searchTweets } from '../scrapers/search.js';
import { unfollowNonFollowers } from '../automation/unfollow.js';
import { exportToJSON, exportToCSV } from '../utils.js';

const program = new Command();

program
  .name('xactions')
  .description('⚡ X/Twitter Automation Toolkit — No API Key')
  .version('1.0.0');

// ─── LOGIN ───────────────────────────────────────────────
program
  .command('login')
  .description('Login ke X menggunakan cookie auth_token')
  .action(async () => {
    const creds = loadCredentials();
    if (!creds.authToken) {
      console.log(chalk.red('❌ X_AUTH_TOKEN tidak ditemukan.'));
      console.log(chalk.yellow('Set di .env file: X_AUTH_TOKEN=your_auth_token'));
      process.exit(1);
    }

    const spinner = ora('Logging in...').start();
    try {
      const browser = await createBrowser({ headless: false });
      const page = await createPage(browser);
      await loginWithCookie(page, creds.authToken);
      spinner.succeed('Login berhasil! ✅');
      await browser.close();
    } catch (e) {
      spinner.fail(`Login gagal: ${e.message}`);
      process.exit(1);
    }
  });

// ─── SCRAPE ──────────────────────────────────────────────
const scrape = program
  .command('scrape')
  .description('Scraping data dari X');

scrape
  .command('profile')
  .description('Scrape profile user')
  .argument('<username>', 'Username tanpa @')
  .option('--json', 'Output sebagai JSON')
  .option('--save', 'Simpan ke file')
  .action(async (username, opts) => {
    const spinner = ora(`Scraping profile @${username}...`).start();
    const browser = await createBrowser();
    const page = await createPage(browser);
    try {
      const profile = await scrapeProfile(page, username);
      spinner.succeed('Done!');
      console.log(opts.json ? JSON.stringify(profile, null, 2) : formatProfile(profile));
      if (opts.save) {
        const path = await exportToJSON(profile, `profile-${username}.json`);
        console.log(chalk.green(`💾 Saved: ${path}`));
      }
    } finally {
      await browser.close();
    }
  });

scrape
  .command('followers')
  .description('Scrape followers')
  .argument('<username>', 'Username tanpa @')
  .option('-l, --limit <number>', 'Max followers', '200')
  .option('--save', 'Simpan ke file')
  .action(async (username, opts) => {
    const limit = parseInt(opts.limit);
    const spinner = ora('Scraping followers...').start();
    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      const creds = loadCredentials();
      if (creds.authToken) await loginWithCookie(page, creds.authToken);

      const followers = await scrapeFollowers(page, username, {
        limit,
        onProgress: ({ scraped, limit }) => {
          spinner.text = `Scraping followers: ${scraped}/${limit}`;
        },
      });

      spinner.succeed(`Done! Found ${followers.length} followers`);
      console.table(followers.map(f => ({ username: f.username, name: f.name, verified: f.isVerified ? '✅' : '' })));

      if (opts.save) {
        await exportToJSON(followers, `followers-${username}.json`);
        await exportToCSV(followers, `followers-${username}.csv`);
        console.log(chalk.green(`💾 Saved to data/`));
      }
    } catch (e) {
      spinner.fail(e.message);
    } finally {
      await browser.close();
    }
  });

scrape
  .command('following')
  .description('Scrape following')
  .argument('<username>', 'Username tanpa @')
  .option('-l, --limit <number>', 'Max following', '500')
  .option('--save', 'Simpan ke file')
  .action(async (username, opts) => {
    const limit = parseInt(opts.limit);
    const spinner = ora('Scraping following...').start();
    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      const creds = loadCredentials();
      if (creds.authToken) await loginWithCookie(page, creds.authToken);

      const following = await scrapeFollowing(page, username, {
        limit,
        onProgress: ({ scraped, limit }) => {
          spinner.text = `Scraping following: ${scraped}/${limit}`;
        },
      });

      spinner.succeed(`Done! Found ${following.length} following`);

      // Tampilkan yang tidak follow balik
      const notFollowingBack = following.filter(f => !f.followsBack);
      console.log(chalk.yellow(`\n⚠️  ${notFollowingBack.length} tidak follow balik:`));
      console.table(notFollowingBack.map(f => ({
        username: f.username,
        name: f.name,
        verified: f.isVerified ? '✅' : '',
      })));

      if (opts.save) {
        await exportToJSON(following, `following-${username}.json`);
        await exportToCSV(following, `following-${username}.csv`);
        console.log(chalk.green(`💾 Saved to data/`));
      }
    } finally {
      await browser.close();
    }
  });

scrape
  .command('tweets')
  .description('Scrape tweets user')
  .argument('<username>', 'Username tanpa @')
  .option('-l, --limit <number>', 'Max tweets', '50')
  .option('--replies', 'Termasuk replies')
  .option('--save', 'Simpan ke file')
  .action(async (username, opts) => {
    const limit = parseInt(opts.limit);
    const spinner = ora('Scraping tweets...').start();
    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      const tweets = await scrapeTweets(page, username, {
        limit,
        includeReplies: opts.replies,
        onProgress: ({ scraped, limit }) => {
          spinner.text = `Scraping tweets: ${scraped}/${limit}`;
        },
      });

      spinner.succeed(`Done! Found ${tweets.length} tweets`);
      tweets.forEach(t => {
        console.log(chalk.cyan(`\n🐦 ${t.timeDisplay}`));
        console.log(t.text?.slice(0, 150) + (t.text?.length > 150 ? '...' : ''));
        console.log(chalk.gray(`   ❤️ ${t.likes}  🔄 ${t.retweets}  💬 ${t.replies}`));
      });

      if (opts.save) {
        await exportToJSON(tweets, `tweets-${username}.json`);
        console.log(chalk.green(`💾 Saved to data/`));
      }
    } finally {
      await browser.close();
    }
  });

scrape
  .command('search')
  .description('Search tweets')
  .argument('<query>', 'Keyword/hashtag')
  .option('-l, --limit <number>', 'Max tweets', '30')
  .option('--top', 'Top results (default: latest)')
  .option('--save', 'Simpan ke file')
  .action(async (query, opts) => {
    const limit = parseInt(opts.limit);
    const spinner = ora(`Searching: "${query}"...`).start();
    const browser = await createBrowser();
    const page = await createPage(browser);

    try {
      const tweets = await searchTweets(page, query, {
        limit,
        filter: opts.top ? 'top' : 'latest',
        onProgress: ({ scraped, limit }) => {
          spinner.text = `Searching: ${scraped}/${limit}`;
        },
      });

      spinner.succeed(`Done! Found ${tweets.length} tweets`);
      tweets.forEach(t => {
        console.log(chalk.cyan(`\n🐦 @${t.authorUsername} — ${t.timeDisplay}`));
        console.log(t.text?.slice(0, 200) + (t.text?.length > 200 ? '...' : ''));
        console.log(chalk.gray(`   ❤️ ${t.likes}  🔄 ${t.retweets}`));
      });

      if (opts.save) {
        const safeName = query.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
        await exportToJSON(tweets, `search-${safeName}.json`);
        console.log(chalk.green(`💾 Saved to data/`));
      }
    } finally {
      await browser.close();
    }
  });

// ─── UNFOLLOW ────────────────────────────────────────────
program
  .command('unfollow')
  .description('Auto unfollow — unfollow akun yang tidak follow balik (skip premium)')
  .option('-u, --username <username>', 'Username kamu')
  .option('-l, --limit <number>', 'Max unfollow', '100')
  .option('--dry-run', 'Lihat daftar tanpa eksekusi')
  .option('--skip-premium', 'Skip akun premium/verified')
  .option('--all', 'Unfollow semua (termasuk yang follow balik)')
  .action(async (opts) => {
    const limit = parseInt(opts.limit);
    const spinner = ora('Starting unfollow...').start();
    const browser = await createBrowser({ headless: false });
    const page = await createPage(browser);

    try {
      const creds = loadCredentials();
      if (!creds.authToken) {
        spinner.fail('X_AUTH_TOKEN diperlukan. Set di .env');
        process.exit(1);
      }

      await loginWithCookie(page, creds.authToken);
      spinner.text = opts.dryRun ? 'Analyzing (dry run)...' : 'Unfollowing...';

      const result = await unfollowNonFollowers(page, {
        limit,
        dryRun: opts.dryRun,
        onProgress: ({ unfollowed, skipped, total }) => {
          spinner.text = opts.dryRun
            ? `Analyzing: ${total} processed`
            : `Unfollowed: ${unfollowed}, Skipped: ${skipped}`;
        },
      });

      spinner.succeed('Done!');
      console.log(chalk.green(`\n📊 Summary:`));
      console.log(`   Unfollowed: ${result.summary.unfollowed}`);
      console.log(`   Skipped: ${result.summary.skipped}`);
      console.log(`   Total processed: ${result.total}`);

      if (result.unfollowed.length > 0) {
        await exportToJSON(result, `unfollow-result-${Date.now()}.json`);
        console.log(chalk.gray(`💾 Result saved to data/`));
      }
    } catch (e) {
      spinner.fail(e.message);
    } finally {
      await browser.close();
    }
  });

// ─── HELPERS ─────────────────────────────────────────────
function formatProfile(p) {
  return `
${chalk.bold.cyan(p.name)} ${p.isVerified ? chalk.blue('✅') : ''}
${chalk.gray(`@${p.username}`)}
${p.bio ? `\n${p.bio}` : ''}
${chalk.yellow(`\n👥 ${p.followers} followers  |  ${p.following} following`)}
${chalk.yellow(`🐦 ${p.tweetsCount} tweets`)}
${p.location ? `📍 ${p.location}` : ''}
${p.website ? `🔗 ${p.website}` : ''}
${p.joinDate ? `📅 ${p.joinDate}` : ''}
`;
}

program.parse();
