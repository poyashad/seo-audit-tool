import { readFileSync, writeFileSync } from 'fs';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import pLimit from 'p-limit';

const urlsFile = process.argv[2] || 'output/urls.txt';
const sampleSize = parseInt(process.argv[3]) || 10;
const concurrency = 1; // Lighthouse should run sequentially

console.log(`🚦 Running Lighthouse audits`);
console.log(`📄 URLs file: ${urlsFile}`);
console.log(`📊 Sample size: ${sampleSize}\n`);

const urls = readFileSync(urlsFile, 'utf-8')
  .split('\n')
  .filter(url => url.trim());

// Sample URLs (take first N, or random sampling)
const sampledUrls = urls.slice(0, sampleSize);

const results = [];
const limit = pLimit(concurrency);
let completed = 0;

const runLighthouse = async (url) => {
  let chrome;
  try {
    console.log(`🚀 [${completed + 1}/${sampledUrls.length}] Starting audit: ${url}`);

    chrome = await launch({ chromeFlags: ['--headless'] });

    const options = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);

    const { lhr } = runnerResult;

    const result = {
      url,
      timestamp: new Date().toISOString(),
      scores: {
        performance: lhr.categories.performance.score * 100,
        accessibility: lhr.categories.accessibility.score * 100,
        bestPractices: lhr.categories['best-practices'].score * 100,
        seo: lhr.categories.seo.score * 100,
      },
      metrics: {
        fcp: lhr.audits['first-contentful-paint']?.numericValue,
        lcp: lhr.audits['largest-contentful-paint']?.numericValue,
        tbt: lhr.audits['total-blocking-time']?.numericValue,
        cls: lhr.audits['cumulative-layout-shift']?.numericValue,
        si: lhr.audits['speed-index']?.numericValue,
      },
      audits: {
        metaDescription: lhr.audits['meta-description']?.score === 1,
        viewport: lhr.audits['viewport']?.score === 1,
        documentTitle: lhr.audits['document-title']?.score === 1,
        httpStatusCode: lhr.audits['http-status-code']?.score === 1,
        linkText: lhr.audits['link-text']?.score === 1,
        crawlable: lhr.audits['is-crawlable']?.score === 1,
        robots: lhr.audits['robots-txt']?.score === 1,
      },
    };

    results.push(result);
    completed++;

    console.log(`✅ [${completed}/${sampledUrls.length}] ${url}`);
    console.log(`   Performance: ${result.scores.performance.toFixed(0)} | SEO: ${result.scores.seo.toFixed(0)} | Accessibility: ${result.scores.accessibility.toFixed(0)}`);

    await chrome.kill();

    return result;
  } catch (error) {
    if (chrome) await chrome.kill();
    completed++;
    console.error(`✗ [${completed}/${sampledUrls.length}] Error: ${url} - ${error.message}`);
    return {
      url,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Run Lighthouse on sampled URLs
const audits = sampledUrls.map(url => limit(() => runLighthouse(url)));
await Promise.all(audits);

// Calculate averages
const successful = results.filter(r => !r.error);
const avgScores = {
  performance: successful.reduce((sum, r) => sum + r.scores.performance, 0) / successful.length,
  accessibility: successful.reduce((sum, r) => sum + r.scores.accessibility, 0) / successful.length,
  bestPractices: successful.reduce((sum, r) => sum + r.scores.bestPractices, 0) / successful.length,
  seo: successful.reduce((sum, r) => sum + r.scores.seo, 0) / successful.length,
};

// Save results
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportFile = `output/lighthouse-${timestamp}.json`;

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalUrls: sampledUrls.length,
    successful: successful.length,
    failed: results.length - successful.length,
    averageScores: avgScores,
  },
  results,
};

writeFileSync(reportFile, JSON.stringify(report, null, 2));

console.log(`\n✅ Lighthouse audits complete!`);
console.log(`📊 Average Scores:`);
console.log(`   Performance: ${avgScores.performance.toFixed(1)}`);
console.log(`   SEO: ${avgScores.seo.toFixed(1)}`);
console.log(`   Accessibility: ${avgScores.accessibility.toFixed(1)}`);
console.log(`   Best Practices: ${avgScores.bestPractices.toFixed(1)}`);
console.log(`📄 Report saved: ${reportFile}`);
