let editModeActive = false;

chrome.action.setBadgeBackgroundColor({ color: "#007bff" });

// Inject content script when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (tab.url.startsWith("http")) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          })
          .catch(() => {});
      }
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_EDIT_MODE") {
    editModeActive = !editModeActive;
    chrome.action.setBadgeText({ text: editModeActive ? "ON" : "" });

    // Send to specific active tab instead of all tabs
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "EDIT_MODE_CHANGED",
            isActive: editModeActive,
          })
          .catch(() => {});
      }
    });
  }

  if (message.type === "ELEMENT_SELECTED") {
    // Forward the selected element data to the popup
    chrome.runtime.sendMessage(message).catch(() => {});
  }
});

// Reset state when tab changes
chrome.tabs.onActivated.addListener(() => {
  editModeActive = false;
  chrome.action.setBadgeText({ text: "" });
});
