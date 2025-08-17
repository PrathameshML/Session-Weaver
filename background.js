// background.js (UPDATED to save page titles)

// The core data structure for our session
const initialSessionData = {
  activeTrees: {}, // key: tabId, value: { root: node, lastNavigatedUrl: url }
  closedTrees: []  // array of { root: node, closedAt: timestamp }
};

// --- Helper Functions ---
// Finds a node within a tree by its URL
function findNodeByUrl(node, url) {
  if (node.url === url) return node;
  for (const child of node.children) {
    const found = findNodeByUrl(child, url);
    if (found) return found;
  }
  return null;
}

// Resets the session data to a clean slate
async function resetSession() {
  await chrome.storage.local.set({ sessionData: JSON.parse(JSON.stringify(initialSessionData)) });
  console.log("Chrome Session Weaver: Session has been reset.");
}

// --- Event Listeners ---

// 1. On Install or Startup: Reset the session for a fresh start.
chrome.runtime.onInstalled.addListener(resetSession);
chrome.runtime.onStartup.addListener(resetSession);

// 2. On Navigation: This is where we build the tree.
chrome.webNavigation.onCommitted.addListener(async (details) => {
  // We only care about main frame navigation, not iframes or ads
  if (details.frameId !== 0 || !details.url.startsWith('http')) return;

  const { tabId, url } = details;
  const { sessionData } = await chrome.storage.local.get('sessionData');
  
  // Wait a tiny bit for the tab's title to be updated after navigation
  setTimeout(async () => {
    try {
      const tab = await chrome.tabs.get(tabId);
      const title = (tab.title && tab.title !== url) ? tab.title : new URL(url).hostname;

      const newNode = {
        url: url,
        title: title,
        children: []
      };

      let activeTabTree = sessionData.activeTrees[tabId];

      if (!activeTabTree) { // First navigation in a new tree
        sessionData.activeTrees[tabId] = { root: newNode, lastNavigatedUrl: url };
      } else { // Subsequent navigation in an existing tree
        const parentNode = findNodeByUrl(activeTabTree.root, activeTabTree.lastNavigatedUrl);
        if (parentNode && parentNode.url !== url && !parentNode.children.some(c => c.url === url)) {
          parentNode.children.push(newNode);
        }
        activeTabTree.lastNavigatedUrl = url;
      }
      await chrome.storage.local.set({ sessionData });
    } catch (error) {
      console.log(`Could not process tab ${tabId}. It may have been closed.`, error);
    }
  }, 150); // 150ms delay
});

// 3. On Tab Close: Move the journey from 'active' to 'closed'.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { sessionData } = await chrome.storage.local.get('sessionData');
  const closedTree = sessionData.activeTrees[tabId];

  if (closedTree) {
    sessionData.closedTrees.unshift({ root: closedTree.root, closedAt: new Date().toISOString() });
    if (sessionData.closedTrees.length > 25) { // Limit to 25 closed trees
      sessionData.closedTrees.pop();
    }
    delete sessionData.activeTrees[tabId];
    await chrome.storage.local.set({ sessionData });
  }
});