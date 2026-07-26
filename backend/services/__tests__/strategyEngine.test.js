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

const EXPECTED_SECTIONS = [
  '# Daily Strategic Briefing',
  '## 1. Industry Trends & Urgency',
  '## 2. Communication Use Case Mapping',
  '## 3. Buying Committee Map',
  '## 4. Success Story to Tell',
  '## 5. Competitive Edge',
  '## 6. Adjacent Sector Patterns',
  '## 7. Emerging Technology Signals',
  '## 8. Macro Signals & Assumptions to Challenge',
  '## 9. Multiple Futures: Scenario Planning',
  '## Action Plan'
];

test('generateHeuristicReport returns a report with every rubric section present', () => {
  const report = generateHeuristicReport(sampleArticles(), 'daily');
  assert.equal(typeof report, 'string');
  for (const section of EXPECTED_SECTIONS) {
    assert.ok(report.includes(section), `expected report to contain "${section}"`);
  }
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
  assert.ok(report.includes('## 4. Success Story to Tell'));
  assert.match(report, /Netflix/);
});

test('generateHeuristicReport flags illustrative (unverified) success stories for credibility', () => {
  const report = generateHeuristicReport(sampleArticles(), 'daily');
  assert.match(report, /Illustrative benchmark pending real anonymized case study/);
});

test('generateYearlySummary returns highlights for a known year and empty array otherwise', () => {
  const summary = generateYearlySummary(2026);
  assert.ok(Array.isArray(summary));
  assert.ok(summary.length > 0);
  assert.ok(summary.every(entry => entry.company && Array.isArray(entry.highlights)));

  assert.deepEqual(generateYearlySummary(1999), []);
});
