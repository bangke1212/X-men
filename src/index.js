/**
 * XActions Lite — Entry Point
 * X/Twitter Automation Toolkit (No API Key)
 */

// Scrapers
export { scrapeProfile } from './scrapers/profile.js';
export { scrapeFollowers } from './scrapers/followers.js';
export { scrapeFollowing } from './scrapers/following.js';
export { scrapeTweets } from './scrapers/tweets.js';
export { searchTweets } from './scrapers/search.js';

// Automation
export { unfollowNonFollowers, unfollowAll } from './automation/unfollow.js';

// Core
export { createBrowser, createPage } from './browser.js';
export { loginWithCookie } from './auth.js';
export { sleep, randomDelay, exportToJSON, exportToCSV } from './utils.js';
