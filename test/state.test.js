const test = require('node:test');
const assert = require('node:assert');
const S = require('../lib/state.js');

test('defaults => nothing enabled', () => {
  const d = S.computeDesiredState(undefined);
  assert.deepStrictEqual(d.enabledRulesets, []);
  assert.strictEqual(d.registerOneTapCss, false);
  assert.strictEqual(d.registerAiHide, false);
});

test('blockOneTap on => one-tap ruleset + css', () => {
  const d = S.computeDesiredState({ blockOneTap: true });
  assert.ok(d.enabledRulesets.includes(S.RULESET_ONE_TAP));
  assert.strictEqual(d.registerOneTapCss, true);
  assert.strictEqual(d.registerAiHide, false);
});

test('AI overview udm14 mode => udm14 ruleset, no hide script', () => {
  const d = S.computeDesiredState({ removeAiOverview: true, aiMode: 'udm14' });
  assert.ok(d.enabledRulesets.includes(S.RULESET_UDM14));
  assert.strictEqual(d.registerAiHide, false);
});

test('AI overview hide mode => hide script, no udm14 ruleset', () => {
  const d = S.computeDesiredState({ removeAiOverview: true, aiMode: 'hide' });
  assert.ok(!d.enabledRulesets.includes(S.RULESET_UDM14));
  assert.strictEqual(d.registerAiHide, true);
});

test('removeAiOverview off ignores aiMode', () => {
  const d = S.computeDesiredState({ removeAiOverview: false, aiMode: 'hide' });
  assert.strictEqual(d.registerAiHide, false);
  assert.ok(!d.enabledRulesets.includes(S.RULESET_UDM14));
});

test('invalid aiMode falls back to udm14', () => {
  const s = S.normalize({ aiMode: 'bogus' });
  assert.strictEqual(s.aiMode, 'udm14');
});

test('non-boolean flags are coerced to booleans', () => {
  const s = S.normalize({ blockOneTap: 1, removeAiOverview: 0 });
  assert.strictEqual(s.blockOneTap, true);
  assert.strictEqual(s.removeAiOverview, false);
});

test('both features on => both rulesets', () => {
  const d = S.computeDesiredState({ blockOneTap: true, removeAiOverview: true, aiMode: 'udm14' });
  assert.deepStrictEqual(
    [...d.enabledRulesets].sort(),
    [S.RULESET_ONE_TAP, S.RULESET_UDM14].sort()
  );
});

test('exports origin lists and content-script matches', () => {
  assert.deepStrictEqual(S.ONE_TAP_ORIGINS, ['<all_urls>']);
  assert.ok(S.AI_ORIGINS.includes('*://*.google.com/*'));
  assert.ok(S.AI_MATCHES.includes('*://*.google.com/search*'));
});
