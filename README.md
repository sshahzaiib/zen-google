# Zen Google

A small Chrome extension that removes two of Google's most persistent interruptions:

- The "Sign in with Google" One Tap popup, the credential card that shows up by itself on
  third-party sites when you are logged out.
- The AI Overview block at the top of Google Search results.

Everything runs locally. No account, no sign-up, no analytics, no server.

## What it does

**Blocks the One Tap popup.** The sign-in card is blocked at the network level on every site,
before it loads, so there is no flicker. If there are sites where you actually use Google login,
keep them on an allowlist: click "Allow here" in the popup, or manage the list on the options page.

**Removes the AI Overview.** Two modes:

- *Web tab redirect* (default): sends searches to the plain Web results using `udm=14`. Images,
  News and Shopping tabs keep working, and there is no redirect loop.
- *Hide on page* (experimental): leaves the search as is and hides the AI block in the page.

Each feature is off until you turn it on.

## Install

From the Chrome Web Store: <!-- add your Chrome Web Store link here -->

Or load it unpacked for development:

1. Open `chrome://extensions` and turn on Developer mode.
2. Click "Load unpacked" and select this folder.
3. Open the toolbar popup and enable what you want.

Works on Chrome and other Chromium browsers (Brave, Edge). It does not work on iOS, because Chrome
on iPhone and iPad has no extensions. A Safari version is in progress.

## Permissions

Permissions are requested only when you switch a feature on, so the install itself is warning-free.

- `declarativeNetRequest` blocks the One Tap script and iframe and does the search redirect with
  static rules.
- `storage` saves your toggles and the allowlist, synced through your own Chrome account.
- `scripting` registers a small CSS file (and the optional hide-mode script) only while the matching
  feature is on.
- `activeTab` lets the popup read the current site's domain when you open it.
- Host access is optional and asked for per feature when you enable it.

## A note on FedCM

Chrome has a newer native sign-in prompt (FedCM) that the browser draws itself. No extension can
block it. Zen Google gives you a one-click shortcut to the Chrome setting that turns it off.

## Privacy

No data is collected, stored off-device, or sold. Your settings stay in Chrome's own sync storage.
See [PRIVACY.md](PRIVACY.md).

## Development

```sh
npm install
npm test
```

The extension is plain JavaScript with no build step. `scripts/gen-icons.mjs` regenerates the icons
and `scripts/build-zip.sh` packages a store zip.

## License

MIT. See [LICENSE](LICENSE).
