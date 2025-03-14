let editModeActive = false;

chrome.action.setBadgeBackgroundColor({ color: "#007bff" });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_EDIT_MODE") {
    editModeActive = !editModeActive;
    chrome.action.setBadgeText({ text: editModeActive ? "ON" : "" });
    // Broadcast to all tabs
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "EDIT_MODE_CHANGED",
            isActive: editModeActive,
          })
          .catch(() => {});
      });
    });
  }
});

// Reset state when tab changes
chrome.tabs.onActivated.addListener(() => {
  editModeActive = false;
  chrome.action.setBadgeText({ text: "" });
});
