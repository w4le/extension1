document.getElementById('fetchBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Fetching latest posts...';
  status.className = 'status loading';
  
  chrome.runtime.sendMessage({ action: 'fetchNow' }, (response) => {
    if (response && response.success) {
      status.textContent = 'Found ' + response.posts.length + ' posts';
      status.className = 'status success';
      displayPosts(response.posts);
    } else {
      status.textContent = 'Error fetching posts';
      status.className = 'status error';
    }
  });
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('shareBtn').addEventListener('click', async () => {
  const shareOptions = [
    'Share via Email',
    'Copy Installation Instructions',
    'About this Extension'
  ];
  
  const choice = await showShareMenu(shareOptions);
  
  if (choice === 0) {
    const subject = 'Check out Social Monitor extension';
    const body = 'I found this cool Reddit monitoring extension. To install:\n\n1. Download the ZIP file\n2. Go to chrome://extensions/\n3. Enable Developer mode\n4. Click "Load unpacked"\n5. Select the unzipped folder';
    window.open('mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body));
  } else if (choice === 1) {
    const instructions = 'To install Social Monitor:\n\n1. Download the extension files\n2. Go to chrome://extensions/\n3. Enable Developer mode (top right)\n4. Click "Load unpacked"\n5. Select the extension folder\n\nEnjoy!';
    await navigator.clipboard.writeText(instructions);
    alert('Instructions copied to clipboard!');
  } else if (choice === 2) {
    alert('Social Monitor v2.0\n\nMonitor Reddit posts from your favorite subreddits and users. Get notified when new posts match your criteria.');
  }
});

function showShareMenu(options) {
  return new Promise((resolve) => {
    const menu = document.createElement('div');
    menu.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); z-index: 1000;';
    
    options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.style.cssText = 'display: block; width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer; border-radius: 5px;';
      btn.onclick = () => {
        document.body.removeChild(menu);
        resolve(index);
      };
      menu.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'display: block; width: 100%; padding: 10px; margin: 5px 0; border: none; background: #667eea; color: white; cursor: pointer; border-radius: 5px;';
    cancelBtn.onclick = () => {
      document.body.removeChild(menu);
      resolve(-1);
    };
    menu.appendChild(cancelBtn);
    
    document.body.appendChild(menu);
  });
}

function displayPosts(posts) {
  const postsDiv = document.getElementById('posts');
  
  if (!posts || posts.length === 0) {
    postsDiv.innerHTML = '<div class="empty-state">No posts found</div>';
    return;
  }
  
  postsDiv.innerHTML = '';
  
  posts.slice(0, 25).forEach(post => {
    const postItem = document.createElement('div');
    postItem.className = 'post-item';
    postItem.style.cursor = 'pointer';
    
    postItem.addEventListener('click', () => {
      chrome.tabs.create({ url: post.url });
    });
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'post-title';
    titleDiv.textContent = post.title;
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'post-meta';
    
    const subredditSpan = document.createElement('span');
    subredditSpan.textContent = 'r/' + post.subreddit;
    
    const authorSpan = document.createElement('span');
    authorSpan.textContent = 'u/' + post.author;
    
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'score';
    scoreSpan.textContent = post.score + ' points';
    
    const commentsSpan = document.createElement('span');
    commentsSpan.textContent = post.numComments + ' comments';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time-ago';
    timeSpan.textContent = post.timeAgo;
    
    metaDiv.appendChild(subredditSpan);
    metaDiv.appendChild(document.createTextNode(' | '));
    metaDiv.appendChild(authorSpan);
    metaDiv.appendChild(document.createTextNode(' | '));
    metaDiv.appendChild(scoreSpan);
    metaDiv.appendChild(document.createTextNode(' | '));
    metaDiv.appendChild(commentsSpan);
    metaDiv.appendChild(document.createTextNode(' | '));
    metaDiv.appendChild(timeSpan);
    
    postItem.appendChild(titleDiv);
    postItem.appendChild(metaDiv);
    
    postsDiv.appendChild(postItem);
  });
}