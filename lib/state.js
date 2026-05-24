(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZenState = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  // These values are load-bearing: they must match the "id" fields of the
  // static rule_resources declared in manifest.json.
  const RULESET_ONE_TAP = 'ruleset_block_one_tap';
  const RULESET_UDM14 = 'ruleset_udm14';

  // One Tap can appear on any site.
  const ONE_TAP_ORIGINS = ['<all_urls>'];

  // Lean curated Google ccTLD list (expand on demand).
  const AI_ORIGINS = [
    '*://*.google.com/*',
    '*://*.google.co.uk/*',
    '*://*.google.ca/*',
    '*://*.google.com.au/*',
    '*://*.google.de/*',
    '*://*.google.fr/*',
    '*://*.google.co.jp/*',
    '*://*.google.co.in/*',
    '*://*.google.es/*',
    '*://*.google.it/*'
  ];

  // Content-script match patterns (search pages only) for hide-mode.
  const AI_MATCHES = AI_ORIGINS.map((o) => o.replace(/\/\*$/, '/search*'));

  // Exported and read by callers; frozen so the shared fallback can't be mutated.
  const DEFAULTS = Object.freeze({
    blockOneTap: false,
    removeAiOverview: false,
    aiMode: 'udm14',
    oneTapAllowlist: Object.freeze([])
  });

  // Reduce any hostname/URL/domain string to a registrable-ish domain:
  // strip scheme, userinfo, path/query/hash, port, and a leading "www.".
  // Returns null for inputs that aren't a usable domain (e.g. chrome:// pages).
  function normalizeDomain(input) {
    if (!input) return null;
    let s = String(input).trim().toLowerCase();
    if (!s) return null;
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // scheme
    s = s.split('/')[0].split('?')[0].split('#')[0]; // path/query/hash
    s = s.split('@').pop(); // userinfo
    s = s.split(':')[0]; // port
    s = s.replace(/^www\./, '');
    if (!/^[a-z0-9.-]+$/.test(s)) return null;
    if (!s.includes('.') || s.startsWith('.') || s.endsWith('.') || s.includes('..')) return null;
    return s;
  }

  function normalizeAllowlist(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    for (const item of list) {
      const d = normalizeDomain(item);
      if (d && !seen.has(d)) { seen.add(d); out.push(d); }
    }
    return out;
  }

  function normalize(settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});
    s.blockOneTap = !!s.blockOneTap;
    s.removeAiOverview = !!s.removeAiOverview;
    if (s.aiMode !== 'udm14' && s.aiMode !== 'hide') s.aiMode = 'udm14';
    s.oneTapAllowlist = normalizeAllowlist(s.oneTapAllowlist);
    return s;
  }

  function computeDesiredState(settings) {
    const s = normalize(settings);
    const enabledRulesets = [];
    if (s.blockOneTap) enabledRulesets.push(RULESET_ONE_TAP);
    if (s.removeAiOverview && s.aiMode === 'udm14') enabledRulesets.push(RULESET_UDM14);
    // Allowlist only matters while One Tap blocking is active.
    const allow = s.blockOneTap ? s.oneTapAllowlist : [];
    return {
      enabledRulesets,
      registerOneTapCss: s.blockOneTap,
      registerAiHide: s.removeAiOverview && s.aiMode === 'hide',
      oneTapAllowDomains: allow,
      oneTapCssExcludeMatches: allow.map((d) => `*://*.${d}/*`)
    };
  }

  return {
    RULESET_ONE_TAP, RULESET_UDM14,
    ONE_TAP_ORIGINS, AI_ORIGINS, AI_MATCHES,
    DEFAULTS, normalize, normalizeDomain, computeDesiredState
  };
});
