// Tab Bouncer - Background Service Worker

// Normalize URL for comparison: strip trailing slashes, fragments, some tracking params
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Remove fragment
    u.hash = '';
    // Remove common tracking params
    const trackingParams = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','ref','source'];
    trackingParams.forEach(p => u.searchParams.delete(p));
    // Remove trailing slash from pathname
    if (u.pathname.endsWith('/') && u.pathname.length > 1) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function shouldCheck(url) {
  if (!url) return false;
  const skip = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'moz-extension://', 'file://'];
  return !skip.some(s => url.startsWith(s));
}

async function findDuplicates(tabId, url) {
  if (!shouldCheck(url)) return [];
  const normalized = normalizeUrl(url);
  const allTabs = await chrome.tabs.query({});
  return allTabs.filter(t => t.id !== tabId && shouldCheck(t.url) && normalizeUrl(t.url) === normalized);
}

// Badge update
async function updateBadge(tabId, url) {
  const dupes = await findDuplicates(tabId, url);
  if (dupes.length > 0) {
    chrome.action.setBadgeText({ text: `${dupes.length}`, tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#FF3B30', tabId });
    chrome.action.setTitle({ title: `Tab Bouncer: ${dupes.length} duplicate tab${dupes.length > 1 ? 's' : ''} open!`, tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
    chrome.action.setTitle({ title: 'Tab Bouncer: No duplicates', tabId });
  }
  return dupes;
}

// Send message to content script if possible
async function notifyContentScript(tabId, dupes) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'DUPLICATE_STATUS',
      count: dupes.length,
      tabs: dupes.map(t => ({ id: t.id, title: t.title, windowId: t.windowId }))
    });
  } catch {
    // Content script may not be ready, that's OK
  }
}

// Increment stats counter
async function bumpStat(key) {
  const data = await chrome.storage.local.get(['stats']);
  const stats = data.stats || { duplicatesCaught: 0, tabsJumpedTo: 0 };
  stats[key] = (stats[key] || 0) + 1;
  await chrome.storage.local.set({ stats });
}

// Check tab on update
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const dupes = await updateBadge(tabId, tab.url);
    if (dupes.length > 0) {
      await bumpStat('duplicatesCaught');
      // Small delay so content script is ready
      setTimeout(() => notifyContentScript(tabId, dupes), 800);
    }
  }
});

// Re-check when any tab is removed or updated (might affect others)
chrome.tabs.onRemoved.addListener(async () => {
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    if (tab.url && shouldCheck(tab.url)) {
      await updateBadge(tab.id, tab.url);
    }
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) {
    const dupes = await updateBadge(tabId, tab.url);
    if (dupes.length > 0) {
      setTimeout(() => notifyContentScript(tabId, dupes), 200);
    }
  }
});

// Message from popup: jump to existing tab
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'JUMP_TO_TAB') {
    bumpStat('tabsJumpedTo');
    chrome.tabs.update(msg.tabId, { active: true });
    chrome.windows.update(msg.windowId, { focused: true });
    sendResponse({ ok: true });
  }
  if (msg.type === 'CLOSE_CURRENT_AND_JUMP') {
    bumpStat('tabsJumpedTo');
    chrome.tabs.update(msg.targetTabId, { active: true });
    chrome.windows.update(msg.windowId, { focused: true });
    chrome.tabs.remove(msg.currentTabId);
    sendResponse({ ok: true });
  }
  if (msg.type === 'GET_DUPLICATES') {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab) { sendResponse({ dupes: [] }); return; }
      const dupes = await findDuplicates(tab.id, tab.url);
      sendResponse({ dupes: dupes.map(t => ({ id: t.id, title: t.title, url: t.url, windowId: t.windowId, favIconUrl: t.favIconUrl })), currentTabId: tab.id });
    });
    return true; // async
  }
  if (msg.type === 'GET_STATS') {
    chrome.storage.local.get(['stats'], (data) => {
      sendResponse({ stats: data.stats || { duplicatesCaught: 0, tabsJumpedTo: 0 } });
    });
    return true;
  }
  return true;
});
