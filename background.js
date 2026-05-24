importScripts('lib/state.js');
const S = self.ZenState;

const ALL_RULESETS = [S.RULESET_ONE_TAP, S.RULESET_UDM14];

// Dynamic DNR rule IDs for the One Tap allowlist exceptions. High range to avoid
// clashing with the static ruleset IDs (1, 2).
const ALLOW_RULE_CLIENT = 1001;
const ALLOW_RULE_IFRAME = 1002;

const ONE_TAP_CSS_ID = 'zen_one_tap_css';
const AI_HIDE_SPEC = {
  id: 'zen_ai_hide',
  matches: S.AI_MATCHES,
  js: ['lib/ai-overview.js', 'content/ai-hide.js'],
  runAt: 'document_idle'
};

async function reconcileRulesets(desired) {
  const current = await chrome.declarativeNetRequest.getEnabledRulesets();
  const enableRulesetIds = desired.enabledRulesets.filter((id) => !current.includes(id));
  const disableRulesetIds = ALL_RULESETS.filter(
    (id) => current.includes(id) && !desired.enabledRulesets.includes(id)
  );
  if (enableRulesetIds.length || disableRulesetIds.length) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds, disableRulesetIds });
  }
}

// Priority-2 `allow` rules carve out the allowlisted sites from the global block.
// Removed entirely when the allowlist is empty.
async function reconcileOneTapAllowRules(desired) {
  const domains = desired.oneTapAllowDomains;
  const addRules = domains.length
    ? [
        {
          id: ALLOW_RULE_CLIENT,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            urlFilter: '||accounts.google.com/gsi/client',
            resourceTypes: ['script'],
            initiatorDomains: domains
          }
        },
        {
          id: ALLOW_RULE_IFRAME,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            urlFilter: '||accounts.google.com/gsi/iframe/select',
            resourceTypes: ['sub_frame'],
            initiatorDomains: domains
          }
        }
      ]
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ALLOW_RULE_CLIENT, ALLOW_RULE_IFRAME],
    addRules
  });
}

// The One Tap CSS is re-registered each reconcile so its excludeMatches reflect
// the current allowlist.
async function reconcileOneTapCss(desired) {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [ONE_TAP_CSS_ID] });
  } catch (e) {
    // not registered yet — fine
  }
  if (!desired.registerOneTapCss) return;
  const spec = {
    id: ONE_TAP_CSS_ID,
    matches: ['<all_urls>'],
    css: ['css/block_one_tap.css'],
    runAt: 'document_start'
  };
  if (desired.oneTapCssExcludeMatches.length) spec.excludeMatches = desired.oneTapCssExcludeMatches;
  try {
    await chrome.scripting.registerContentScripts([spec]);
  } catch (e) {
    console.warn('[Zen] one-tap CSS register failed:', e);
  }
}

async function reconcileScript(spec, want) {
  let existing = [];
  try {
    existing = await chrome.scripting.getRegisteredContentScripts({ ids: [spec.id] });
  } catch (e) {
    existing = [];
  }
  const has = existing.length > 0;
  try {
    if (want && !has) await chrome.scripting.registerContentScripts([spec]);
    else if (!want && has) await chrome.scripting.unregisterContentScripts({ ids: [spec.id] });
  } catch (e) {
    console.warn('[Zen] script reconcile failed:', spec.id, e);
  }
}

async function reloadTabs(patterns) {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: patterns });
  } catch (e) {
    return; // no host permission for those patterns yet; nothing to reload
  }
  for (const t of tabs) {
    if (t.id != null) chrome.tabs.reload(t.id);
  }
}

// Apply settings -> Chrome APIs. No tab reloads here; callers decide what to reload.
async function reconcileState() {
  const settings = await chrome.storage.sync.get(S.DEFAULTS);
  const desired = S.computeDesiredState(settings);
  await reconcileRulesets(desired);
  await reconcileOneTapAllowRules(desired);
  await reconcileOneTapCss(desired);
  await reconcileScript(AI_HIDE_SPEC, desired.registerAiHide);
}

// Serialize reconciles so concurrent triggers (a storage change plus an `apply`
// message from the same UI action) never run updateDynamicRules at the same time.
let reconcileChain = Promise.resolve();
function queueReconcile() {
  reconcileChain = reconcileChain
    .then(reconcileState)
    .catch((e) => console.warn('[Zen] reconcile failed:', e));
  return reconcileChain;
}

// Reconcile only on user action (settings change) and on install/update.
// Deliberately NOT on chrome.runtime.onStartup: enabled rulesets, dynamic rules,
// and registered scripts persist natively, and re-syncing on startup would open a
// race where the first requests slip through before the worker wakes.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') queueReconcile();
});
chrome.runtime.onInstalled.addListener(() => queueReconcile());

// UIs (popup, options) write settings, then ask us to apply + reload the right tabs.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'apply') {
    (async () => {
      await queueReconcile();
      await reloadTabs(['*://*.google.com/search*']); // AI/udm=14 takes effect immediately
      if (msg.reloadTabId != null) {
        try {
          await chrome.tabs.reload(msg.reloadTabId);
        } catch (e) {
          // tab gone — ignore
        }
      }
      sendResponse({ ok: true });
    })();
    return true; // keep the message channel open for the async response
  }
});
