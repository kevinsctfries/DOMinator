let windowId = null;
let originalTabId = null; // Add this to store the source tab ID

chrome.action.setBadgeBackgroundColor({ color: "#007bff" });

// Handle extension icon click
chrome.action.onClicked.addListener(async tab => {
  // Store the original tab ID
  originalTabId = tab.id;
  console.log("Storing original tab ID:", originalTabId);

  chrome.windows.create(
    {
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 600,
    },
    window => {
      windowId = window.id;
    }
  );
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
    chrome.action.setBadgeText({ text: "" });
  }
});

// Forward element selection messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ELEMENT_SELECTED") {
    chrome.runtime.sendMessage(message).catch(console.error);
  }
  if (message.type === "GET_ORIGINAL_TAB") {
    sendResponse({ tabId: originalTabId });
    return true;
  }
  return true;
});
