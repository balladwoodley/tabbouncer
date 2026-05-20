// Tab Bouncer - Content Script
// Shows a subtle in-page banner when duplicates are detected

(function() {
  'use strict';

  let toastEl = null;
  let hideTimer = null;

  function getOrCreateToast() {
    if (toastEl && document.body.contains(toastEl)) return toastEl;

    toastEl = document.createElement('div');
    toastEl.id = '__tab_bouncer_toast__';
    toastEl.setAttribute('style', `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      background: #1a1a1a;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      line-height: 1.4;
      border-radius: 10px;
      padding: 0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
      max-width: 300px;
      min-width: 220px;
      transform: translateX(calc(100% + 24px));
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
      opacity: 0;
      pointer-events: all;
      overflow: hidden;
    `);

    toastEl.innerHTML = `
      <div id="__tb_inner__" style="padding: 12px 14px 14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="font-size:16px;">🪃</span>
            <strong style="font-size:13px;color:#ff453a;letter-spacing:0.02em;">Already open!</strong>
          </div>
          <button id="__tb_close__" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;line-height:1;padding:0 2px;margin-left:8px;" title="Dismiss">×</button>
        </div>
        <div id="__tb_body__" style="color:#ccc;font-size:12px;"></div>
        <div id="__tb_actions__" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;"></div>
      </div>
      <div style="height:3px;background:linear-gradient(90deg,#ff453a,#ff9500);"></div>
    `;

    document.documentElement.appendChild(toastEl);

    toastEl.querySelector('#__tb_close__').addEventListener('click', hideToast);

    return toastEl;
  }

  function showToast(count, tabs) {
    const el = getOrCreateToast();
    const body = el.querySelector('#__tb_body__');
    const actions = el.querySelector('#__tb_actions__');

    body.textContent = count === 1
      ? `You already have this page open in another tab.`
      : `You have this page open in ${count} other tabs.`;

    actions.innerHTML = '';

    // Show "Switch to tab" buttons (max 2)
    tabs.slice(0, 2).forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.textContent = i === 0 ? 'Switch to it' : `Tab ${i + 1}`;
      btn.setAttribute('style', `
        background: #2a2a2a;
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 11px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
      `);
      btn.addEventListener('mouseover', () => btn.style.background = '#3a3a3a');
      btn.addEventListener('mouseout', () => btn.style.background = '#2a2a2a');
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'JUMP_TO_TAB', tabId: tab.id, windowId: tab.windowId });
        hideToast();
      });
      actions.appendChild(btn);
    });

    // "Close this tab" button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close this one';
    closeBtn.setAttribute('style', `
      background: rgba(255,59,48,0.15);
      border: 1px solid rgba(255,59,48,0.3);
      color: #ff453a;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    `);
    closeBtn.addEventListener('mouseover', () => closeBtn.style.background = 'rgba(255,59,48,0.25)');
    closeBtn.addEventListener('mouseout', () => closeBtn.style.background = 'rgba(255,59,48,0.15)');
    closeBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'CLOSE_CURRENT_AND_JUMP',
        targetTabId: tabs[0].id,
        windowId: tabs[0].windowId,
        currentTabId: null // background will use sender tab
      });
    });
    actions.appendChild(closeBtn);

    // Show
    requestAnimationFrame(() => {
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });

    // Auto-hide after 7s
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideToast, 7000);
  }

  function hideToast() {
    if (!toastEl) return;
    toastEl.style.transform = 'translateX(calc(100% + 24px))';
    toastEl.style.opacity = '0';
    if (hideTimer) clearTimeout(hideTimer);
  }

  // Listen from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'DUPLICATE_STATUS') {
      if (msg.count > 0) {
        showToast(msg.count, msg.tabs);
      } else {
        hideToast();
      }
    }
  });

})();
