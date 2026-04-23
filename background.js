// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    blockedCount: 0
  });
});

// SUPER RELIABLE REDIRECT (Background level)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; // Only top-level
  
  chrome.storage.local.get(['enabled'], (data) => {
    if (data.enabled !== false && details.url.includes('/shorts/')) {
      chrome.tabs.update(details.tabId, { url: 'https://www.youtube.com/' });
    }
  });
}, { url: [{ hostContains: 'youtube.com', pathPrefix: '/shorts/' }] });

// Listen for messages from content script to update count
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_COUNT') {
    chrome.storage.local.get(['blockedCount'], (data) => {
      const newCount = (data.blockedCount || 0) + message.count;
      chrome.storage.local.set({ blockedCount: newCount });
    });
  }
});
