/**
 * Hide YouTube Shorts — content.js
 * Manifest V3 | Runs at document_start on *://*.youtube.com/*
 *
 * Responsibilities:
 *  1. Redirect /shorts/* URLs to youtube.com home immediately.
 *  2. Inject a <style> block to hide known Shorts elements via CSS.
 *  3. Use a MutationObserver to handle dynamically loaded content (SPA).
 */

// ─── 1. IMMEDIATE REDIRECT ────────────────────────────────────────────────────
// If the user lands on any /shorts URL, send them to the YouTube home page.
if (window.location.pathname.startsWith('/shorts')) {
  window.location.replace('https://www.youtube.com/');
}

// ─── 2. CSS-BASED HIDING (fast, paint-before-render) ─────────────────────────
// Injecting a <style> at document_start hides elements before they are painted,
// preventing any flash of Shorts content.
const style = document.createElement('style');
style.id = 'hys-styles';
style.textContent = `
  /* ── Sidebar navigation "Shorts" entry ── */
  ytd-guide-entry-renderer a[href="/shorts"],
  ytd-mini-guide-entry-renderer a[href="/shorts"] {
    display: none !important;
  }

  /* ── Home-page Shorts shelf ── */
  ytd-rich-shelf-renderer[is-shorts],
  ytd-reel-shelf-renderer {
    display: none !important;
  }

  /* ── Shorts chips / filter pills ── */
  yt-chip-cloud-chip-renderer[chip-style="STYLE_HOME_FILTER"][title="Shorts"] {
    display: none !important;
  }

  /* ── Shorts items inside search results / feeds ── */
  ytd-video-renderer:has(a[href*="/shorts/"]),
  ytd-grid-video-renderer:has(a[href*="/shorts/"]),
  ytd-compact-video-renderer:has(a[href*="/shorts/"]),
  ytd-rich-item-renderer:has(a[href*="/shorts/"]) {
    display: none !important;
  }

  /* ── Shorts section in channel pages ── */
  ytd-browse:not([page-subtype]) ytd-grid-renderer
    ytd-grid-video-renderer:has(a[href*="/shorts/"]) {
    display: none !important;
  }

  /* ── Shorts tab on channel pages ── */
  tp-yt-paper-tab:has(> yt-formatted-string[title="Shorts"]) {
    display: none !important;
  }

  /* ── Shorts in the Watch-next sidebar ── */
  ytd-compact-video-renderer:has(a.ytd-thumbnail[href*="/shorts/"]) {
    display: none !important;
  }
`;

// Append to <head> when available, otherwise to <html>
(document.head || document.documentElement).appendChild(style);

// ─── 3. JS-BASED HIDING (belt-and-suspenders for elements CSS :has() misses) ──

/**
 * Hides a single element by setting display:none.
 * @param {Element} el
 */
function hideEl(el) {
  if (el && el.style.display !== 'none') {
    el.style.setProperty('display', 'none', 'important');
  }
}

/**
 * Core logic: scans the document (or a subtree root) and hides all
 * Shorts-related elements found within it.
 * @param {Document|Element} root
 */
function hideShorts(root = document) {
  // Guard: root must support querySelector
  if (typeof root.querySelectorAll !== 'function') return;

  // 3a. Sidebar "Shorts" guide entry
  root.querySelectorAll(
    'ytd-guide-entry-renderer a[href="/shorts"], ytd-mini-guide-entry-renderer a[href="/shorts"]'
  ).forEach(a => hideEl(a.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer')));

  // 3b. Shorts shelves on the home feed
  root.querySelectorAll(
    'ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer'
  ).forEach(hideEl);

  // 3c. Any anchor that points to /shorts/... → hide the parent card
  root.querySelectorAll('a[href*="/shorts/"]').forEach(a => {
    // Walk up to find the meaningful container card
    const card = a.closest(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ' +
      'ytd-compact-video-renderer, ytd-playlist-video-renderer, ytd-reel-item-renderer'
    );
    if (card) hideEl(card);
  });

  // 3d. Shorts tab on channel pages ("<yt-formatted-string title="Shorts">")
  root.querySelectorAll('yt-formatted-string[title="Shorts"]').forEach(el => {
    const tab = el.closest('tp-yt-paper-tab');
    if (tab) hideEl(tab);
  });

  // 3e. "Shorts" chip / filter pill in the home feed
  root.querySelectorAll(
    'yt-chip-cloud-chip-renderer[title="Shorts"], ' +
    'yt-chip-cloud-chip-renderer[chip-style*="FILTER"]:has(yt-formatted-string[title="Shorts"])'
  ).forEach(hideEl);
}

// ─── 4. MUTATIONOBSERVER (SPA + infinite scroll support) ─────────────────────

let debounceTimer = null;

/**
 * Debounced wrapper so we don't fire hideShorts on every single micro-mutation.
 * Waits 120 ms of silence before running the full scan.
 */
function scheduleShortsHide() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => hideShorts(document), 120);
}

const observer = new MutationObserver(mutations => {
  // Quick early-exit: if no added nodes, nothing new to hide
  const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
  if (!hasAddedNodes) return;

  // Also check if a SPA navigation changed us to a /shorts URL
  if (window.location.pathname.startsWith('/shorts')) {
    window.location.replace('https://www.youtube.com/');
    return;
  }

  scheduleShortsHide();
});

// Start observing once the body is available
function startObserver() {
  const target = document.body || document.documentElement;
  observer.observe(target, { childList: true, subtree: true });
  // Run once immediately after attaching
  hideShorts(document);
}

// YouTube sets up the page skeleton before DOMContentLoaded fires.
// "document_start" means the body may not yet exist, so we wait:
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserver);
} else {
  // readyState is 'interactive' or 'complete' — body exists
  startObserver();
}

// ─── 5. SPA NAVIGATION GUARD ─────────────────────────────────────────────────
// YouTube uses the History API for client-side navigation.
// We monkey-patch pushState / replaceState to catch navigations to /shorts.

(function patchHistoryAPI() {
  const original = {
    pushState: history.pushState.bind(history),
    replaceState: history.replaceState.bind(history),
  };

  function interceptNavigation(url) {
    if (!url) return;
    try {
      const resolved = new URL(url, window.location.href);
      if (resolved.pathname.startsWith('/shorts')) {
        // Replace the destination with home — don't let the navigation complete
        window.location.replace('https://www.youtube.com/');
        return true; // signal: intercepted
      }
    } catch (_) { /* malformed URL — ignore */ }
    return false;
  }

  history.pushState = function (state, title, url) {
    if (!interceptNavigation(url)) {
      original.pushState(state, title, url);
      scheduleShortsHide();
    }
  };

  history.replaceState = function (state, title, url) {
    if (!interceptNavigation(url)) {
      original.replaceState(state, title, url);
      scheduleShortsHide();
    }
  };

  // popstate covers browser back/forward buttons
  window.addEventListener('popstate', () => {
    if (window.location.pathname.startsWith('/shorts')) {
      window.location.replace('https://www.youtube.com/');
    } else {
      scheduleShortsHide();
    }
  });
})();
