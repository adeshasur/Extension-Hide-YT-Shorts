/**
 * Hide YouTube Shorts — content.js (Deep Research Edition)
 */

// 1. INSTANT REDIRECT (Before anything else)
if (location.pathname.startsWith('/shorts/')) {
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
    injectAggressiveCSS();
    setupMutationObserver();
    // Immediate cleaning
    hideShorts(document);
}

function injectAggressiveCSS() {
    if (document.getElementById('hys-styles')) return;
    const style = document.createElement('style');
    style.id = 'hys-styles';
    style.textContent = `
        /* 1. SIDEBAR (Full & Mini) */
        ytd-guide-entry-renderer:has(a[href*="/shorts"]),
        ytd-mini-guide-entry-renderer:has(a[href*="/shorts"]),
        ytd-guide-entry-renderer:has([title="Shorts"]),
        ytd-mini-guide-entry-renderer:has([title="Shorts"]),
        ytd-guide-entry-renderer:has(path[d*="m17.7 9.21"]),
        ytd-guide-entry-renderer:has(path[d*="L10 15.46v-6.92"]),
        
        /* 2. HOME FEED SHELVES */
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer,
        ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
        ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),
        
        /* 3. CHANNEL TABS */
        yt-tab-shape[tab-title="Shorts"],
        yt-tab-shape:has(div:contains("Shorts")),
        tp-yt-paper-tab:has(yt-formatted-string:contains("Shorts")),
        
        /* 4. VIDEO ITEMS IN FEEDS */
        ytd-rich-item-renderer:has(a[href*="/shorts/"]),
        ytd-video-renderer:has(a[href*="/shorts/"]),
        ytd-grid-video-renderer:has(a[href*="/shorts/"]),
        ytd-compact-video-renderer:has(a[href*="/shorts/"]),
        
        /* 5. SEARCH RESULTS */
        ytd-shelf-renderer:has(span#title:contains("Shorts")),
        ytd-reel-shelf-renderer,
        
        /* GLOBAL OVERRIDE */
        [title="Shorts"],
        [aria-label="Shorts"],
        a[href^="/shorts/"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}

function hideShorts(root) {
    if (!isEnabled || !root || typeof root.querySelectorAll !== 'function') return;
    
    let found = 0;

    // Hard scan for any link to /shorts/
    const links = root.querySelectorAll('a[href*="/shorts/"]');
    links.forEach(a => {
        const parent = a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
        if (parent && parent.style.display !== 'none') {
            parent.style.setProperty('display', 'none', 'important');
            found++;
        }
    });

    // Special scan for the SVG path (YouTube's secret weapon)
    const icons = root.querySelectorAll('path[d*="m17.7 9.21"], path[d*="L10 15.46v-6.92"]');
    icons.forEach(path => {
        const parent = path.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer');
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
    observer = new MutationObserver((mutations) => {
        if (location.pathname.startsWith('/shorts/')) {
            location.replace('https://www.youtube.com/');
            return;
        }
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) hideShorts(node);
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

// SPA Navigation Guard
const guard = () => {
    if (location.pathname.startsWith('/shorts/')) {
        location.replace('https://www.youtube.com/');
    }
};

window.addEventListener('yt-navigate-finish', guard);
window.addEventListener('popstate', guard);

// Patch History API
const originalPushState = history.pushState;
history.pushState = function() {
    originalPushState.apply(this, arguments);
    guard();
};
