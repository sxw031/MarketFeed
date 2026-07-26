const test = require('node:test');
const assert = require('node:assert/strict');
const { getSuccessStories } = require('../successStories');

test('getSuccessStories tags every entry as illustrative by default (not verified)', () => {
  const stories = getSuccessStories();
  const verticals = Object.keys(stories);
  assert.ok(verticals.length > 0);
  for (const vertical of verticals) {
    assert.equal(stories[vertical].verified, false);
    assert.equal(stories[vertical].source, 'illustrative_benchmark');
    assert.ok(stories[vertical].customer);
  }
});

test('getSuccessStories merges real case studies from SUCCESS_STORIES_OVERRIDES_PATH', (t) => {
  const os = require('node:os');
  const path = require('node:path');
  const fs = require('node:fs');

  const overridesPath = path.join(os.tmpdir(), `success-stories-overrides-${Date.now()}.json`);
  fs.writeFileSync(overridesPath, JSON.stringify({
    'Banking & Financial Services': {
      customer: 'a real anonymized bank customer',
      before: 'before state',
      after: 'after state',
      impact: 'measured impact',
      timeframe: '6 weeks',
      verified: true,
      source: 'case_study'
    }
  }));

  const previous = process.env.SUCCESS_STORIES_OVERRIDES_PATH;
  process.env.SUCCESS_STORIES_OVERRIDES_PATH = overridesPath;
  t.after(() => {
    if (previous === undefined) delete process.env.SUCCESS_STORIES_OVERRIDES_PATH;
    else process.env.SUCCESS_STORIES_OVERRIDES_PATH = previous;
    fs.unlinkSync(overridesPath);
  });

  const stories = getSuccessStories();
  assert.equal(stories['Banking & Financial Services'].verified, true);
  assert.equal(stories['Banking & Financial Services'].source, 'case_study');
  assert.equal(stories['Banking & Financial Services'].customer, 'a real anonymized bank customer');
  // Untouched verticals remain the illustrative defaults
  assert.equal(stories['Super App & Mobility'].verified, false);
});
