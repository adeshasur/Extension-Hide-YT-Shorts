/**
 * Hide YouTube Shorts — content.js (Elite Version)
 */

let config = {
  hideSidebar: true,
  hideHome: true,
  redirectAll: true
};

// 1. Initial Redirect
if (location.pathname.startsWith('/shorts/')) {
    chrome.storage.local.get(['redirectAll'], (data) => {
        if (data.redirectAll !== false) {
            location.replace('https://www.youtube.com/');
        }
    });
}

// Load config and start shielding
chrome.storage.local.get(['hideSidebar', 'hideHome', 'redirectAll'], (data) => {
    config = { ...config, ...data };
    initShield();
});

function initShield() {
    injectDynamicCSS();
    setupMutationObserver();
    hideShorts(document);
}

function injectDynamicCSS() {
    if (document.getElementById('hys-styles')) document.getElementById('hys-styles').remove();
    
    const style = document.createElement('style');
    style.id = 'hys-styles';
    
    let css = '';
    
    if (config.hideSidebar) {
        css += `
            ytd-guide-entry-renderer:has(a[href*="/shorts"]),
            ytd-mini-guide-entry-renderer:has(a[href*="/shorts"]),
            [title="Shorts"], [aria-label="Shorts"],
            path[d*="m17.7 9.21"], path[d*="L10 15.46v-6.92"] { display: none !important; }
        `;
    }
    
    if (config.hideHome) {
        css += `
            ytd-rich-shelf-renderer[is-shorts],
            ytd-reel-shelf-renderer,
            ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
            ytd-rich-item-renderer:has(a[href*="/shorts/"]) { display: none !important; }
        `;
    }

    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
}

function hideShorts(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    
    let found = 0;
    
    if (config.hideHome) {
        root.querySelectorAll('a[href*="/shorts/"]').forEach(a => {
            const card = a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
            if (card && card.style.display !== 'none') {
                card.style.display = 'none';
                found++;
            }
        });
    }

    if (found > 0) {
        chrome.runtime.sendMessage({ type: 'UPDATE_COUNT', count: found });
    }
}

function setupMutationObserver() {
    const observer = new MutationObserver(() => {
        if (config.redirectAll && location.pathname.startsWith('/shorts/')) {
            location.replace('https://www.youtube.com/');
            return;
        }
        hideShorts(document);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

// Listen for config changes live
chrome.storage.onChanged.addListener((changes) => {
    let changed = false;
    for (let key in changes) {
        if (config.hasOwnProperty(key)) {
            config[key] = changes[key].newValue;
            changed = true;
        }
    }
    if (changed) {
        injectDynamicCSS();
        hideShorts(document);
    }
});
