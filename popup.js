// popup.js - Updated to trigger cascade animations

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. GET ALL DOM ELEMENTS ---
    const activeContainer = document.getElementById('active-container');
    const closedContainer = document.getElementById('closed-container');
    const resetButton = document.getElementById('reset-button');

    // --- 2. ADD EVENT LISTENERS ---
    resetButton.addEventListener('click', async () => {
        await chrome.storage.local.set({ 
            sessionData: { activeTrees: {}, closedTrees: [] }
        });
        window.location.reload();
    });

    // --- 3. FETCH DATA AND RENDER THE UI ---
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let { sessionData } = await chrome.storage.local.get('sessionData');

    if (!sessionData) {
        sessionData = { activeTrees: {}, closedTrees: [] };
    }

    const activeTabIds = Object.keys(sessionData.activeTrees);
    if (activeTabIds.length > 0) {
        activeContainer.innerHTML = '';
        activeTabIds.forEach(tabId => {
            const rootNode = sessionData.activeTrees[tabId].root;
            const treeContainer = createTreeContainer(rootNode, currentTab.url);
            activeContainer.appendChild(treeContainer);
        });
    }

    if (sessionData.closedTrees.length > 0) {
        closedContainer.innerHTML = '';
        sessionData.closedTrees.forEach(treeData => {
            const rootNode = treeData.root;
            const treeContainer = createTreeContainer(rootNode, currentTab.url);
            closedContainer.appendChild(treeContainer);
        });
    }

    // --- 4. APPLY CASCADE ANIMATION TO NEWLY RENDERED NODES ---
    const allNodes = document.querySelectorAll('.tree-node');
    allNodes.forEach((node, index) => {
        // Stagger the animation start time for a beautiful effect
        node.style.animationDelay = `${index * 60}ms`;
    });
});

/**
 * Creates the main container for a tree and initiates rendering.
 */
function createTreeContainer(rootNode, activeUrl) {
    const treeContainer = document.createElement('div');
    treeContainer.className = 'tree';
    const rootUl = document.createElement('ul');
    rootUl.appendChild(renderNode(rootNode, activeUrl)); // Start the recursive rendering
    treeContainer.appendChild(rootUl);
    return treeContainer;
}

/**
 * Recursively renders a single node and its children.
 * @returns {HTMLLIElement} - A list item element representing the node.
 */
function renderNode(node, activeUrl) {
    const li = document.createElement('li');
    li.className = 'tree-node'; // Add class for animation targeting

    const link = document.createElement('a');
    link.href = node.url;
    link.title = node.url;
    if (node.url === activeUrl) {
        link.classList.add('active-node');
    }

    const favicon = document.createElement('img');
    favicon.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(node.url)}&size=16`;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'node-title';
    titleSpan.textContent = node.title;

    link.append(favicon, titleSpan);
    link.onclick = (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: node.url, active: true });
        window.close();
    };

    li.appendChild(link);

    if (node.children && node.children.length > 0) {
        const childrenUl = document.createElement('ul');
        node.children.forEach(child => {
            childrenUl.appendChild(renderNode(child, activeUrl)); // Recursive call
        });
        li.appendChild(childrenUl);
    }
    
    return li;
}