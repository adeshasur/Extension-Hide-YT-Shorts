/**
 * Hide YouTube Shorts — content.js (Ultra Fix)
 */

// 1. FAST REDIRECT (Run immediately, even before storage)
if (window.location.pathname.startsWith('/shorts/')) {
    window.location.replace('https://www.youtube.com/');
}

let isEnabled = true;
let totalBlocked = 0;

// Initialize state
chrome.storage.local.get(['enabled', 'blockedCount'], (data) => {
    isEnabled = data.enabled !== false;
    totalBlocked = data.blockedCount || 0;
    if (isEnabled) {
        initShield();
    }
});

// Watch for toggle
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        location.reload(); // Hard reload is most reliable for SPA 
    }
});

function initShield() {
    injectStaticStyles();
    setupMutationObserver();
    // Immediate scan
    hideShorts();
}

function injectStaticStyles() {
    if (document.getElementById('hys-styles')) return;
    const style = document.createElement('style');
    style.id = 'hys-styles';
    style.textContent = `
        /* Sidebar items */
        ytd-guide-entry-renderer:has(a[href="/shorts"]),
        ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
        /* Shelves */
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer,
        ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
        /* Channel tabs */
        tp-yt-paper-tab:has(yt-formatted-string[title="Shorts"]),
        /* Video cards in feeds */
        ytd-rich-item-renderer:has(a[href*="/shorts/"]),
        ytd-video-renderer:has(a[href*="/shorts/"]),
        ytd-grid-video-renderer:has(a[href*="/shorts/"]),
        ytd-compact-video-renderer:has(a[href*="/shorts/"]),
        /* Search chips */
        yt-chip-cloud-chip-renderer:has(yt-formatted-string[title="Shorts"]) {
            display: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}

function hideShorts() {
    if (!isEnabled) return;
    
    let blockedThisTurn = 0;

    // Direct check for the sidebar Shorts button (YouTube often re-renders this)
    const sidebarShorts = document.querySelectorAll('ytd-guide-entry-renderer a[href="/shorts"], ytd-mini-guide-entry-renderer a[href="/shorts"]');
    sidebarShorts.forEach(a => {
        const parent = a.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
        if (parent && parent.style.display !== 'none') {
            parent.style.setProperty('display', 'none', 'important');
            blockedThisTurn++;
        }
    });

    // Check for Shorts shelves
    const shelves = document.querySelectorAll('ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer');
    shelves.forEach(s => {
        if (s.style.display !== 'none') {
            s.style.setProperty('display', 'none', 'important');
            blockedThisTurn++;
        }
    });

    if (blockedThisTurn > 0) {
        totalBlocked += blockedThisTurn;
        chrome.storage.local.set({ blockedCount: totalBlocked });
    }
}

let observer = null;
function setupMutationObserver() {
    if (observer) return;
    
    observer = new MutationObserver(() => {
        // SPA check: if user navigated to /shorts via JS
        if (window.location.pathname.startsWith('/shorts/')) {
            window.location.replace('https://www.youtube.com/');
            return;
        }
        hideShorts();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

// History API patching for YouTube's SPA navigation
const originalPushState = history.pushState;
history.pushState = function() {
    originalPushState.apply(this, arguments);
    if (window.location.pathname.startsWith('/shorts/')) {
        window.location.replace('https://www.youtube.com/');
    }
};
