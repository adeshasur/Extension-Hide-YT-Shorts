/**
 * Hide YouTube Shorts — content.js (Advanced Edition)
 */

let isEnabled = true;
let totalBlocked = 0;

// Initialize state from storage
chrome.storage.local.get(['enabled', 'blockedCount'], (data) => {
  isEnabled = data.enabled !== false;
  totalBlocked = data.blockedCount || 0;
  if (isEnabled) {
    applyShield();
  }
});

// Watch for setting changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
    if (isEnabled) {
      applyShield();
      location.reload(); // Reload to apply hiding immediately
    } else {
      removeShield();
      location.reload(); // Reload to bring Shorts back
    }
  }
});

function applyShield() {
  if (window.location.pathname.startsWith('/shorts')) {
    window.location.replace('https://www.youtube.com/');
  }
  injectCSS();
  startObserver();
}

function removeShield() {
  const style = document.getElementById('hys-styles');
  if (style) style.remove();
  if (observer) observer.disconnect();
}

function injectCSS() {
  if (document.getElementById('hys-styles')) return;
  const style = document.createElement('style');
  style.id = 'hys-styles';
  style.textContent = `
    ytd-guide-entry-renderer a[href="/shorts"],
    ytd-mini-guide-entry-renderer a[href="/shorts"],
    ytd-rich-shelf-renderer[is-shorts],
    ytd-reel-shelf-renderer,
    ytd-video-renderer:has(a[href*="/shorts/"]),
    ytd-grid-video-renderer:has(a[href*="/shorts/"]),
    ytd-compact-video-renderer:has(a[href*="/shorts/"]),
    ytd-rich-item-renderer:has(a[href*="/shorts/"]),
    tp-yt-paper-tab:has(> yt-formatted-string[title="Shorts"]),
    yt-chip-cloud-chip-renderer[chip-style="STYLE_HOME_FILTER"][title="Shorts"] {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function updateBlockedCount(count) {
  if (count <= 0) return;
  totalBlocked += count;
  chrome.storage.local.set({ blockedCount: totalBlocked });
}

function hideShorts(root = document) {
  if (!isEnabled || typeof root.querySelectorAll !== 'function') return;

  let found = 0;
  
  // Sidebar
  root.querySelectorAll('ytd-guide-entry-renderer a[href="/shorts"], ytd-mini-guide-entry-renderer a[href="/shorts"]')
    .forEach(a => {
      const el = a.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
      if (el && el.style.display !== 'none') {
        el.style.display = 'none';
        found++;
      }
    });

  // Shelves
  root.querySelectorAll('ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer')
    .forEach(el => {
      if (el.style.display !== 'none') {
        el.style.display = 'none';
        found++;
      }
    });

  // Video cards
  root.querySelectorAll('a[href*="/shorts/"]').forEach(a => {
    const card = a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
    if (card && card.style.display !== 'none') {
      card.style.display = 'none';
      found++;
    }
  });

  updateBlockedCount(found);
}

let observer = null;
let debounceTimer = null;

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith('/shorts')) {
      window.location.replace('https://www.youtube.com/');
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => hideShorts(document), 200);
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
}

if (document.readyState !== 'loading') {
  if (isEnabled) startObserver();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if (isEnabled) startObserver();
  });
}
