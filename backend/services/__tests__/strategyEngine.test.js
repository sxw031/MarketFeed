const test = require('node:test');
const assert = require('node:assert/strict');
const { generateHeuristicReport, generateYearlySummary } = require('../strategyEngine');

function sampleArticles() {
  const now = new Date().toISOString();
  return [
    { id: 1, company: 'HSBC', title: 'HSBC launches new messaging platform for customers', description: 'HSBC rolled out omnichannel notifications', publishedAt: now, category: 'Technology' },
    { id: 2, company: 'Grab', title: 'Grab expands ride notification API', description: 'Grab partners with a CPaaS provider', publishedAt: now, category: 'Technology' },
    { id: 3, company: 'Temu', title: 'Temu revenue grows amid international expansion', description: 'Temu is scaling globally', publishedAt: now, category: 'Finance' }
  ];
}

const EXPECTED_DAILY_SECTIONS = [
  '# Daily Strategic Briefing',
  '## Top Signals Today',
  '## Use Case Snapshot',
  '## Priority Actions'
];

const EXPECTED_FULL_SECTIONS = [
  '## 1. Industry Trends & Urgency',
  '## 2. Communication Use Case Mapping',
  '## 3. Buying Committee Map',
  '## 4. Competitive Edge',
  '## 5. Adjacent Sector Patterns',
  '## 6. Emerging Technology Signals',
  '## 7. Macro Signals & Assumptions to Challenge',
  '## 8. Multiple Futures: Scenario Planning',
  '## Action Plan',
  '## Trend Analysis',
  '## Summary'
];

test('generateHeuristicReport returns a concise daily digest without the full rubric sections', () => {
  const report = generateHeuristicReport(sampleArticles(), 'daily');
  assert.equal(typeof report, 'string');
  for (const section of EXPECTED_DAILY_SECTIONS) {
    assert.ok(report.includes(section), `expected daily report to contain "${section}"`);
  }
  // The daily digest should stay short — it must not include the full
  // weekly/monthly rubric sections or the now-removed Success Story section.
  assert.ok(!report.includes('## 1. Industry Trends & Urgency'));
  assert.ok(!report.includes('Success Story'));
  assert.ok(!report.includes('## Summary'));
  assert.ok(!report.includes('## Trend Analysis'));
});

test('generateHeuristicReport returns every full-rubric section for weekly/monthly/quarterly reports', () => {
  const report = generateHeuristicReport(sampleArticles(), 'weekly');
  assert.equal(typeof report, 'string');
  for (const section of EXPECTED_FULL_SECTIONS) {
    assert.ok(report.includes(section), `expected report to contain "${section}"`);
  }
  assert.ok(!report.includes('Success Story'));
});

test('generateHeuristicReport supports weekly/monthly/quarterly period labels', () => {
  assert.match(generateHeuristicReport(sampleArticles(), 'weekly'), /Weekly Strategic Review/);
  assert.match(generateHeuristicReport(sampleArticles(), 'monthly'), /Monthly Strategic Assessment/);
  assert.match(generateHeuristicReport(sampleArticles(), 'quarterly'), /Quarterly Business Review Intelligence/);
});

test('generateHeuristicReport handles an empty article list gracefully', () => {
  const report = generateHeuristicReport([], 'daily');
  assert.match(report, /No recent news available/);
});

test('generateHeuristicReport works for a company without a bespoke INDUSTRY_CONTEXT entry', () => {
  const now = new Date().toISOString();
  const articles = [
    { id: 4, company: 'Netflix', title: 'Netflix expands enterprise messaging tools', description: 'Netflix rolls out new notifications', publishedAt: now, category: 'Entertainment' }
  ];
  const report = generateHeuristicReport(articles, 'daily');
  assert.ok(report.includes('## Top Signals Today'));
  assert.match(report, /Netflix/);
});

test('generateHeuristicReport Trend Analysis ranks only the top 5 accounts', () => {
  const now = new Date().toISOString();
  const articles = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter, i) => ({
    id: i, company: `Company ${letter}`, title: `${letter} messaging update`, description: 'notification platform', publishedAt: now, category: 'Technology'
  }));
  const report = generateHeuristicReport(articles, 'weekly');
  const trendSection = report.split('## Trend Analysis')[1].split('## Summary')[0];
  const rankedRows = trendSection.split('\n').filter(line => /^\| \d+ \|/.test(line));
  assert.equal(rankedRows.length, 5);
});

test('generateYearlySummary returns highlights for a known year and empty array otherwise', () => {
  const summary = generateYearlySummary(2026);
  assert.ok(Array.isArray(summary));
  assert.ok(summary.length > 0);
  assert.ok(summary.every(entry => entry.company && Array.isArray(entry.highlights)));

  assert.deepEqual(generateYearlySummary(1999), []);
});
