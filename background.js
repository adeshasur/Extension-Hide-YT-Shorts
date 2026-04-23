// Initialize default settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    hideSidebar: true,
    hideHome: true,
    redirectAll: true,
    blockedCount: 0
  });
  updateRedirectRule(true);
});

function updateRedirectRule(enabled) {
  if (enabled) {
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        id: 1,
        priority: 1,
        action: { type: 'redirect', redirect: { url: 'https://www.youtube.com/' } },
        condition: { urlFilter: '*://*.youtube.com/shorts/*', resourceTypes: ['main_frame'] }
      }],
      removeRuleIds: [1]
    });
  } else {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1]
    });
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.redirectAll) {
    updateRedirectRule(changes.redirectAll.newValue);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_COUNT') {
    chrome.storage.local.get(['blockedCount'], (data) => {
      chrome.storage.local.set({ blockedCount: (data.blockedCount || 0) + message.count });
    });
  }
});
