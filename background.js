let editModeActive = false;
let windowId = null;

chrome.action.setBadgeBackgroundColor({ color: "#007bff" });

// Inject content script when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  injectContentScriptToAllTabs();
});

// Inject when a new tab is created
chrome.tabs.onCreated.addListener(tab => {
  if (tab.url?.startsWith("http")) {
    injectContentScript(tab.id);
  }
});

// Re-inject when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.startsWith("http")) {
    injectContentScript(tabId);
  }
});

function injectContentScript(tabId) {
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    })
    .catch(console.error);
}

function injectContentScriptToAllTabs() {
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, tabs => {
    for (const tab of tabs) {
      injectContentScript(tab.id);
    }
  });
}

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 400,
    height: 600,
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_EDIT_MODE") {
    editModeActive = !editModeActive;
    chrome.action.setBadgeText({ text: editModeActive ? "ON" : "" });

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "EDIT_MODE_CHANGED",
            isActive: editModeActive,
          })
          .catch(console.error);
      }
    });
  } else if (message.type === "ELEMENT_SELECTED") {
    // Forward to popup
    chrome.runtime.sendMessage(message).catch(console.error);
  }
  return true;
});

// Track window creation and removal
chrome.windows.onCreated.addListener(window => {
  if (window.type === "popup") {
    windowId = window.id;
  }
});

chrome.windows.onRemoved.addListener(removedWindowId => {
  if (removedWindowId === windowId) {
    windowId = null;
    editModeActive = false;
    chrome.action.setBadgeText({ text: "" });
  }
});

// Reset state when tab changes
chrome.tabs.onActivated.addListener(() => {
  editModeActive = false;
  chrome.action.setBadgeText({ text: "" });
});
