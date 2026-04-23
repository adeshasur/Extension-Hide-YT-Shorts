/**
 * Hide YouTube Shorts — content.js (Final Boss Mode)
 */

// 1. FAST LOCAL REDIRECT
if (location.pathname.includes('/shorts/')) {
    location.replace('https://www.youtube.com/');
}

let isEnabled = true;

// Initialize state
chrome.storage.local.get(['enabled'], (data) => {
    isEnabled = data.enabled !== false;
    if (isEnabled) {
        initShield();
    }
});

function initShield() {
    injectStaticStyles();
    setupMutationObserver();
    hideShorts();
}

function injectStaticStyles() {
    if (document.getElementById('hys-styles')) return;
    const style = document.createElement('style');
    style.id = 'hys-styles';
    style.textContent = `
        /* ALL SHORTS ELEMENTS */
        [title="Shorts"],
        [aria-label="Shorts"],
        a[href*="/shorts/"],
        ytd-guide-entry-renderer:has(path[d*="m17.7 9.21"]),
        path[d*="m17.7 9.21"],
        ytd-reel-shelf-renderer,
        ytd-rich-shelf-renderer[is-shorts],
        ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
        tp-yt-paper-tab:has(yt-formatted-string[title="Shorts"]),
        ytd-mini-guide-entry-renderer:has(a[href="/shorts"]) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}

function hideShorts() {
    if (!isEnabled) return;
    
    // Find any direct link to shorts and kill the parent card
    const shortsLinks = document.querySelectorAll('a[href*="/shorts/"]');
    let found = 0;

    shortsLinks.forEach(a => {
        const parent = a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-guide-entry-renderer');
        if (parent && parent.style.display !== 'none') {
            parent.style.setProperty('display', 'none', 'important');
            found++;
        }
    });

    if (found > 0) {
        chrome.runtime.sendMessage({ type: 'UPDATE_COUNT', count: found });
    }
}

let observer = null;
function setupMutationObserver() {
    if (observer) return;
    
    observer = new MutationObserver(() => {
        if (location.pathname.includes('/shorts/')) {
            location.replace('https://www.youtube.com/');
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
    if (location.pathname.includes('/shorts/')) {
        location.replace('https://www.youtube.com/');
    }
};

window.addEventListener('popstate', () => {
    if (location.pathname.includes('/shorts/')) {
        location.replace('https://www.youtube.com/');
    }
});
