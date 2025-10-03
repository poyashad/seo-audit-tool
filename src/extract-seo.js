import { readFileSync, writeFileSync } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

const pagesFile = process.argv[2] || 'output/pages.json';

console.log(`📊 Extracting SEO data from: ${pagesFile}\n`);

const pages = JSON.parse(readFileSync(pagesFile, 'utf-8'));

// Analyze pages
const issues = [];

pages.forEach((page, index) => {
  const pageIssues = [];

  // Check for common SEO issues
  if (!page.title || page.title.length === 0) {
    pageIssues.push('Missing title tag');
  } else if (page.title.length < 30) {
    pageIssues.push('Title too short (< 30 chars)');
  } else if (page.title.length > 60) {
    pageIssues.push('Title too long (> 60 chars)');
  }

  if (!page.metaDescription || page.metaDescription.length === 0) {
    pageIssues.push('Missing meta description');
  } else if (page.metaDescription.length < 120) {
    pageIssues.push('Meta description too short (< 120 chars)');
  } else if (page.metaDescription.length > 160) {
    pageIssues.push('Meta description too long (> 160 chars)');
  }

  if (!page.h1 || page.h1.length === 0) {
    pageIssues.push('Missing H1 tag');
  }

  if (!page.canonical || page.canonical.length === 0) {
    pageIssues.push('Missing canonical tag');
  }

  if (page.statusCode !== 200) {
    pageIssues.push(`Non-200 status: ${page.statusCode}`);
  }

  if (pageIssues.length > 0) {
    issues.push({
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      h1: page.h1,
      canonical: page.canonical,
      statusCode: page.statusCode,
      depth: page.depth,
      issues: pageIssues.join('; '),
      issueCount: pageIssues.length,
    });
  }

  if ((index + 1) % 100 === 0) {
    console.log(`✓ Analyzed ${index + 1}/${pages.length} pages`);
  }
});

// Summary statistics
const stats = {
  totalPages: pages.length,
  pagesWithIssues: issues.length,
  missingTitles: issues.filter(i => i.issues.includes('Missing title')).length,
  missingDescriptions: issues.filter(i => i.issues.includes('Missing meta description')).length,
  missingH1: issues.filter(i => i.issues.includes('Missing H1')).length,
  missingCanonical: issues.filter(i => i.issues.includes('Missing canonical')).length,
  non200Status: issues.filter(i => i.statusCode !== 200).length,
};

// Save results
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const csvFile = `output/seo-issues-${timestamp}.csv`;
const jsonFile = `output/seo-report-${timestamp}.json`;

// Write CSV
const csvWriter = createObjectCsvWriter({
  path: csvFile,
  header: [
    { id: 'url', title: 'URL' },
    { id: 'title', title: 'Title' },
    { id: 'metaDescription', title: 'Meta Description' },
    { id: 'h1', title: 'H1' },
    { id: 'canonical', title: 'Canonical' },
    { id: 'statusCode', title: 'Status Code' },
    { id: 'depth', title: 'Depth' },
    { id: 'issueCount', title: 'Issue Count' },
    { id: 'issues', title: 'Issues' },
  ],
});

await csvWriter.writeRecords(issues);

// Write JSON
const report = {
  timestamp: new Date().toISOString(),
  stats,
  issues,
};

writeFileSync(jsonFile, JSON.stringify(report, null, 2));

console.log(`\n✅ SEO extraction complete!`);
console.log(`📊 Summary:`);
console.log(`   Total pages: ${stats.totalPages}`);
console.log(`   Pages with issues: ${stats.pagesWithIssues}`);
console.log(`   Missing titles: ${stats.missingTitles}`);
console.log(`   Missing descriptions: ${stats.missingDescriptions}`);
console.log(`   Missing H1: ${stats.missingH1}`);
console.log(`   Missing canonical: ${stats.missingCanonical}`);
console.log(`📄 CSV saved: ${csvFile}`);
console.log(`📄 JSON saved: ${jsonFile}`);
