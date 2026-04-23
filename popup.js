document.addEventListener('DOMContentLoaded', () => {
  const mainToggle = document.getElementById('mainToggle');
  const statusBadge = document.getElementById('statusBadge');
  const blockedCountEl = document.getElementById('blockedCount');

  // Load initial state
  chrome.storage.local.get(['enabled', 'blockedCount'], (data) => {
    mainToggle.checked = data.enabled !== false;
    blockedCountEl.textContent = data.blockedCount || 0;
    updateBadge(mainToggle.checked);
  });

  // Handle toggle change
  mainToggle.addEventListener('change', () => {
    const isEnabled = mainToggle.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    updateBadge(isEnabled);
  });

  function updateBadge(enabled) {
    if (enabled) {
      statusBadge.textContent = 'Active';
      statusBadge.classList.remove('inactive');
    } else {
      statusBadge.textContent = 'Paused';
      statusBadge.classList.add('inactive');
    }
  }

  // Listen for count updates from content script
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blockedCount) {
      blockedCountEl.textContent = changes.blockedCount.newValue;
    }
  });
});
