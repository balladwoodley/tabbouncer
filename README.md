# 🪃 Tab Bouncer

> **For tab hoarders who open the same page twelve times and refuse to change.**

Tab Bouncer is a Chrome extension that catches duplicate tabs the moment they happen — showing an in-page alert, a badge count, and quick actions to jump to the original or close the copy. No more hunting through 47 tabs wondering which one is the "real" YouTube video.

---

## Features

**🔴 Badge counter** — The extension icon shows a red badge with the number of duplicate tabs open for whatever page you're currently on. Glanceable, always accurate.

**🍞 In-page toast** — A slick dark notification slides in from the top-right whenever you land on a page you already have open. It tells you how many duplicates exist and gives you two immediate options: switch to the original tab, or close the one you just opened.

**📋 Popup dashboard** — Click the extension icon for a full list of every duplicate tab, complete with favicons and window info. Jump to any of them or close the current tab directly from the popup.

**📈 Lifetime stats** — Tracks how many duplicates you've caught and how many times you've used the "jump to existing tab" action. Bragging rights.

**🧹 Smart URL normalization** — Strips trailing slashes, URL fragments, and common tracking parameters (`utm_source`, `utm_medium`, `fbclid`, `gclid`, and more) before comparing tabs. So `example.com/article` and `example.com/article?utm_source=twitter` correctly count as the same page.

---

## Installation

Tab Bouncer isn't on the Chrome Web Store — install it directly in a minute:

1. **Download** the latest release ZIP from this repo
2. **Unzip** it anywhere on your computer
3. Open Chrome and go to `chrome://extensions`
4. Toggle on **Developer mode** in the top-right corner
5. Click **Load unpacked** and select the unzipped `tab-bouncer` folder
6. Done — the 🪃 icon appears in your toolbar

> **Tip:** Pin the extension to your toolbar so the badge is always visible.

---

## How it works

Tab Bouncer runs a background service worker that listens for tab events (page loads, tab switches, tab closures). When you navigate to a URL, it:

1. Normalizes the URL (strips tracking params, fragments, trailing slashes)
2. Compares it against all other open tabs across all windows
3. If matches are found — updates the badge, notifies the content script to show the toast, and prepares the popup data

Everything runs locally. No data leaves your browser, no network requests are made, no analytics, no telemetry.

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `tabs` | Read tab URLs and titles to detect duplicates |
| `storage` | Save lifetime stats (duplicates caught, tabs jumped to) |

That's it. No browsing history access, no host permissions beyond injecting the toast notification.

---

## URL Matching

Two tabs are considered duplicates when their normalized URLs match. Normalization does the following:

- Lowercases the full URL
- Removes the URL fragment (`#section`)
- Removes trailing slashes from the path
- Strips these tracking parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `fbclid`, `gclid`, `ref`, `source`

So these are all treated as the **same page**:

```
https://example.com/article
https://example.com/article/
https://example.com/article#comments
https://example.com/article?utm_source=newsletter&fbclid=abc123
```

---

## File Structure

```
tab-bouncer/
├── manifest.json      # Extension config (Manifest V3)
├── background.js      # Service worker: duplicate detection, badge, messaging
├── content.js         # In-page toast notification
├── popup.html         # Extension popup UI
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Development

Clone the repo and load the folder unpacked as described in Installation. Changes to `popup.html`, `content.js`, and `manifest.json` take effect after reloading the extension at `chrome://extensions`. Changes to `background.js` require clicking the refresh icon on the extension card.

There's no build step — it's vanilla JS, HTML, and CSS.

---

## Known Limitations

- **Chrome internal pages** (`chrome://`, `chrome-extension://`) are intentionally skipped — they can't be inspected.
- **Incognito tabs** are only visible to the extension if you've enabled "Allow in Incognito" on the extension card.
- **Local files** opened via `file://` paths are not checked.

---

## License

MIT — do whatever you want with it.

---

*Built for the tab hoarders. You know who you are.*
