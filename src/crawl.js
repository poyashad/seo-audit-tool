import { PlaywrightCrawler, log } from 'crawlee';
import { writeFileSync } from 'fs';

log.setLevel(log.LEVELS.INFO);

const startUrl = process.argv[2] || 'https://example.com';
const maxPages = parseInt(process.argv[3]) || 1000;

console.log(`🚀 Starting crawl of: ${startUrl}`);
console.log(`📊 Max pages: ${maxPages}\n`);

const urls = new Set();
const pages = [];

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: maxPages,
  maxConcurrency: 50,
  minConcurrency: 10,
  requestHandlerTimeoutSecs: 30,
  launchContext: {
    launchOptions: {
      ignoreHTTPSErrors: true,
    },
  },
  async requestHandler({ request, page, enqueueLinks }) {
    const title = await page.title();

    // Extract meta tags
    const metaDescription = await page.$eval(
      'meta[name="description"]',
      el => el.content
    ).catch(() => '');

    const canonical = await page.$eval(
      'link[rel="canonical"]',
      el => el.href
    ).catch(() => '');

    const h1 = await page.$eval('h1', el => el.textContent).catch(() => '');

    // Get response status
    const response = await page.goto(request.url, { waitUntil: 'domcontentloaded' });
    const statusCode = response?.status() || 0;

    const pageData = {
      url: request.url,
      title,
      metaDescription,
      canonical,
      h1,
      statusCode,
      depth: request.userData.depth || 0
    };

    pages.push(pageData);
    urls.add(request.url);

    console.log(`✓ [${pages.length}/${maxPages}] ${request.url.substring(0, 80)}`);

    // Enqueue same-domain links
    await enqueueLinks({
      strategy: 'same-domain',
      userData: { depth: (request.userData.depth || 0) + 1 }
    });
  },

  failedRequestHandler({ request }) {
    console.error(`✗ Failed: ${request.url}`);
  },
});

await crawler.run([startUrl]);

// Save results
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const urlsFile = `output/urls-${timestamp}.txt`;
const pagesFile = `output/pages-${timestamp}.json`;

writeFileSync(urlsFile, Array.from(urls).join('\n'));
writeFileSync(pagesFile, JSON.stringify(pages, null, 2));

console.log(`\n✅ Crawl complete!`);
console.log(`📄 URLs saved: ${urlsFile}`);
console.log(`📊 Page data saved: ${pagesFile}`);
console.log(`📈 Total pages: ${pages.length}`);
