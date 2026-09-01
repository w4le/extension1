document.addEventListener('DOMContentLoaded', async () => {
  const { settings } = await chrome.storage.sync.get('settings');
  
  if (settings) {
    document.getElementById('subreddits').value = (settings.subreddits || []).join('\n');
    document.getElementById('users').value = (settings.users || []).join('\n');
    document.getElementById('sortBy').value = settings.sortBy || 'new';
    document.getElementById('includeKeywords').value = (settings.includeKeywords || []).join('\n');
    document.getElementById('excludeKeywords').value = (settings.excludeKeywords || []).join('\n');
    document.getElementById('postsPerSubreddit').value = settings.postsPerSubreddit || 5;
    document.getElementById('minScore').value = settings.minScore || 1;
    document.getElementById('timeFilter').value = settings.timeFilter || 'latest';
    document.getElementById('checkInterval').value = settings.checkIntervalMinutes || 30;
    document.getElementById('maxNotifications').value = settings.maxNotificationsPerDay || 10;
    document.getElementById('timezone').value = settings.timezone || 'UTC';
    
    document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled !== false;
    
    if (settings.notificationMethods) {
      document.getElementById('desktopNotif').checked = settings.notificationMethods.desktop;
      document.getElementById('emailNotif').checked = settings.notificationMethods.email;
    }
    
    if (settings.emailAddress) {
      document.getElementById('emailAddress').value = settings.emailAddress;
    }
    
    if (settings.notificationTimes && settings.notificationTimes.length > 0) {
      document.getElementById('notifTime1').value = settings.notificationTimes[0] || '';
      document.getElementById('notifTime2').value = settings.notificationTimes[1] || '';
      document.getElementById('notifTime3').value = settings.notificationTimes[2] || '';
    }
    
    toggleEmailSection();
  }
});

document.getElementById('emailNotif').addEventListener('change', toggleEmailSection);

function toggleEmailSection() {
  const emailSection = document.getElementById('emailSection');
  const emailNotif = document.getElementById('emailNotif');
  emailSection.style.display = emailNotif.checked ? 'block' : 'none';
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const notificationTimes = [
    document.getElementById('notifTime1').value,
    document.getElementById('notifTime2').value,
    document.getElementById('notifTime3').value
  ].filter(time => time !== '');
  
  const settings = {
    subreddits: getList('subreddits'),
    users: getList('users'),
    includeKeywords: getList('includeKeywords'),
    excludeKeywords: getList('excludeKeywords'),
    postsPerSubreddit: parseInt(document.getElementById('postsPerSubreddit').value) || 5,
    minScore: parseInt(document.getElementById('minScore').value) || 0,
    sortBy: document.getElementById('sortBy').value,
    timeFilter: document.getElementById('timeFilter').value,
    checkIntervalMinutes: parseInt(document.getElementById('checkInterval').value) || 30,
    maxNotificationsPerDay: parseInt(document.getElementById('maxNotifications').value) || 10,
    notificationsEnabled: document.getElementById('notificationsEnabled').checked,
    notificationMethods: {
      desktop: document.getElementById('desktopNotif').checked,
      email: document.getElementById('emailNotif').checked
    },
    emailAddress: document.getElementById('emailAddress').value,
    notificationTimes: notificationTimes,
    timezone: document.getElementById('timezone').value,
    notifiedPosts: [],
    lastCheck: null
  };
  
  chrome.runtime.sendMessage({ action: 'saveSettings', settings: settings }, (response) => {
    if (response && response.success) {
      alert('Settings saved!');
    }
  });
});

function getList(elementId) {
  return document.getElementById(elementId).value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}