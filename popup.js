const settings = ['hideSidebar', 'hideHome', 'redirectAll'];

document.addEventListener('DOMContentLoaded', () => {
  const blockedCountEl = document.getElementById('blockedCount');

  // Load stats and settings
  chrome.storage.local.get(['blockedCount', ...settings], (data) => {
    blockedCountEl.textContent = data.blockedCount || 0;
    
    settings.forEach(key => {
      const el = document.getElementById(key);
      el.checked = data[key] !== false;
      
      el.addEventListener('change', () => {
        chrome.storage.local.set({ [key]: el.checked });
      });
    });
  });

  // Live updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blockedCount) {
      blockedCountEl.textContent = changes.blockedCount.newValue;
      animateValue(blockedCountEl);
    }
  });
});

function animateValue(el) {
  el.style.transform = 'scale(1.2)';
  setTimeout(() => {
    el.style.transform = 'scale(1)';
  }, 200);
}
