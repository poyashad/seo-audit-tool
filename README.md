# 🔍 SEO Audit Tool

Complete technical SEO audit pipeline - crawl, analyze, and optimize your website.

## Features

- **🕷️ URL Crawler** - Crawl entire websites with Crawlee (Playwright)
- **🔗 Broken Link Checker** - Find all broken links and redirects
- **📊 SEO Data Extraction** - Extract meta tags, titles, H1s, canonicals, and more
- **🚦 Lighthouse Audits** - Batch Core Web Vitals, SEO, and accessibility checks
- **🗺️ Sitemap Comparison** - Find orphaned pages and missing URLs

## Installation

```bash
cd seo-audit-tool
npm install
```

**Note:** Requires Node.js 18+ and Chrome/Chromium for Lighthouse.

## Quick Start

Run the complete audit pipeline:

```bash
npm run audit https://example.com
```

This will:
1. Crawl the website (up to 1000 pages)
2. Check all URLs for broken links
3. Extract SEO data and generate CSV report
4. Run Lighthouse audits on 10 sample URLs
5. Compare sitemap vs crawled URLs (if sitemap provided)

## Usage

### Full Pipeline

```bash
# Basic audit
npm run audit https://example.com

# Custom options
npm run audit https://example.com --max-pages 500 --sample 20

# With sitemap comparison
npm run audit https://example.com --sitemap https://example.com/sitemap.xml

# Skip certain steps
npm run audit https://example.com --skip-lighthouse --skip-sitemap
```

### Individual Tools

Run tools separately for more control:

```bash
# 1. Crawl website
npm run crawl https://example.com 1000

# 2. Check broken links
npm run check-links output/urls-2024-03-15.txt

# 3. Run Lighthouse (10 sample URLs)
npm run lighthouse output/urls-2024-03-15.txt 10

# 4. Compare sitemap vs crawl
npm run sitemap-diff https://example.com/sitemap.xml output/urls-2024-03-15.txt
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-pages <n>` | Maximum pages to crawl | 1000 |
| `--sample <n>` | URLs to audit with Lighthouse | 10 |
| `--sitemap <url>` | Sitemap URL for comparison | - |
| `--skip-crawl` | Skip crawling (use existing file) | false |
| `--skip-links` | Skip broken link check | false |
| `--skip-lighthouse` | Skip Lighthouse audits | false |
| `--skip-sitemap` | Skip sitemap comparison | false |

## Output

All reports are saved to the `output/` directory:

```
output/
├── urls-2024-03-15.txt                  # List of crawled URLs
├── pages-2024-03-15.json                # Full page data (meta, titles, etc)
├── broken-links-2024-03-15.json         # Broken links report
├── seo-issues-2024-03-15.csv            # SEO issues (CSV for Excel)
├── seo-report-2024-03-15.json           # SEO issues (JSON)
├── lighthouse-2024-03-15.json           # Lighthouse scores
└── sitemap-diff-2024-03-15.json         # Sitemap comparison
```

## Report Details

### SEO Issues CSV
- Missing/short/long titles
- Missing/short/long meta descriptions
- Missing H1 tags
- Missing canonical tags
- Non-200 status codes
- Link depth

### Broken Links Report
- Broken links (4xx, 5xx)
- Redirects (3xx)
- Error pages
- Redirect chains

### Lighthouse Report
- Performance scores
- Core Web Vitals (FCP, LCP, TBT, CLS, SI)
- SEO scores
- Accessibility scores
- Best practices scores

### Sitemap Diff
- Orphaned pages (crawled but not in sitemap)
- Missing pages (in sitemap but not found)
- Coverage percentage

## Examples

### Audit your production site
```bash
npm run audit https://yoursite.com --max-pages 2000 --sample 30 --sitemap https://yoursite.com/sitemap.xml
```

### Quick local test
```bash
npm run audit http://localhost:3000 --max-pages 100 --skip-lighthouse
```

### Re-run checks on existing crawl
```bash
npm run audit https://example.com --skip-crawl
```

### Just check for broken links
```bash
npm run crawl https://example.com 500
npm run check-links output/urls-<timestamp>.txt
```

## Performance Tips

- Start with a smaller `--max-pages` value for initial testing
- Reduce `--sample` size to speed up Lighthouse audits
- Use `--skip-lighthouse` for faster audits (Lighthouse is slow)
- Run during off-peak hours to avoid rate limiting

## Troubleshooting

**Crawl is too slow:**
- Reduce `--max-pages`
- Check your internet connection
- Some sites have rate limiting

**Lighthouse fails:**
- Ensure Chrome/Chromium is installed
- Try reducing `--sample` size
- Run Lighthouse separately: `npm run lighthouse <urls-file> 5`

**Out of memory:**
- Reduce `--max-pages` to 500 or less
- Run tools individually instead of full pipeline

## Advanced Usage

### Custom URL filtering

Edit `src/crawl.js` and modify the `enqueueLinks` options to filter URLs:

```javascript
await enqueueLinks({
  strategy: 'same-domain',
  // Only crawl /blog URLs
  include: [/\/blog\/.*/],
  // Exclude admin/login URLs
  exclude: [/\/admin\/.*/, /\/login/],
});
```

### Export to Google Sheets

Use the CSV files in `output/` - they can be opened directly in Excel or Google Sheets.

## License

MIT
