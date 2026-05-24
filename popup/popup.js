const S = window.ZenState;
const $ = (id) => document.getElementById(id);

let currentTab = null;
let currentDomain = null;
let settings = null; // normalized cache of stored settings

// Reveal the AI "Method" row only while AI removal is on.
function syncModeRow() {
  $('modeWrap').classList.toggle('open', $('removeAiOverview').checked);
}

// Reveal the per-site row only while One Tap blocking is on and the tab has a real domain.
function syncSiteRow() {
  const show = $('blockOneTap').checked && !!currentDomain;
  $('oneTapSiteWrap').classList.toggle('open', show);
  if (show) {
    $('siteHost').textContent = currentDomain;
    $('allowHere').checked = settings.oneTapAllowlist.includes(currentDomain);
  }
}

async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  } catch (e) {
    return null;
  }
}

async function load() {
  settings = S.normalize(await chrome.storage.sync.get(S.DEFAULTS));
  $('blockOneTap').checked = settings.blockOneTap;
  $('removeAiOverview').checked = settings.removeAiOverview;
  $('aiMode').value = settings.aiMode;
  currentTab = await getCurrentTab();
  currentDomain = currentTab && currentTab.url ? S.normalizeDomain(currentTab.url) : null;
  syncModeRow();
  syncSiteRow();
}

async function ensureOrigins(origins) {
  const has = await chrome.permissions.contains({ origins });
  if (has) return true;
  return chrome.permissions.request({ origins });
}

// Persist a settings patch, refresh the local cache, then ask the worker to apply
// the new state and reload the relevant tab(s).
async function apply(patch, reloadCurrent) {
  await chrome.storage.sync.set(patch);
  settings = S.normalize(Object.assign({}, settings, patch));
  const reloadTabId = reloadCurrent && currentTab ? currentTab.id : undefined;
  try {
    await chrome.runtime.sendMessage({ type: 'apply', reloadTabId });
  } catch (e) {
    // worker unavailable — storage.onChanged will still reconcile
  }
}

$('blockOneTap').addEventListener('change', async (e) => {
  if (e.target.checked) {
    const ok = await ensureOrigins(S.ONE_TAP_ORIGINS);
    if (!ok) { e.target.checked = false; return; }
  }
  await apply({ blockOneTap: e.target.checked }, true);
  syncSiteRow();
});

$('allowHere').addEventListener('change', async (e) => {
  if (!currentDomain) return;
  const set = new Set(settings.oneTapAllowlist);
  if (e.target.checked) set.add(currentDomain);
  else set.delete(currentDomain);
  await apply({ oneTapAllowlist: Array.from(set) }, true);
});

$('manageSites').addEventListener('click', () => chrome.runtime.openOptionsPage());

async function applyAi() {
  const on = $('removeAiOverview').checked;
  const mode = $('aiMode').value;
  if (on) {
    const ok = await ensureOrigins(S.AI_ORIGINS);
    if (!ok) {
      $('removeAiOverview').checked = false;
      syncModeRow();
      await apply({ removeAiOverview: false }, false);
      return;
    }
  }
  syncModeRow();
  await apply({ removeAiOverview: on, aiMode: mode }, false);
}

$('removeAiOverview').addEventListener('change', applyAi);
$('aiMode').addEventListener('change', applyAi);

$('fedcmBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://settings/content/federatedIdentityApi' });
});

load();
