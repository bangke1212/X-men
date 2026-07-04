/**
 * Utility Functions
 */

import fs from 'fs';
import path from 'path';

/**
 * Delay (sleep) dalam milidetik
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay antara min dan max milidetik
 */
export function randomDelay(min = 1000, max = 3000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(ms);
}

/**
 * Export data ke JSON
 */
export function exportToJSON(data, filename) {
  const dir = path.resolve('data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  return filepath;
}

/**
 * Export data ke CSV
 */
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return null;

  const dir = path.resolve('data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h] ?? '';
      // Escape koma dan quote
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, csvRows.join('\n'), 'utf-8');
  return filepath;
}

/**
 * Format angka followers (e.g. "1.2M" → 1200000)
 */
export function parseCount(text) {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').trim().toLowerCase();

  if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1_000_000;
  if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1_000;
  if (cleaned.endsWith('b')) return parseFloat(cleaned) * 1_000_000_000;

  return parseInt(cleaned) || 0;
}

/**
 * Ekstrak username dari URL
 */
export function extractUsername(url) {
  if (!url) return null;
  const match = url.match(/x\.com\/([^/]+)/) || url.match(/twitter\.com\/([^/]+)/);
  return match ? match[1].toLowerCase() : url.toLowerCase();
}
