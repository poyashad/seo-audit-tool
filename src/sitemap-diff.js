import { readFileSync, writeFileSync } from 'fs';
import axios from 'axios';
import https from 'https';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

const sitemapUrl = process.argv[2];
const crawledUrlsFile = process.argv[3] || 'output/urls.txt';

if (!sitemapUrl) {
  console.error('❌ Usage: node sitemap-diff.js <sitemap-url> [crawled-urls-file]');
  console.error('   Example: node sitemap-diff.js https://example.com/sitemap.xml output/urls.txt');
  process.exit(1);
}

console.log(`🗺️  Fetching sitemap: ${sitemapUrl}`);
console.log(`📄 Crawled URLs: ${crawledUrlsFile}\n`);

// Configure axios to ignore SSL errors for localhost development
const axiosConfig = {
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
};

// Fetch sitemap
const response = await axios.get(sitemapUrl, axiosConfig);
const xml = await parseXml(response.data);

// Extract URLs from sitemap
let sitemapUrls = new Set();

if (xml.urlset?.url) {
  // Regular sitemap
  xml.urlset.url.forEach(entry => {
    if (entry.loc?.[0]) {
      sitemapUrls.add(entry.loc[0]);
    }
  });
} else if (xml.sitemapindex?.sitemap) {
  // Sitemap index - fetch all sub-sitemaps
  console.log(`📋 Found sitemap index with ${xml.sitemapindex.sitemap.length} sub-sitemaps`);

  for (const sitemap of xml.sitemapindex.sitemap) {
    const subSitemapUrl = sitemap.loc[0];
    console.log(`   Fetching: ${subSitemapUrl}`);

    try {
      const subResponse = await axios.get(subSitemapUrl, axiosConfig);
      const subXml = await parseXml(subResponse.data);

      if (subXml.urlset?.url) {
        subXml.urlset.url.forEach(entry => {
          if (entry.loc?.[0]) {
            sitemapUrls.add(entry.loc[0]);
          }
        });
      }
    } catch (error) {
      console.error(`   ✗ Error fetching ${subSitemapUrl}: ${error.message}`);
    }
  }
}

console.log(`✓ Found ${sitemapUrls.size} URLs in sitemap\n`);

// Read crawled URLs
const crawledUrls = new Set(
  readFileSync(crawledUrlsFile, 'utf-8')
    .split('\n')
    .filter(url => url.trim())
);

console.log(`✓ Found ${crawledUrls.size} crawled URLs\n`);

// Find differences
const inSitemapNotCrawled = [...sitemapUrls].filter(url => !crawledUrls.has(url));
const crawledNotInSitemap = [...crawledUrls].filter(url => !sitemapUrls.has(url));
const inBoth = [...sitemapUrls].filter(url => crawledUrls.has(url));

// Orphaned pages are crawled but not in sitemap (likely not linked from anywhere)
const orphanedPages = crawledNotInSitemap;

// Missing pages are in sitemap but not found during crawl (possibly blocked or removed)
const missingPages = inSitemapNotCrawled;

// Save results
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportFile = `output/sitemap-diff-${timestamp}.json`;

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    sitemapUrls: sitemapUrls.size,
    crawledUrls: crawledUrls.size,
    inBoth: inBoth.length,
    orphanedPages: orphanedPages.length,
    missingPages: missingPages.length,
    coverage: ((inBoth.length / sitemapUrls.size) * 100).toFixed(2) + '%',
  },
  orphanedPages, // In crawl but not in sitemap
  missingPages,  // In sitemap but not found in crawl
};

writeFileSync(reportFile, JSON.stringify(report, null, 2));

console.log(`✅ Sitemap diff complete!`);
console.log(`📊 Summary:`);
console.log(`   URLs in sitemap: ${sitemapUrls.size}`);
console.log(`   URLs crawled: ${crawledUrls.size}`);
console.log(`   URLs in both: ${inBoth.length}`);
console.log(`   🔍 Orphaned pages (crawled but not in sitemap): ${orphanedPages.length}`);
console.log(`   ⚠️  Missing pages (in sitemap but not crawled): ${missingPages.length}`);
console.log(`   📈 Coverage: ${report.summary.coverage}`);
console.log(`📄 Report saved: ${reportFile}`);

if (orphanedPages.length > 0) {
  console.log(`\n⚠️  Found ${orphanedPages.length} orphaned pages - these should be added to sitemap or removed`);
}

if (missingPages.length > 0) {
  console.log(`\n⚠️  Found ${missingPages.length} missing pages - these may be blocked, removed, or unreachable`);
}
