import { readFileSync, writeFileSync } from 'fs';
import axios from 'axios';
import pLimit from 'p-limit';

const urlsFile = process.argv[2] || 'output/urls.txt';
const concurrency = parseInt(process.argv[3]) || 10;

console.log(`🔍 Checking links from: ${urlsFile}`);
console.log(`⚡ Concurrency: ${concurrency}\n`);

const urls = readFileSync(urlsFile, 'utf-8')
  .split('\n')
  .filter(url => url.trim());

const results = [];
const limit = pLimit(concurrency);
let checked = 0;

const checkUrl = async (url) => {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 0,
      validateStatus: () => true, // Don't throw on any status
    });

    const result = {
      url,
      status: response.status,
      type: getStatusType(response.status),
      redirectTo: response.headers.location || null,
    };

    checked++;
    const icon = result.type === 'broken' ? '✗' :
                 result.type === 'redirect' ? '↪' : '✓';

    console.log(`${icon} [${checked}/${urls.length}] ${response.status} - ${url.substring(0, 80)}`);

    return result;
  } catch (error) {
    checked++;
    const result = {
      url,
      status: 0,
      type: 'error',
      error: error.message,
    };
    console.log(`✗ [${checked}/${urls.length}] ERROR - ${url.substring(0, 80)}`);
    return result;
  }
};

function getStatusType(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400) return 'broken';
  return 'unknown';
}

// Check all URLs
const checks = urls.map(url => limit(() => checkUrl(url)));
const allResults = await Promise.all(checks);

// Categorize results
const broken = allResults.filter(r => r.type === 'broken' || r.type === 'error');
const redirects = allResults.filter(r => r.type === 'redirect');
const ok = allResults.filter(r => r.type === 'ok');

// Save results
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportFile = `output/broken-links-${timestamp}.json`;

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: urls.length,
    ok: ok.length,
    redirects: redirects.length,
    broken: broken.length,
  },
  broken,
  redirects,
};

writeFileSync(reportFile, JSON.stringify(report, null, 2));

console.log(`\n✅ Link check complete!`);
console.log(`📊 Summary:`);
console.log(`   ✓ OK: ${ok.length}`);
console.log(`   ↪ Redirects: ${redirects.length}`);
console.log(`   ✗ Broken: ${broken.length}`);
console.log(`📄 Report saved: ${reportFile}`);
