#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
🔍 SEO Audit Tool - Complete Technical SEO Pipeline

Usage:
  npm run audit <website-url> [options]

Example:
  npm run audit https://example.com

Options:
  --max-pages <n>     Maximum pages to crawl (default: 1000)
  --sample <n>        Number of URLs to audit with Lighthouse (default: 10)
  --sitemap <url>     Sitemap URL for comparison (optional)
  --skip-crawl        Skip crawling (use existing urls file)
  --skip-links        Skip broken link check
  --skip-lighthouse   Skip Lighthouse audits
  --skip-sitemap      Skip sitemap comparison

Individual Commands:
  npm run crawl <url> [max-pages]          - Crawl website
  npm run check-links <urls-file>          - Check for broken links
  npm run lighthouse <urls-file> [sample]  - Run Lighthouse audits
  npm run sitemap-diff <sitemap-url> <urls-file> - Compare sitemap vs crawl

Examples:
  npm run audit https://example.com --max-pages 500 --sample 20
  npm run audit https://example.com --sitemap https://example.com/sitemap.xml
  npm run crawl https://example.com 100
  npm run check-links output/urls-2024-03-15.txt
`);
  process.exit(0);
}

// Create output directory if it doesn't exist
if (!existsSync('output')) {
  mkdirSync('output');
}

const url = args[0];
const maxPagesIndex = args.indexOf('--max-pages');
const maxPages = maxPagesIndex !== -1 ? parseInt(args[maxPagesIndex + 1]) : 1000;
const sampleIndex = args.indexOf('--sample');
const sampleSize = sampleIndex !== -1 ? parseInt(args[sampleIndex + 1]) : 10;
const sitemapIndex = args.indexOf('--sitemap');
const sitemapUrl = sitemapIndex !== -1 ? args[sitemapIndex + 1] : undefined;

const skipCrawl = args.includes('--skip-crawl');
const skipLinks = args.includes('--skip-links');
const skipLighthouse = args.includes('--skip-lighthouse');
const skipSitemap = args.includes('--skip-sitemap');

console.log(`
╔═══════════════════════════════════════════════════════════╗
║          🔍 SEO AUDIT TOOL - Full Pipeline               ║
╚═══════════════════════════════════════════════════════════╝

🌐 Target URL: ${url}
📊 Max Pages: ${maxPages}
🚦 Lighthouse Sample: ${sampleSize}
${sitemapUrl ? `🗺️  Sitemap: ${sitemapUrl}` : ''}

Pipeline Steps:
${skipCrawl ? '⊘' : '✓'} 1. Crawl website with Crawlee
${skipLinks ? '⊘' : '✓'} 2. Check for broken links
${skipCrawl ? '⊘' : '✓'} 3. Extract SEO data (meta, titles, canonicals)
${skipLighthouse ? '⊘' : '✓'} 4. Run Lighthouse audits (sampled)
${skipSitemap || !sitemapUrl ? '⊘' : '✓'} 5. Compare sitemap vs crawl

═══════════════════════════════════════════════════════════

`);

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [command, ...args], { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
  });
};

// Find latest files
const getLatestFile = (pattern) => {
  const files = readdirSync('output')
    .filter(f => f.startsWith(pattern))
    .sort()
    .reverse();
  return files.length > 0 ? `output/${files[0]}` : null;
};

async function runAudit() {
try {
  let urlsFile;
  let pagesFile;

  // Step 1: Crawl
  if (!skipCrawl) {
    console.log('🚀 STEP 1: Crawling website...\n');
    await runCommand('src/crawl.js', [url, maxPages.toString()]);
    urlsFile = getLatestFile('urls-');
    pagesFile = getLatestFile('pages-');
    console.log('\n');
  } else {
    urlsFile = getLatestFile('urls-');
    pagesFile = getLatestFile('pages-');
    console.log(`⊘ Skipping crawl, using: ${urlsFile}\n`);
  }

  // Step 2: Check broken links
  if (!skipLinks && urlsFile) {
    console.log('🔍 STEP 2: Checking for broken links...\n');
    await runCommand('src/check-links.js', [urlsFile]);
    console.log('\n');
  }

  // Step 3: Extract SEO data
  if (!skipCrawl && pagesFile) {
    console.log('📊 STEP 3: Extracting SEO data...\n');
    await runCommand('src/extract-seo.js', [pagesFile]);
    console.log('\n');
  }

  // Step 4: Lighthouse audits
  if (!skipLighthouse && urlsFile) {
    console.log('🚦 STEP 4: Running Lighthouse audits...\n');
    await runCommand('src/lighthouse-batch.js', [urlsFile, sampleSize.toString()]);
    console.log('\n');
  }

  // Step 5: Sitemap diff
  if (!skipSitemap && sitemapUrl && urlsFile) {
    console.log('🗺️  STEP 5: Comparing sitemap vs crawl...\n');
    await runCommand('src/sitemap-diff.js', [sitemapUrl, urlsFile]);
    console.log('\n');
  }

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                  ✅ AUDIT COMPLETE!                      ║
╚═══════════════════════════════════════════════════════════╝

📂 All reports saved to: output/

Next Steps:
  1. Review reports in output/ directory
  2. Check CSV files for detailed SEO issues
  3. Review Lighthouse scores for performance
  4. Fix broken links and redirects
  5. Update sitemap with orphaned pages

`);

} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
}
}

runAudit();
