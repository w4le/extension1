const DEFAULT_SETTINGS = {
  subreddits: ['forhire'],
  users: [],
  includeKeywords: [],
  excludeKeywords: [],
  postsPerSubreddit: 5,
  minScore: 1,
  sortBy: 'new',
  checkIntervalMinutes: 30,
  timeFilter: 'latest',
  maxNotificationsPerDay: 10,
  notificationsEnabled: true,
  notificationMethods: {
    desktop: true,
    email: false
  },
  emailAddress: '',
  notificationTimes: [],
  timezone: 'UTC',
  lastCheck: null,
  notifiedPosts: []
};

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.sync.get('settings');
  if (!settings.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
  await startAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await startAlarm();
});

async function startAlarm() {
  const { settings } = await chrome.storage.sync.get('settings');
  
  if (!settings.notificationsEnabled) {
    await chrome.alarms.clear('checkPosts');
    console.log('Notifications disabled, no alarm set');
    return;
  }
  
  const interval = settings.checkIntervalMinutes || 30;
  
  await chrome.alarms.clear('checkPosts');
  chrome.alarms.create('checkPosts', {
    periodInMinutes: interval,
    delayInMinutes: 1
  });
  
  console.log('Alarm set for every ' + interval + ' minutes');
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkPosts') {
    await checkAndNotify();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchNow') {
    fetchAllPosts().then(result => {
      sendResponse({ success: true, posts: result.posts });
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ settings: request.settings }, async () => {
      await startAlarm();
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get('settings', (data) => {
      sendResponse({ settings: data.settings });
    });
    return true;
  }
});

async function checkAndNotify() {
  const { settings } = await chrome.storage.sync.get('settings');
  
  if (!settings.notificationsEnabled) {
    console.log('Notifications disabled');
    return;
  }
  
  if (settings.notificationTimes && settings.notificationTimes.length > 0) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + ':' + (currentMinute < 10 ? '0' : '') + currentMinute;
    
    if (!settings.notificationTimes.includes(currentTime)) {
      console.log('Not a notification time');
      return;
    }
  }
  
  const result = await fetchAllPosts();
  const newPosts = result.posts.filter(post => 
    !settings.notifiedPosts.includes(post.id)
  );
  
  if (newPosts.length > 0) {
    const notifyCount = Math.min(newPosts.length, settings.maxNotificationsPerDay);
    const postsToNotify = newPosts.slice(0, notifyCount);
    
    if (settings.notificationMethods.desktop) {
      sendDesktopNotification(postsToNotify);
    }
    
    if (settings.notificationMethods.email && settings.emailAddress) {
      sendEmailNotification(postsToNotify, settings.emailAddress);
    }
    
    settings.notifiedPosts = [...settings.notifiedPosts, ...postsToNotify.map(p => p.id)].slice(-500);
    settings.lastCheck = new Date().toISOString();
    await chrome.storage.sync.set({ settings });
  }
  
  await chrome.storage.local.set({
    lastPosts: newPosts,
    lastUpdate: new Date().toISOString()
  });
}

async function fetchAllPosts() {
  const { settings } = await chrome.storage.sync.get('settings');
  let allPosts = [];
  const now = Date.now();
  
  for (const subreddit of settings.subreddits) {
    try {
      const cleanSub = subreddit.replace(/^r\//, '').trim();
      const response = await fetch('https://www.reddit.com/r/' + cleanSub + '/' + settings.sortBy + '.json?limit=' + settings.postsPerSubreddit);
      const data = await response.json();
      
      for (const child of data.data.children) {
        const post = child.data;
        const postTime = post.created_utc * 1000;
        const timeDiff = now - postTime;
        
        if (post.score < settings.minScore) continue;
        
        const searchText = (post.title + ' ' + post.selftext).toLowerCase();
        
        if (settings.includeKeywords.length > 0) {
          const hasKeyword = settings.includeKeywords.some(kw => searchText.includes(kw.toLowerCase()));
          if (!hasKeyword) continue;
        }
        
        if (settings.excludeKeywords.length > 0) {
          const hasExcludedKeyword = settings.excludeKeywords.some(kw => searchText.includes(kw.toLowerCase()));
          if (hasExcludedKeyword) continue;
        }
        
        allPosts.push({
          id: post.id,
          title: post.title,
          url: 'https://reddit.com' + post.permalink,
          score: post.score,
          numComments: post.num_comments,
          subreddit: cleanSub,
          author: post.author,
          created: new Date(postTime).toISOString(),
          timeAgo: getTimeAgo(timeDiff)
        });
      }
    } catch (error) {
      console.error('Error fetching r/' + subreddit + ':', error);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  for (const user of settings.users) {
    try {
      const cleanUser = user.replace(/^u\//, '').trim();
      const response = await fetch('https://www.reddit.com/user/' + cleanUser + '/submitted.json?limit=' + settings.postsPerSubreddit);
      const data = await response.json();
      
      for (const child of data.data.children) {
        const post = child.data;
        const postTime = post.created_utc * 1000;
        const timeDiff = now - postTime;
        
        if (post.score < settings.minScore) continue;
        
        const searchText = (post.title + ' ' + post.selftext).toLowerCase();
        
        if (settings.includeKeywords.length > 0) {
          const hasKeyword = settings.includeKeywords.some(kw => searchText.includes(kw.toLowerCase()));
          if (!hasKeyword) continue;
        }
        
        if (settings.excludeKeywords.length > 0) {
          const hasExcludedKeyword = settings.excludeKeywords.some(kw => searchText.includes(kw.toLowerCase()));
          if (hasExcludedKeyword) continue;
        }
        
        allPosts.push({
          id: 'user-' + post.id,
          title: post.title,
          url: 'https://reddit.com' + post.permalink,
          score: post.score,
          numComments: post.num_comments,
          subreddit: post.subreddit,
          author: post.author,
          created: new Date(postTime).toISOString(),
          timeAgo: getTimeAgo(timeDiff)
        });
      }
    } catch (error) {
      console.error('Error fetching u/' + user + ':', error);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (settings.timeFilter && settings.timeFilter !== 'latest') {
    const maxAge = parseInt(settings.timeFilter) * 60 * 1000;
    allPosts = allPosts.filter(post => {
      const postTime = new Date(post.created).getTime();
      return (now - postTime) <= maxAge;
    });
  }
  
  allPosts.sort((a, b) => new Date(b.created) - new Date(a.created));
  
  return { posts: allPosts };
}

function getTimeAgo(diff) {
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  return hours + 'h ago';
}

function sendDesktopNotification(posts) {
  const title = posts.length + ' New Posts Found';
  const message = posts.slice(0, 3).map(p => p.title.substring(0, 60)).join('\n');
  
  chrome.notifications.create('notify-' + Date.now(), {
    type: 'basic',
    title: title,
    message: message,
    priority: 1,
    buttons: [{ title: 'View Posts' }]
  });
}

async function sendEmailNotification(posts, emailAddress) {
  console.log('Email notification would be sent to ' + emailAddress + ' with ' + posts.length + ' posts');
  console.log('Email integration requires a backend service');
}