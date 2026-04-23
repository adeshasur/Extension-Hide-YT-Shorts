// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    blockedCount: 0
  });

  // Setup Declarative Net Request rules for instant redirection
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: 'https://www.youtube.com/' }
      },
      condition: {
        urlFilter: '*://*.youtube.com/shorts/*',
        resourceTypes: ['main_frame']
      }
    }
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: rules
  });
});

// Update rules when toggle is changed
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    const isEnabled = changes.enabled.newValue;
    if (isEnabled) {
      chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [{
          id: 1,
          priority: 1,
          action: { type: 'redirect', redirect: { url: 'https://www.youtube.com/' } },
          condition: { urlFilter: '*://*.youtube.com/shorts/*', resourceTypes: ['main_frame'] }
        }]
      });
    } else {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1]
      });
    }
  }
});

// Listen for messages from content script to update count
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_COUNT') {
    chrome.storage.local.get(['blockedCount'], (data) => {
      const newCount = (data.blockedCount || 0) + message.count;
      chrome.storage.local.set({ blockedCount: newCount });
    });
  }
});
