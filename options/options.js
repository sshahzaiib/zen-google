const S = window.ZenState;
const $ = (id) => document.getElementById(id);

let allowlist = [];

async function load() {
  const s = S.normalize(await chrome.storage.sync.get(S.DEFAULTS));
  allowlist = s.oneTapAllowlist;
  render();
}

function render() {
  const list = $('list');
  list.innerHTML = '';
  const sorted = [...allowlist].sort();
  $('empty').hidden = sorted.length > 0;
  for (const domain of sorted) {
    const li = document.createElement('li');
    li.className = 'item';

    const span = document.createElement('span');
    span.className = 'item__domain';
    span.textContent = domain;

    const btn = document.createElement('button');
    btn.className = 'remove';
    btn.type = 'button';
    btn.textContent = '✕';
    btn.setAttribute('aria-label', 'Remove ' + domain);
    btn.addEventListener('click', () => removeDomain(domain));

    li.append(span, btn);
    list.append(li);
  }
}

async function save() {
  await chrome.storage.sync.set({ oneTapAllowlist: allowlist });
  try {
    await chrome.runtime.sendMessage({ type: 'apply' });
  } catch (e) {
    // worker unavailable — storage.onChanged still reconciles
  }
}

async function addDomain() {
  const input = $('domainInput');
  const d = S.normalizeDomain(input.value);
  if (!d) { $('error').hidden = false; return; }
  $('error').hidden = true;
  if (!allowlist.includes(d)) {
    allowlist = [...allowlist, d];
    render();
    await save();
  }
  input.value = '';
  input.focus();
}

async function removeDomain(domain) {
  allowlist = allowlist.filter((x) => x !== domain);
  render();
  await save();
}

$('addBtn').addEventListener('click', addDomain);
$('domainInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addDomain();
});
$('domainInput').addEventListener('input', () => { $('error').hidden = true; });

// Reflect changes made from the popup while this page is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.oneTapAllowlist) {
    allowlist = S.normalize({ oneTapAllowlist: changes.oneTapAllowlist.newValue }).oneTapAllowlist;
    render();
  }
});

load();
